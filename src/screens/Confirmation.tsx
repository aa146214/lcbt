import { useState } from "react";
import { Check, Medal, RotateCcw, Share2 } from "lucide-react";
import { copy, t } from "../content";
import type { Course } from "../content/types";
import { medalFor } from "../lib/matching";
import { trackRestart, trackShare } from "../lib/analytics";
import { CATEGORY_STYLE } from "../components/icons";

export function Confirmation({
  saved,
  matched,
  registerInterest,
  onRestart,
}: {
  saved: Course[];
  matched: Course[];
  registerInterest: boolean;
  onRestart: () => void;
}) {
  const [shared, setShared] = useState(false);

  /* Nothing was matched, so there is no card to screenshot and no course page
     to send them to. Confirm the registration and point at the full
     catalogue instead of inventing a match. */
  if (registerInterest) {
    return (
      <div className="screen screen--scroll" style={{ padding: "26px 22px", alignItems: "center" }}>
        <div className="panel__icon" style={{ width: 54, height: 54, marginBottom: 14 }}>
          <Check size={24} color="var(--pink)" />
        </div>
        <h2 className="h2" style={{ fontSize: 19, margin: 0, textAlign: "center" }}>
          {copy.confirmation.registerInterest.headline}
        </h2>
        <p className="sub" style={{ marginTop: 6, textAlign: "center", fontSize: 13 }}>
          {copy.confirmation.registerInterest.sub}
        </p>
        <a
          className="btn btn--primary btn--sm"
          style={{ marginTop: 22 }}
          href={copy.results.discoverUrl}
          target="_blank"
          rel="noreferrer"
        >
          {copy.results.discoverCta}
        </a>
        <button
          className="btn--plain"
          style={{ marginTop: 14 }}
          onClick={() => {
            trackRestart();
            onRestart();
          }}
        >
          <RotateCcw size={13} /> {copy.confirmation.restart}
        </button>
      </div>
    );
  }

  // Their own first pick if they saved one, otherwise the top match — the
  // empty-state copy on the results screen promises exactly this.
  const headline = saved[0] ?? matched[0];
  if (!headline) return null;

  const rank = Math.max(0, matched.findIndex((c) => c.id === headline.id));
  const medal = medalFor(rank);
  const cat = CATEGORY_STYLE[headline.category] ?? CATEGORY_STYLE.beauty;
  const Icon = cat.icon;

  /**
   * Shares the quiz, not the course page. The point of the message is to get
   * the next person to take it; sending them to a course listing skips the
   * thing being recommended.
   */
  const share = async () => {
    const shareData = {
      title: copy.appName,
      text: copy.confirmation.shareText,
      url: window.location.origin,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        trackShare(headline.id, "web-share");
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        setShared(true);
        trackShare(headline.id, "clipboard");
        window.setTimeout(() => setShared(false), 2200);
      }
    } catch {
      // The person dismissed the share sheet — nothing to recover from.
    }
  };

  return (
    <div
      className="screen screen--scroll"
      style={{ padding: "26px 22px", alignItems: "center" }}
    >
      <div className="panel__icon" style={{ width: 54, height: 54, marginBottom: 14 }}>
        <Check size={24} color="var(--pink)" />
      </div>

      <h2 className="h2" style={{ fontSize: 19, margin: 0, textAlign: "center" }}>
        {copy.confirmation.headline}
      </h2>
      <p className="sub" style={{ marginTop: 6, textAlign: "center", fontSize: 13 }}>
        {copy.confirmation.sub}
      </p>

      <div className="share-card">
        <div className="share-card__label">
          {t(copy.confirmation.shareCardHeader, { category: cat.label.toUpperCase() })}
        </div>
        <div className="share-card__mark" style={{ background: cat.color }}>
          <Icon size={22} />
        </div>
        <div className="share-card__title">{headline.title}</div>
        {medal && (
          <div className="share-card__badge" data-medal={medal}>
            <Medal size={12} />
            {copy.results.medals[medal]}
          </div>
        )}
      </div>

      <button className="btn btn--ghost btn--sm" style={{ marginTop: 18 }} onClick={() => void share()}>
        <Share2 size={15} />
        {shared ? copy.confirmation.shareCopied : copy.confirmation.shareCta}
      </button>

      {/* Straight to the course they matched with, not the generic listing. */}
      <a
        className="btn btn--primary btn--sm"
        style={{ marginTop: 10 }}
        href={headline.url}
        target="_blank"
        rel="noreferrer"
      >
        {copy.confirmation.exitCta}
      </a>

      <button
        className="btn--plain"
        style={{ marginTop: 14 }}
        onClick={() => {
          trackRestart();
          onRestart();
        }}
      >
        <RotateCcw size={13} /> {copy.confirmation.restart}
      </button>
    </div>
  );
}
