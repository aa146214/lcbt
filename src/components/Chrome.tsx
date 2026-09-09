import { ArrowLeft } from "lucide-react";
import { copy, interestLabel, questionById } from "../content";
import type { Answers, StepKey } from "../content/types";

export function TopBar({ onBack }: { onBack?: () => void }) {
  return (
    <header className="topbar">
      {onBack ? (
        <button className="topbar__back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={16} />
        </button>
      ) : (
        <div className="topbar__spacer" />
      )}
      <div className="topbar__title">{copy.topBarTitle}</div>
      <div className="topbar__spacer" />
    </header>
  );
}

export function ProgressBar({ total, current }: { total: number; current: number }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-label={`Question ${Math.min(current + 1, total)} of ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`progress__seg${i < current ? " progress__seg--on" : ""}`} />
      ))}
    </div>
  );
}

/**
 * Small chips that appear as each question is answered, so the person sees a
 * profile assembling rather than an abstract fill bar.
 */
export function ProfileStrip({ answers, steps }: { answers: Answers; steps: StepKey[] }) {
  const labels: string[] = [];

  if (answers.interest) {
    const label = interestLabel(answers.interest);
    if (label) labels.push(label);
  }

  for (const step of steps) {
    const value = answers[step];
    if (!value) continue;
    labels.push(chipLabel(step, value));
  }

  if (labels.length === 0) return <div className="chips" />;

  return (
    <div className="chips">
      {labels.map((label) => (
        <span className="chip" key={label}>
          {label}
        </span>
      ))}
    </div>
  );
}

function chipLabel(step: StepKey, value: string): string {
  if (step === "age") return value;
  if (step === "priorQual") return value === "yes" ? "Qualified" : "New starter";
  if (step === "level") return value === "notsure" ? "Not sure" : value;

  // goal — shortened to the first couple of words so the chip stays a chip.
  const option = questionById(step)?.options.find((o) => o.id === value);
  return option ? option.label.split(" ").slice(0, 2).join(" ") : value;
}
