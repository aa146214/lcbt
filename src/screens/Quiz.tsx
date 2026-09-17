import { useEffect, useState } from "react";
import { questionById, questionNumber } from "../content";
import type { Answers, StepKey } from "../content/types";
import { TileGrid, TileList } from "../components/Tiles";
import { trackQuestionAnswered, trackQuestionView } from "../lib/analytics";

const ACCENT: Record<StepKey, string> = {
  age: "var(--pink)",
  goal: "var(--pink)",
  priorQual: "var(--gold)",
  level: "var(--plum)",
  subject: "var(--plum)",
};

export function Quiz({
  answers,
  stepKey,
  stepIndex,
  totalSteps,
  onAnswer,
}: {
  answers: Answers;
  stepKey: StepKey;
  stepIndex: number;
  totalSteps: number;
  onAnswer: (step: StepKey, value: string) => void;
}) {
  const question = questionById(stepKey);
  const [justPicked, setJustPicked] = useState<string | null>(null);

  useEffect(() => {
    trackQuestionView(stepKey, questionNumber(stepKey));
  }, [stepKey]);

  if (!question) return null;

  /* Selection gets a visible confirm state — border fills, checkmark appears,
     brief pause — before advancing, so the tap reads as registered rather
     than an instant jump-cut. */
  const handle = (value: string) => {
    if (justPicked) return;
    setJustPicked(value);
    trackQuestionAnswered(stepKey, value);
    navigator.vibrate?.(8);
    window.setTimeout(() => onAnswer(stepKey, value), 380);
  };

  const Options = question.layout === "grid" ? TileGrid : TileList;

  return (
    <div className="screen screen--pad screen--scroll">
      <div className="eyebrow">
        Question {stepIndex + 1} of {totalSteps}
        {question.reassurance && (
          <span
            style={{
              color: "var(--text-dim)",
              fontWeight: 500,
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            {" "}
            · {question.reassurance}
          </span>
        )}
      </div>

      <h2 className="h2" style={{ fontSize: 21 }}>
        {question.question}
      </h2>
      {question.sub && <p className="sub">{question.sub}</p>}

      <div style={{ marginTop: 14 }}>
        <Options
          options={question.options}
          value={(answers[stepKey] as string | undefined) ?? null}
          justPicked={justPicked}
          onSelect={handle}
          color={ACCENT[stepKey]}
        />
      </div>
    </div>
  );
}
