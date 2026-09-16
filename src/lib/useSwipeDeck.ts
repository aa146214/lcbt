import { useCallback, useEffect, useRef, useState } from "react";

export type SwipeDirection = "right" | "left";

export interface DeckOffset {
  x: number;
  y: number;
  animating: boolean;
}

const REST: DeckOffset = { x: 0, y: 0, animating: false };

/**
 * Pointer capture is best-effort: it throws when the id is not an active
 * pointer, and that must never take the surrounding gesture down with it.
 */
function capture(e: React.PointerEvent, mode: "set" | "release") {
  const el = e.currentTarget as HTMLElement;
  try {
    if (mode === "set") el.setPointerCapture?.(e.pointerId);
    else el.releasePointerCapture?.(e.pointerId);
  } catch {
    // No capture — dragging still works, it just stops if the pointer leaves.
  }
}

/** How far below the top card the next one peeks out. It is blurred, so the
 *  strip reads as a card underneath rather than as legible duplicate text. */
export const BEHIND_OFFSET: DeckOffset = { x: 0, y: 8, animating: false };

/** How long a liked card takes to clear the screen. */
const FLY_MS = 300;
/** A skip has no burst to wait for, so it gets out of the way faster. */
const FLY_MS_SKIP = 170;
/** How long the card behind takes to settle into the top slot. */
const PROMOTE_MS = 340;

/** Movement before we decide whether a gesture is a swipe or a scroll. */
const AXIS_SLOP = 8;

/** How long the incoming card stays hidden after a like, so the hearts land
 *  on the card that earned them rather than the next one. */
const REVEAL_DELAY_MS = 420;

/**
 * The first card demonstrates the gesture: a nudge right far enough to show
 * the "yes" stamp, back to centre, a nudge left for the "no" stamp, back
 * again. Teaching by doing, rather than adding more instructions to read.
 *
 * Each step is [x offset, ms to hold it]. It is cancelled the moment the
 * person touches the card — they clearly don't need it.
 */
const HINT_STEPS: [number, number][] = [
  [0, 750],
  [78, 620],
  [0, 340],
  [-78, 620],
  [0, 0],
];

interface Options<T> {
  items: T[];
  /** Play the one-off gesture demo on the very first card. */
  hint?: boolean;
  /** Distance in px past which releasing commits the swipe. */
  threshold?: number;
  /** Movement below this (px, total) counts as a tap rather than a drag. */
  tapSlop?: number;
  onSwipe?: (item: T, direction: SwipeDirection, index: number) => void;
  onTap?: (item: T, index: number) => void;
  onExhausted?: () => void;
}

/**
 * Drives a Tinder-style card stack: pointer dragging with rotation, threshold
 * commit, and programmatic swipes from the action buttons and keyboard.
 *
 * Pointer capture is set on the card so a drag that travels off the card (or
 * off the viewport edge, which is common on a phone) still resolves on
 * release instead of leaving the card stranded mid-drag.
 */
export function useSwipeDeck<T>({
  items,
  hint = false,
  threshold = 100,
  tapSlop = 6,
  onSwipe,
  onTap,
  onExhausted,
}: Options<T>) {
  const [index, setIndex] = useState(0);
  const [entering, setEntering] = useState(false);
  const [offset, setOffset] = useState<DeckOffset>(REST);
  /** Set once the person touches the deck — they don't need the demo. */
  const hintCancelled = useRef(false);
  const cancelHint = () => {
    hintCancelled.current = true;
  };
  const drag = useRef<{
    startX: number;
    startY: number;
    dragging: boolean;
    moved: number;
    axis: "x" | "y" | null;
  }>({ startX: 0, startY: 0, dragging: false, moved: 0, axis: null });
  const offsetRef = useRef<DeckOffset>(REST);
  const busy = useRef(false);

  const setOffsetBoth = (next: DeckOffset) => {
    offsetRef.current = next;
    setOffset(next);
  };

  const done = index >= items.length;

  const commit = useCallback(
    (direction: SwipeDirection) => {
      if (busy.current || index >= items.length) return;
      cancelHint();
      busy.current = true;
      const flyX = direction === "right" ? 600 : -600;
      setOffsetBoth({ x: flyX, y: offsetRef.current.y - 40, animating: true });
      onSwipe?.(items[index], direction, index);
      const flyMs = direction === "right" ? FLY_MS : FLY_MS_SKIP;
      window.setTimeout(() => {
        // The card behind is sitting BEHIND_OFFSET.y lower. Promoting it with
        // the transition still switched on lets it ease up into the top slot
        // rather than snapping there, so the stack visibly settles after each
        // swipe instead of jump-cutting.
        setOffsetBoth({ x: 0, y: 0, animating: true });
        // Only a like fires the hearts, so only a like needs the pause.
        if (direction === "right") {
          setEntering(true);
          window.setTimeout(() => setEntering(false), REVEAL_DELAY_MS);
        }
        setIndex((i) => {
          const next = i + 1;
          if (next >= items.length) onExhausted?.();
          return next;
        });
        busy.current = false;

        // Drop the transition once it has played, so the next drag tracks the
        // finger from the first pixel. Skipped if another gesture has already
        // taken over in the meantime.
        window.setTimeout(() => {
          if (!drag.current.dragging && !busy.current) setOffsetBoth(REST);
        }, PROMOTE_MS);
      }, flyMs);
    },
    [index, items, onSwipe, onExhausted],
  );

  /* Plays on the first card only. Deliberately has no "already ran" latch:
     React re-invokes effects in development, and a latch set here would make
     the first pass schedule the timers, its cleanup clear them, and the second
     pass do nothing — so the demo never appeared. Cancellation is tracked
     separately, by the person's own touch. */
  useEffect(() => {
    if (!hint || items.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timers: number[] = [];
    let elapsed = 0;
    for (const [x, hold] of HINT_STEPS) {
      timers.push(
        window.setTimeout(() => {
          if (hintCancelled.current || drag.current.dragging || busy.current) return;
          setOffsetBoth({ x, y: 0, animating: true });
        }, elapsed),
      );
      elapsed += hold;
    }
    return () => timers.forEach(window.clearTimeout);
  }, [hint, items.length]);

  const dragHandlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (busy.current) return;
      cancelHint();
      // Capture is deliberately NOT taken here. Grabbing the pointer on touch-
      // down suppresses the browser's own scrolling, and the card body is a
      // scroll container — so we wait until we know the gesture is horizontal
      // and only then claim it.
      drag.current = {
        startX: e.clientX,
        startY: e.clientY,
        dragging: true,
        moved: 0,
        axis: null,
      };
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!drag.current.dragging) return;
      const dx = e.clientX - drag.current.startX;
      const dy = e.clientY - drag.current.startY;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);

      /* Decide once, on the first few pixels, whether this is a swipe or a
         scroll of the details inside the card. Without this the two fight:
         on a touchscreen the browser claims a downward drag for scrolling and
         cancels our pointer mid-swipe, so the card snaps back and the person
         can't get past it. Desktop never showed it because a mouse doesn't go
         through the same arbitration. */
      if (drag.current.axis === null) {
        if (adx + ady < AXIS_SLOP) return;
        drag.current.axis = adx > ady ? "x" : "y";
        if (drag.current.axis === "y") {
          // Theirs. Let go entirely so the card body scrolls normally.
          drag.current.dragging = false;
          setOffsetBoth(REST);
          return;
        }
        capture(e, "set");
      }

      drag.current.moved = adx + ady;
      // Vertical movement is damped rather than followed: the finger is
      // travelling sideways, and letting the card chase dy reintroduces the
      // fight with scrolling.
      setOffsetBoth({ x: dx, y: dy * 0.18, animating: false });
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (!drag.current.dragging) return;
      capture(e, "release");
      drag.current.dragging = false;
      const dx = offsetRef.current.x;

      if (drag.current.axis === null || drag.current.moved < tapSlop) {
        setOffsetBoth({ ...REST, animating: true });
        onTap?.(items[index], index);
        return;
      }
      if (dx > threshold) commit("right");
      else if (dx < -threshold) commit("left");
      else setOffsetBoth({ ...REST, animating: true });
    },
    onPointerCancel: () => {
      drag.current.dragging = false;
      drag.current.axis = null;
      setOffsetBoth({ ...REST, animating: true });
    },
  };

  const rotation = Math.max(-18, Math.min(18, offset.x / 12));

  const reset = useCallback(() => {
    setIndex(0);
    setEntering(false);
    setOffsetBoth(REST);
    busy.current = false;
  }, []);

  return { index, offset, rotation, dragHandlers, commit, done, entering, reset };
}
