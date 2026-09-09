import { ArrowRight } from "lucide-react";
import { copy } from "../content";

export function Landing({ onStart }: { onStart: () => void }) {
  const c = copy.landing;

  return (
    <div className="screen landing">
      {/* Flat decorative shapes — no gradients, per the brand system. */}
      <div className="landing__blob landing__blob--1" aria-hidden="true" />
      <div className="landing__blob landing__blob--2" aria-hidden="true" />

      {/* Stickers pinned inside the padding band itself, so they sit in space
          no normal-flow content ever reaches regardless of headline length. */}
      <span className="landing__sticker" style={{ top: 6, right: 6, fontSize: 26, transform: "rotate(-12deg)" }} aria-hidden="true">⭐</span>
      <span className="landing__sticker" style={{ bottom: 6, right: 6, fontSize: 20, transform: "rotate(10deg)" }} aria-hidden="true">💗</span>
      <span className="landing__sticker" style={{ bottom: 6, left: 6, fontSize: 24, transform: "rotate(-8deg)" }} aria-hidden="true">💄</span>

      <div style={{ position: "relative" }}>
        <div className="landing__badge">{c.eyebrow}</div>
        <h1 className="h1">
          {c.headlineBefore}
          <span className="accent">{c.headlineHighlight}</span>
          {c.headlineAfter}
        </h1>
      </div>

      <div className="landing__steps">
        {c.steps.map((step) => (
          <div className="landing__step" key={step.text}>
            <div className="landing__step-emoji" aria-hidden="true">
              {step.emoji}
            </div>
            <span className="landing__step-text">{step.text}</span>
          </div>
        ))}
      </div>

      <div style={{ position: "relative" }}>
        <button className="btn btn--primary btn--lg" onClick={onStart}>
          {c.cta} <ArrowRight size={18} />
        </button>
        <div className="small-print">{c.microCopy}</div>
      </div>
    </div>
  );
}
