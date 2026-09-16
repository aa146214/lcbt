import { useMemo, useState } from "react";
import { ArrowRight, Heart, X } from "lucide-react";
import { copy, t } from "../content";
import type { Answers, Course, MatchResult } from "../content/types";
import { medalFor } from "../lib/matching";
import { buildReasoning } from "../lib/reasoning";
import { BEHIND_OFFSET, useSwipeDeck } from "../lib/useSwipeDeck";
import { trackCourseSwipe, trackDiscoverAll } from "../lib/analytics";
import { HeartBurst } from "../components/HeartBurst";
import { useHeartBurst } from "../lib/useHeartBurst";
import { CourseCard } from "../components/Cards";
import { SwipeHint } from "../components/SwipeHint";

export function Results({
  matches,
  answers,
  onFinish,
}: {
  matches: MatchResult;
  answers: Answers;
  onFinish: (saved: Course[]) => void;
}) {
  const cards = matches.courses;
  const isRegisterInterest = matches.type === "registerInterest";
  const reasoning = useMemo(() => buildReasoning(answers), [answers]);
  const goalClause = answers.goal
    ? (copy.goalClause as Record<string, string>)[answers.goal] ?? null
    : null;

  const [saved, setSaved] = useState<Course[]>([]);
  const [expanded, setExpanded] = useState(false);
  const { bursts, glows, fire } = useHeartBurst();

  const { index, offset, rotation, dragHandlers, commit, done, entering } = useSwipeDeck<Course>({
    items: cards,
    threshold: 110,
    onSwipe: (course, direction) => {
      trackCourseSwipe(course.id, direction === "right" ? "save" : "skip");
      setExpanded(false);
      if (direction === "right") {
        setSaved((prev) => [...prev, course]);
        fire();
        navigator.vibrate?.(8);
      }
    },
    onTap: () => setExpanded((v) => !v),
  });

  const current = cards[index];

  return (
    <div className="screen" style={{ padding: "16px 18px 18px" }}>
      <div style={{ textAlign: "center", marginBottom: 12, flexShrink: 0 }}>
        <h2 className="h3">
          {isRegisterInterest ? copy.results.noMatchHeadline : copy.results.headline}
        </h2>
      </div>

      {!isRegisterInterest && !done && (
        <SwipeHint
          left={copy.results.hintLeft}
          leftSub={copy.results.hintLeftSub}
          right={copy.results.hintRight}
          rightSub={copy.results.hintRightSub}
        />
      )}

      <div className="deck">
        <HeartBurst bursts={bursts} glows={glows} />
        {done ? (
          <FinishedPanel
            saved={saved}
            isRegisterInterest={isRegisterInterest}
            onFinish={() => onFinish(saved)}
          />
        ) : (
          cards.map((course, i) => {
            if (i < index || i > index + 1) return null;
            const isTop = i === index;
            return (
              <CourseCard
                key={course.id}
                course={course}
                medal={medalFor(i)}
                isTop={isTop}
                offset={isTop ? offset : BEHIND_OFFSET}
                rotation={isTop ? rotation : 0}
                expanded={isTop && expanded}
                onExpandToggle={() => setExpanded((v) => !v)}
                dragHandlers={dragHandlers}
                reasoning={reasoning}
                goalClause={goalClause}
                age={answers.age}
                entering={isTop && entering}
              />
            );
          })
        )}
      </div>

      {!done && (
        <div className="deck-actions">
          <button
            className="btn-circle btn-circle--skip"
            onClick={() => commit("left")}
            aria-label={`Skip ${current?.title ?? ""}`}
          >
            <X size={24} />
          </button>
          <button
            className="btn-circle btn-circle--save"
            onClick={() => commit("right")}
            aria-label={`Save ${current?.title ?? ""}`}
          >
            <Heart size={24} fill="#fff" />
          </button>
        </div>
      )}
    </div>
  );
}

function FinishedPanel({
  saved,
  isRegisterInterest,
  onFinish,
}: {
  saved: Course[];
  isRegisterInterest: boolean;
  onFinish: () => void;
}) {
  const empty = saved.length === 0 && !isRegisterInterest;

  return (
    <div className="panel panel--in-deck fade-in">
      <div
        className="panel__icon"
        style={{ background: "#fff", border: "1.5px solid var(--border)", width: 58, height: 58 }}
      >
        <Heart size={24} color="var(--pink)" fill={empty ? "none" : "var(--pink)"} />
      </div>
      <h3 className="h3">
        {empty ? copy.results.emptyHeadline : copy.results.successHeadline}
      </h3>
      <p className="sub">
        {empty
          ? copy.results.emptyBody
          : t(copy.results.successBody, {
              n: saved.length,
              s: saved.length === 1 ? "" : "s",
            })}
      </p>
      <button className="btn btn--primary" style={{ marginTop: 6 }} onClick={onFinish}>
        {copy.results.continueCta} <ArrowRight size={16} />
      </button>

      {/* Browsing everything is a route out of the deck, not a card inside it.
          Continue above still leads to email capture either way. */}
      <a
        className="btn--plain"
        href={copy.results.discoverUrl}
        target="_blank"
        rel="noreferrer"
        onClick={() => trackDiscoverAll("results")}
      >
        {copy.results.discoverCta}
      </a>
    </div>
  );
}
