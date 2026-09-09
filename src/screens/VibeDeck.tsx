import { useEffect, useState } from "react";
import { ArrowRight, Heart, X } from "lucide-react";
import { copy, t, interestPhrase, interests, questionNumber, vibeCards } from "../content";
import type { InterestId, VibeCard } from "../content/types";
import { computeInterest } from "../lib/matching";
import { BEHIND_OFFSET, useSwipeDeck } from "../lib/useSwipeDeck";
import {
  trackDiscoverAll,
  trackQuestionAnswered,
  trackQuestionView,
} from "../lib/analytics";
import { HeartBurst } from "../components/HeartBurst";
import { useHeartBurst } from "../lib/useHeartBurst";
import { VibeCardView } from "../components/Cards";
import { TileGrid } from "../components/Tiles";
import { INTEREST_STYLE } from "../components/icons";

/**
 * The vibe check. Rather than asking "what area interests you" directly, the
 * interest is inferred from a short run of scenario cards swiped like Tinder.
 * That front-loads the swipe mechanic so it is familiar muscle memory by the
 * time the results deck arrives, and makes the eventual match read as
 * calculated from many small signals rather than one dropdown pick.
 */
export function VibeDeck({ onComplete }: { onComplete: (interest: InterestId) => void }) {
  const [liked, setLiked] = useState<VibeCard[]>([]);
  const [finished, setFinished] = useState(false);
  const { bursts, glows, fire } = useHeartBurst();

  const { index, offset, rotation, dragHandlers, commit, done } = useSwipeDeck<VibeCard>({
    items: vibeCards,
    onSwipe: (card, direction) => {
      trackQuestionAnswered(card.id, direction === "right" ? "yes" : "no");
      if (direction === "right") {
        setLiked((prev) => [...prev, card]);
        fire();
        navigator.vibrate?.(8);
      }
    },
    onExhausted: () => setFinished(true),
  });

  const current = vibeCards[index];

  useEffect(() => {
    if (current) trackQuestionView(current.id, questionNumber(current.id));
    // Fires once per card as it becomes the top of the stack. `current` comes
    // out of a module-level array, so its identity is stable per index.
  }, [current]);

  if (finished || done) {
    return <VibeResult liked={liked} onComplete={onComplete} />;
  }

  return (
    <div className="screen" style={{ padding: "18px 20px" }}>
      <div style={{ marginBottom: 16, flexShrink: 0 }}>
        <div className="eyebrow">
          {index + 1} of {vibeCards.length}
        </div>
        <h2 className="h2">{copy.vibe.headline}</h2>
        <p className="sub">{copy.vibe.sub}</p>
      </div>

      <div className="deck">
        <HeartBurst bursts={bursts} glows={glows} />
        {vibeCards.map((card, i) => {
          if (i < index || i > index + 1) return null;
          const isTop = i === index;
          return (
            <VibeCardView
              key={card.id}
              card={card}
              isTop={isTop}
              offset={isTop ? offset : BEHIND_OFFSET}
              rotation={isTop ? rotation : 0}
              dragHandlers={dragHandlers}
            />
          );
        })}
      </div>

      <p className="visually-hidden" aria-live="polite">
        {current?.text}
      </p>

      <div className="deck-actions">
        <button
          className="btn-circle btn-circle--skip"
          onClick={() => commit("left")}
          aria-label={`Not for me: ${current?.text ?? ""}`}
        >
          <X size={24} />
        </button>
        <button
          className="btn-circle btn-circle--save"
          onClick={() => commit("right")}
          aria-label={`Into it: ${current?.text ?? ""}`}
        >
          <Heart size={24} fill="#fff" />
        </button>
      </div>
    </div>
  );
}

/**
 * Resolves the deck into an interest. If scoring is inconclusive (nothing
 * swiped right) this falls back to a direct tap pick rather than leaving the
 * person stuck with no route forward.
 */
function VibeResult({
  liked,
  onComplete,
}: {
  liked: VibeCard[];
  onComplete: (interest: InterestId) => void;
}) {
  const computed = computeInterest(liked);
  const [justPicked, setJustPicked] = useState<string | null>(null);

  useEffect(() => {
    if (!computed) {
      trackQuestionView("interest-fallback", questionNumber("interest-fallback"));
    }
  }, [computed]);

  if (computed) {
    const style = INTEREST_STYLE[computed];
    const Icon = style.icon;
    const phrase = interestPhrase(computed) ?? "";

    return (
      <div className="panel fade-in">
        <div
          className="panel__icon"
          style={{ background: `color-mix(in srgb, ${style.color} 12%, #fff)` }}
        >
          <Icon size={26} color={style.color} />
        </div>
        <h2 className="h3">
          {t(copy.vibe.resultHeadline, { interest: phrase })}
        </h2>
        <p className="sub" style={{ maxWidth: 280 }}>
          {copy.vibe.resultBody}
        </p>
        <button
          className="btn btn--primary"
          style={{ maxWidth: 280, marginTop: 4 }}
          onClick={() => onComplete(computed)}
        >
          {copy.vibe.resultCta} <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  const handle = (id: string) => {
    setJustPicked(id);
    trackQuestionAnswered("interest-fallback", id);
    window.setTimeout(() => onComplete(id as InterestId), 320);
  };

  return (
    <div className="screen screen--pad fade-in">
      <h2 className="h3" style={{ textAlign: "center" }}>
        {copy.vibe.fallbackHeadline}
      </h2>
      <p className="sub" style={{ textAlign: "center", marginTop: 6, marginBottom: 16 }}>
        {copy.vibe.fallbackSub}
      </p>
      <TileGrid
        options={interests.map((i) => ({
          id: i.id,
          label: i.label,
          icon: INTEREST_STYLE[i.id].icon,
          color: INTEREST_STYLE[i.id].color,
        }))}
        value={null}
        justPicked={justPicked}
        onSelect={handle}
      />

      {/* A way out for someone who doesn't want to pick a category at all. */}
      <a
        className="btn btn--primary"
        style={{ marginTop: 20 }}
        href={copy.vibe.fallbackCtaUrl}
        target="_blank"
        rel="noreferrer"
        onClick={() => trackDiscoverAll("interest-fallback")}
      >
        {copy.vibe.fallbackCta}
      </a>
    </div>
  );
}
