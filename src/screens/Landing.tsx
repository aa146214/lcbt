import { ArrowRight } from "lucide-react";
import { copy } from "../content";

export function Landing({ onStart }: { onStart: () => void }) {
  const c = copy.landing;

  return (
    <div className="screen landing">

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
