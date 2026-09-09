import { useEffect, useRef, useState } from "react";
import { copy } from "../content";

const DURATION_MS = 1200;
const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function Calculating({ onDone }: { onDone: () => void }) {
  const [pct, setPct] = useState(0);
  const doneRef = useRef(onDone);

  // Kept in a ref so the progress loop below never restarts just because the
  // parent re-rendered with a new callback identity. Assigned in an effect
  // rather than during render, which is not a safe place to touch a ref.
  useEffect(() => {
    doneRef.current = onDone;
  });

  useEffect(() => {
    const start = Date.now();
    let raf = 0;
    let timeout = 0;

    const tick = () => {
      const p = Math.min(100, Math.round(((Date.now() - start) / DURATION_MS) * 100));
      setPct(p);
      if (p < 100) raf = requestAnimationFrame(tick);
      else timeout = window.setTimeout(() => doneRef.current(), 200);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="panel" style={{ gap: 22 }}>
      <div className="ring">
        <svg width="100" height="100" aria-hidden="true">
          <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="var(--border)" strokeWidth="7" />
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke="var(--pink)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - pct / 100)}
            style={{ transition: "stroke-dashoffset 0.1s linear" }}
          />
        </svg>
        <div className="ring__pct">{pct}%</div>
      </div>
      <p
        className="h3"
        style={{ fontWeight: 600, fontSize: 15, padding: "0 20px" }}
        aria-live="polite"
      >
        {copy.calculating.message}
      </p>
    </div>
  );
}
