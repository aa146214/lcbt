import { useEffect, useState } from "react";
import { Heart, Mail } from "lucide-react";
import { copy } from "../content";
import type { Answers, Course } from "../content/types";
import { submitLead } from "../lib/leads";
import { trackEmailSubmitted, trackEmailView } from "../lib/analytics";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function EmailCapture({
  saved,
  matched,
  answers,
  registerInterest,
  onDone,
}: {
  saved: Course[];
  matched: Course[];
  answers: Answers;
  /**
   * True when we had nothing to match this person with. The deck is skipped
   * entirely in that case, so this screen carries the card's own words rather
   * than making someone swipe a single card that isn't a course.
   */
  registerInterest: boolean;
  answersOnly?: never;
  onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const valid = EMAIL_RE.test(email);

  useEffect(() => {
    trackEmailView(saved.length);
    // Guarded to fire once per run through the quiz.
  }, [saved.length]);

  const submit = async () => {
    if (!valid || status === "sending") return;
    setStatus("sending");
    try {
      await submitLead({
        email,
        answers,
        saved,
        matched,
        marketingConsent: consent,
        leadType: registerInterest ? "registration" : "matches",
      });
      trackEmailSubmitted(saved.length, consent);
      onDone();
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  return (
    <form
      className="screen screen--scroll"
      style={{ padding: "20px 22px" }}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          className="panel__icon"
          style={{ width: 48, height: 48, borderRadius: 14, marginBottom: 16 }}
        >
          <Mail size={20} color="var(--plum)" />
        </div>

        <h2 className="h2" style={{ fontSize: 20, margin: 0 }}>
          {registerInterest ? matched[0]?.title : copy.email.headline}
        </h2>
        <p className="sub" style={{ marginTop: 8 }}>
          {registerInterest ? matched[0]?.blurb : copy.email.sub}
        </p>

        {!registerInterest && saved.length > 0 && (
          <div className="saved-list">
            {saved.map((course) => (
              <div className="saved-item" key={course.id}>
                <span className="saved-item__mark">
                  <Heart size={13} color="var(--pink)" fill="var(--pink)" />
                </span>
                <span className="saved-item__title">{course.title}</span>
              </div>
            ))}
          </div>
        )}

        <label className="visually-hidden" htmlFor="email">
          Email address
        </label>
        <input
          id="email"
          className="field"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={copy.email.placeholder}
          value={email}
          aria-invalid={email.length > 0 && !valid}
          data-state={email ? (valid ? "valid" : "invalid") : "empty"}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
        />
        {status === "error" && (
          <p className="form-error" role="alert">
            {copy.email.errorSend}
          </p>
        )}

        {/* Unticked by default and never required — the matches they asked for
            are sent either way. */}
        <label className="consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>{copy.email.consentLabel}</span>
        </label>
      </div>

      <button
        className="btn btn--primary btn--md"
        type="submit"
        disabled={!valid || status === "sending"}
        style={{ marginTop: 20 }}
      >
        {status === "sending"
          ? copy.email.sending
          : registerInterest
            ? copy.email.ctaRegister
            : copy.email.cta}
      </button>
      <p className="small-print">
        {registerInterest ? copy.email.smallPrintRegister : copy.email.smallPrint}
      </p>
    </form>
  );
}
