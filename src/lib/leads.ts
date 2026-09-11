/**
 * LEAD SUBMISSION
 * ---------------
 * Posts the captured email plus the person's answers and saved courses to an
 * endpoint. Set VITE_LEAD_ENDPOINT to wire it up — a WordPress REST route,
 * a form plugin, or whatever the CRM eventually exposes.
 *
 * With no endpoint configured (local dev), submissions are stored in
 * localStorage under `lcbt.leads` so the flow stays testable end to end.
 */
import type { Answers, Course } from "../content/types";

const ENDPOINT = import.meta.env.VITE_LEAD_ENDPOINT ?? "";

export interface Lead {
  email: string;
  answers: Answers;
  savedCourseIds: string[];
  matchedCourseIds: string[];
  /**
   * "registration" when we had nothing to match them with and they asked to be
   * told when something opens up, "matches" otherwise. Sent explicitly so the
   * CRM can route the two differently without inferring it from course ids.
   */
  leadType: "matches" | "registration";
  /**
   * Opt-in for marketing, separate from the matches they asked for. Sending
   * the matches is the thing they requested; anything beyond that needs its
   * own consent, so the CRM gets the two apart rather than inferred.
   */
  marketingConsent: boolean;
  submittedAt: string;
  source: string;
}

export async function submitLead(input: {
  email: string;
  answers: Answers;
  saved: Course[];
  matched: Course[];
  marketingConsent: boolean;
  leadType: "matches" | "registration";
}): Promise<void> {
  const lead: Lead = {
    email: input.email.trim(),
    answers: input.answers,
    savedCourseIds: input.saved.map((c) => c.id),
    matchedCourseIds: input.matched.map((c) => c.id),
    marketingConsent: input.marketingConsent,
    leadType: input.leadType,
    submittedAt: new Date().toISOString(),
    source: "course-match-web",
  };

  if (!ENDPOINT) {
    const existing = JSON.parse(localStorage.getItem("lcbt.leads") ?? "[]");
    localStorage.setItem("lcbt.leads", JSON.stringify([...existing, lead]));
    console.info("[leads] no VITE_LEAD_ENDPOINT set — stored locally", lead);
    return;
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lead),
  });

  if (!res.ok) {
    throw new Error(`Lead submission failed: ${res.status} ${res.statusText}`);
  }
}
