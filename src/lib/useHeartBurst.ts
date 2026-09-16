import { useCallback, useRef, useState } from "react";

export interface Burst {
  id: string;
  x: number;
  delay: number;
  size: number;
  rotate: number;
}

/**
 * The confetti moment on a right-swipe. Kept as a hook + component pair so
 * both decks share one implementation and one set of timers.
 */
export function useHeartBurst() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [glows, setGlows] = useState<string[]>([]);
  const timers = useRef<number[]>([]);

  const fire = useCallback(() => {
    const stamp = Date.now();
    const glowId = `${stamp}-glow`;
    setGlows((prev) => [...prev, glowId]);
    timers.current.push(
      window.setTimeout(() => setGlows((prev) => prev.filter((g) => g !== glowId)), 780),
    );

    const next: Burst[] = Array.from({ length: 6 }).map((_, i) => ({
      id: `${stamp}-${i}`,
      x: 30 + Math.random() * 40,
      delay: i * 40,
      size: 26 + Math.random() * 20,
      rotate: -20 + Math.random() * 40,
    }));
    setBursts((prev) => [...prev, ...next]);
    timers.current.push(
      window.setTimeout(() => {
        const ids = new Set(next.map((b) => b.id));
        setBursts((prev) => prev.filter((b) => !ids.has(b.id)));
      }, 1000),
    );
  }, []);

  return { bursts, glows, fire };
}
