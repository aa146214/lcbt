import { ChevronDown, Medal, Sparkles } from "lucide-react";
import { copy } from "../content";
import type { AgeId, Course, VibeCard } from "../content/types";
import { CATEGORY_STYLE } from "./icons";
import { fundingFor } from "../lib/matching";
import type { Medal as MedalRank } from "../lib/matching";
import type { DeckOffset } from "../lib/useSwipeDeck";

/** Shared positioning for any card in a stack. */
function cardStyle(offset: DeckOffset, rotation: number): React.CSSProperties {
  return {
    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`,
    /* Only an exit sets its own duration, because only an exit varies: it is
       scaled to how far the card still has to travel. The shadow rides along
       on the same timing, which is moot for a card that is leaving. */
    ...(offset.flying && offset.flyMs ? { transitionDuration: `${offset.flyMs}ms` } : {}),
  };
}

/**
 * The transition lives on a class rather than the inline style so it also
 * covers the shadow swap as a card is promoted from behind to top. While a
 * finger is down there is no transition at all, so the card tracks 1:1.
 */
function cardClass(
  offset: DeckOffset,
  isTop: boolean,
  extra?: string,
  entering?: boolean,
) {
  return [
    "card",
    extra,
    isTop ? "card--top" : "card--behind",
    offset.animating ? "card--animating" : "",
    offset.flying ? "card--flying" : "",
    isTop && entering ? "card--entering" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function Stamps({
  offset,
  right,
  left,
}: {
  offset: DeckOffset;
  right: string;
  left: string;
}) {
  return (
    <>
      {offset.x > 40 && (
        <div className="stamp stamp--right" style={{ opacity: Math.min(1, offset.x / 100) }}>
          {right}
        </div>
      )}
      {offset.x < -40 && (
        <div className="stamp stamp--left" style={{ opacity: Math.min(1, -offset.x / 100) }}>
          {left}
        </div>
      )}
    </>
  );
}

/* --------------------------------------------------------- */

export function VibeCardView({
  card,
  isTop,
  offset,
  rotation,
  dragHandlers,
  entering,
  coach,
  coachText,
}: {
  card: VibeCard;
  isTop: boolean;
  offset: DeckOffset;
  rotation: number;
  dragHandlers: Record<string, unknown>;
  entering?: boolean;
  coach?: "in" | "out" | null;
  coachText?: string;
}) {
  return (
    <article
      className={cardClass(offset, isTop, "card--photo", entering)}
      style={cardStyle(offset, rotation)}
      {...(isTop ? dragHandlers : {})}
    >
      {isTop && (
        <Stamps offset={offset} right={copy.vibe.stampRight} left={copy.vibe.stampLeft} />
      )}
      <img className="vibe-card__img" src={card.image} alt="" draggable={false} />
      <div className="vibe-card__plate">
        <h3 className="vibe-card__text">{card.text}</h3>
      </div>
      {isTop && coach && coachText && (
        <div className="card-coach" data-state={coach} aria-hidden="true">
          <span>{coachText}</span>
        </div>
      )}
    </article>
  );
}

/* --------------------------------------------------------- */

function DetailRow({
  label,
  value,
  stacked,
}: {
  label: string;
  value: string;
  stacked?: boolean;
}) {
  return (
    <div className={`detail-row${stacked ? " detail-row--stacked" : ""}`}>
      <span className="detail-row__label">{label}</span>
      <span className="detail-row__value">{value}</span>
    </div>
  );
}

export function CourseCard({
  course,
  medal,
  isTop,
  offset,
  rotation,
  expanded,
  onExpandToggle,
  dragHandlers,
  reasoning,
  goalClause,
  age,
  entering,
}: {
  course: Course;
  medal: MedalRank | null;
  isTop: boolean;
  offset: DeckOffset;
  rotation: number;
  expanded: boolean;
  onExpandToggle: () => void;
  dragHandlers: Record<string, unknown>;
  reasoning: string | null;
  goalClause: string | null;
  age?: AgeId;
  entering?: boolean;
}) {
  const cat = CATEGORY_STYLE[course.category] ?? CATEGORY_STYLE.beauty;
  const Icon = cat.icon;
  const isRegisterInterest = course.kind === "register-interest";
  // A "see all" card is a route onwards, not a match, so it carries neither a
  // percentage nor a "matched you because" line.
  const isRealCourse = course.kind === "course";
  const levelNote = (copy.results.levelNotes as Record<string, string>)[course.level];

  return (
    <article
      className={cardClass(offset, isTop, undefined, entering)}
      style={cardStyle(offset, rotation)}
      {...(isTop ? dragHandlers : {})}
    >
      {isTop && (
        <Stamps offset={offset} right={copy.results.stampRight} left={copy.results.stampLeft} />
      )}

      <div
        className={[
          "course-card__head",
          expanded ? "course-card__head--compact" : "",
          course.image ? "course-card__head--photo" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ background: cat.color }}
      >
        {/* The artwork carries the subject name burnt into the top of the
            frame, so it anchors to the top of the crop (see the CSS) and
            replaces the icon rather than sitting under it. */}
        {course.image ? (
          <img className="course-card__img" src={course.image} alt="" draggable={false} />
        ) : (
          <div className="course-card__mark">
            <Icon size={38} color="#fff" />
          </div>
        )}
        {isRealCourse && medal && (
          <div className="course-card__match" data-medal={medal}>
            <Medal size={13} />
            {copy.results.medals[medal]}
          </div>
        )}
        <div className="course-card__level">{course.level}</div>
      </div>

      <div className="course-card__body">
        <h3 className="h3">{course.title}</h3>
        <p className="sub" style={{ marginTop: 8 }}>
          {course.blurb}
          {!isRegisterInterest && goalClause ? ` ${goalClause}` : ""}
        </p>

        {/* Keyed by level so the caveat travels with the content, not a
            hardcoded rule. Level 3 needs a Level 2 behind it; the full
            subject-specific wording is in the entry requirements below. */}
        {isRealCourse && levelNote && <p className="course-card__note">{levelNote}</p>}

        {isRealCourse && reasoning && (
          <div className="course-card__reason">
            <Sparkles size={12} color="var(--pink)" style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              <strong>{copy.results.reasoningPrefix}</strong> because {reasoning}
            </span>
          </div>
        )}

        {expanded && !isRegisterInterest && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Entry requirements lead, because the sheet added them so people
                can check whether they actually qualify (logic!F33, "will then
                see pre reqs per course"). Burying them under the other two
                would defeat the point. */}
            <DetailRow
              label={copy.results.labelEntry}
              value={course.entryRequirements}
              stacked
            />
            <DetailRow label={copy.results.labelDuration} value={course.duration} />
            <DetailRow label={copy.results.labelFunding} value={fundingFor(course, age)} />
          </div>
        )}

        {!isRegisterInterest && (
          <div style={{ marginTop: "auto", display: "flex", justifyContent: "center", paddingTop: 10 }}>
            <button
              className="btn--plain"
              onClick={(e) => {
                e.stopPropagation();
                onExpandToggle();
              }}
              aria-expanded={expanded}
            >
              {expanded ? copy.results.detailsClose : copy.results.detailsOpen}
              <ChevronDown
                size={14}
                style={{
                  transform: expanded ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s",
                }}
              />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
