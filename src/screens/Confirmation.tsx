import { useState } from "react";
import { Check, RotateCcw, Share2, Star } from "lucide-react";
import { copy, t } from "../content";
import type { Course } from "../content/types";
import { matchScore } from "../lib/matching";
import { trackRestart, trackShare } from "../lib/analytics";
import { CATEGORY_STYLE } from "../components/icons";

export function Confirmation({
  saved,
  matched,
  onRestart,
}: {
  saved: Course[];
  matched: Course[];
  onRestart: () => void;
}) {
  const [shared, setShared] = useState(false);

  // Their own first pick if they saved one, otherwise the top match — the
  // empty-state copy on the results screen promises exactly this.
  const headline = saved[0] ?? matched[0];
  if (!headline) return null;

  const rank = Math.max(0, matched.findIndex((c) => c.id === headline.id));
  const pct = matchScore(rank);
  const cat = CATEGORY_STYLE[headline.category] ?? CATEGORY_STYLE.beauty;
  const Icon = cat.icon;

  const share = async () => {
    const shareData = {
      title: copy.appName,
      text: `My ${cat.label} match from LCBT: ${headline.title} (${pct}% match)`,
      url: headline.url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        trackShare(headline.id, "web-share");
      } else {
        await navigator.clipboard.writeText(`${shareData.text} — ${shareData.url}`);
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
        <div className="share-card__badge">
          <Star size={11} fill="var(--gold)" color="var(--gold)" />
          {t(copy.results.matchBadge, { pct })}
        </div>
      </div>

      <button className="btn btn--ghost btn--sm" style={{ marginTop: 18 }} onClick={() => void share()}>
        <Share2 size={15} />
        {shared ? copy.confirmation.shareCopied : copy.confirmation.shareCta}
      </button>

      <a
        className="btn btn--primary btn--sm"
        style={{ marginTop: 10 }}
        href={copy.confirmation.exitUrl}
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
