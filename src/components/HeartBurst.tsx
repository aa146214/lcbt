import { Heart } from "lucide-react";
import type { Burst } from "../lib/useHeartBurst";

/** The confetti moment on a right-swipe. Driven by useHeartBurst. */
export function HeartBurst({ bursts, glows }: { bursts: Burst[]; glows: string[] }) {
  return (
    <div className="burst" aria-hidden="true">
      {glows.map((id) => (
        <div key={id} className="burst__glow" />
      ))}
      {bursts.map((b) => (
        <Heart
          key={b.id}
          size={b.size}
          color="var(--pink)"
          fill="var(--pink)"
          strokeWidth={1.5}
          stroke="#fff"
          className="burst__heart"
          style={
            {
              left: `${b.x}%`,
              animationDelay: `${b.delay}ms`,
              "--r": `${b.rotate}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
