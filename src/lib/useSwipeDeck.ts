import { useCallback, useRef, useState } from "react";

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

/** How far below the top card the next one peeks out. */
export const BEHIND_OFFSET: DeckOffset = { x: 0, y: 8, animating: false };

/** How long the swiped card takes to clear the screen. */
const FLY_MS = 300;
/** How long the card behind takes to settle into the top slot. */
const PROMOTE_MS = 340;

/** Movement before we decide whether a gesture is a swipe or a scroll. */
const AXIS_SLOP = 8;

interface Options<T> {
  items: T[];
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
  threshold = 100,
  tapSlop = 6,
  onSwipe,
  onTap,
  onExhausted,
}: Options<T>) {
  const [index, setIndex] = useState(0);
  const [offset, setOffset] = useState<DeckOffset>(REST);
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
      busy.current = true;
      const flyX = direction === "right" ? 600 : -600;
      setOffsetBoth({ x: flyX, y: offsetRef.current.y - 40, animating: true });
      onSwipe?.(items[index], direction, index);
      window.setTimeout(() => {
        // The card behind is sitting BEHIND_OFFSET.y lower. Promoting it with
        // the transition still switched on lets it ease up into the top slot
        // rather than snapping there, so the stack visibly settles after each
        // swipe instead of jump-cutting.
        setOffsetBoth({ x: 0, y: 0, animating: true });
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
      }, FLY_MS);
    },
    [index, items, onSwipe, onExhausted],
  );

  const dragHandlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (busy.current) return;
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
    setOffsetBoth(REST);
    busy.current = false;
  }, []);

  return { index, offset, rotation, dragHandlers, commit, done, reset };
}
