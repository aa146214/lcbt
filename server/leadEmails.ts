/**
 * THE TWO EMAILS A SUBMISSION SENDS
 * ---------------------------------
 * One to LCBT, so a lead is something that arrives rather than something
 * somebody remembers to go and look for. One to the learner, because the
 * confirmation screen has been promising "Check your inbox!" since the first
 * build and nothing has ever delivered it.
 *
 * Course details are looked up here from the same content the app renders,
 * not taken from the request. The endpoint is public: anything can post a
 * course id, and an email going out under LCBT's name should never contain a
 * title or a link that came from outside.
 */
import coursesJson from "../src/content/courses.json" with { type: "json" };
import copyJson from "../src/content/copy.json" with { type: "json" };

interface CourseRecord {
  id: string;
  title: string;
  level: string;
  blurb: string;
  url: string;
  duration: string;
  entryRequirements: string;
}

/** `_source` is provenance for humans, not a course. */
const COURSES = Object.fromEntries(
  Object.entries(coursesJson as Record<string, unknown>).filter(
    ([key, value]) => key !== "_source" && typeof value === "object" && value !== null,
  ),
) as Record<string, CourseRecord>;

const LEVEL_NOTES = copyJson.results.levelNotes as Record<string, string>;

export interface LeadForEmail {
  email: string;
  leadType: "matches" | "registration" | string;
  marketingConsent: boolean;
  answers: Record<string, unknown>;
  savedCourseIds: string[];
  matchedCourseIds: string[];
  submittedAt: string | null;
}

const SITE = "https://www.lcbt.co.uk";

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function courseList(ids: string[]): CourseRecord[] {
  return ids.map((id) => COURSES[id]).filter(Boolean);
}

/* ------------------------------------------------------------------ */

/**
 * To LCBT. Deliberately plain: this is a work item, not a brochure. Every
 * answer is included rather than a summary, because whoever follows the lead
 * up should not have to open a database to know what the person said.
 */
export function staffEmail(lead: LeadForEmail) {
  const saved = courseList(lead.savedCourseIds);
  const matched = courseList(lead.matchedCourseIds);
  const isRegistration = lead.leadType === "registration";

  const answerRows = Object.entries(lead.answers)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => [k, String(v)] as const);

  const subject = isRegistration
    ? `Course Match: interest registered — ${lead.email}`
    : `Course Match: new enquiry — ${lead.email}`;

  const lines = [
    subject,
    "",
    `Email:     ${lead.email}`,
    `Type:      ${isRegistration ? "Registered interest (no match available)" : "Course matches"}`,
    `Marketing: ${lead.marketingConsent ? "OPTED IN" : "not opted in"}`,
    `Submitted: ${lead.submittedAt ?? "unknown"}`,
    "",
    "Answers",
    ...answerRows.map(([k, v]) => `  ${k}: ${v}`),
    "",
    saved.length ? "Saved" : "Saved: none",
    ...saved.map((c) => `  ${c.title} — ${c.url}`),
    "",
    matched.length ? "Matched" : "Matched: none",
    ...matched.map((c) => `  ${c.title} — ${c.url}`),
  ];

  const html = `
<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#19061c">
  <h2 style="font-size:17px;margin:0 0 14px">${isRegistration ? "Interest registered" : "New course enquiry"}</h2>
  <table cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.6">
    <tr><td style="padding-right:14px;color:#6b6070">Email</td><td><a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a></td></tr>
    <tr><td style="padding-right:14px;color:#6b6070">Marketing</td><td><strong>${lead.marketingConsent ? "Opted in" : "Not opted in"}</strong></td></tr>
    <tr><td style="padding-right:14px;color:#6b6070">Submitted</td><td>${esc(lead.submittedAt ?? "unknown")}</td></tr>
  </table>
  <h3 style="font-size:14px;margin:18px 0 6px">Answers</h3>
  <table cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.6">
    ${answerRows.map(([k, v]) => `<tr><td style="padding-right:14px;color:#6b6070">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}
  </table>
  <h3 style="font-size:14px;margin:18px 0 6px">Saved</h3>
  ${saved.length ? `<ul style="margin:0;padding-left:18px">${saved.map((c) => `<li><a href="${esc(c.url)}">${esc(c.title)}</a></li>`).join("")}</ul>` : `<p style="margin:0;color:#6b6070">None saved.</p>`}
  <h3 style="font-size:14px;margin:18px 0 6px">Matched</h3>
  ${matched.length ? `<ul style="margin:0;padding-left:18px">${matched.map((c) => `<li><a href="${esc(c.url)}">${esc(c.title)}</a></li>`).join("")}</ul>` : `<p style="margin:0;color:#6b6070">No matches — interest registered.</p>`}
</div>`.trim();

  return { subject, text: lines.join("\n"), html, replyTo: lead.email, tag: "course-match-staff" };
}

/* ------------------------------------------------------------------ */

/**
 * To the learner. Their own saved picks lead, because those are the ones they
 * chose; the rest of the matches follow. The Level 3 caveat travels with the
 * course here exactly as it does on the card — someone reading this a week
 * later should not be the last to find out they need a Level 2 first.
 */
export function learnerEmail(lead: LeadForEmail) {
  const saved = courseList(lead.savedCourseIds);
  const matched = courseList(lead.matchedCourseIds);
  const isRegistration = lead.leadType === "registration";

  // Their picks first, then anything matched they did not save, without
  // repeating a course in both lists.
  const savedIds = new Set(saved.map((c) => c.id));
  const alsoMatched = matched.filter((c) => !savedIds.has(c.id));
  const headline = saved.length ? saved : matched;

  const subject = isRegistration
    ? "You're on the list — LCBT"
    : headline.length === 1
      ? `Your course match: ${headline[0].title}`
      : "Your course matches from LCBT";

  const intro = isRegistration
    ? "Thanks for registering your interest. We'll email you as soon as something suitable opens up."
    : "Here are the courses you picked out. Take your time — every one links through to the full details on our site.";

  const block = (c: CourseRecord) => {
    const note = LEVEL_NOTES[c.level];
    return `
  <div style="border:1px solid #eadfe6;border-radius:12px;padding:16px;margin:0 0 12px">
    <div style="font-size:11px;letter-spacing:.5px;text-transform:uppercase;color:#cf1f63;font-weight:700">${esc(c.level)}</div>
    <div style="font-size:16px;font-weight:700;margin:4px 0 6px">${esc(c.title)}</div>
    <div style="font-size:13px;color:#4a3f4d;line-height:1.6">${esc(c.blurb)}</div>
    <div style="font-size:12px;color:#6b6070;margin-top:8px">${esc(c.duration)}</div>
    ${note ? `<div style="font-size:12px;color:#6b6070;font-style:italic;margin-top:4px">${esc(note)}</div>` : ""}
    <div style="margin-top:12px"><a href="${esc(c.url)}" style="background:#cf1f63;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:10px 16px;border-radius:8px;display:inline-block">See full details</a></div>
  </div>`;
  };

  const textCourse = (c: CourseRecord) =>
    [
      `${c.title} (${c.level})`,
      `  ${c.blurb}`,
      `  ${c.duration}`,
      LEVEL_NOTES[c.level] ? `  ${LEVEL_NOTES[c.level]}` : null,
      `  ${c.url}`,
      "",
    ]
      .filter(Boolean)
      .join("\n");

  /* This mail is the thing they asked for on the form, so it goes out whether
     or not they opted into marketing. The footer says which is which rather
     than leaving them to wonder why LCBT is in their inbox. */
  const footer = lead.marketingConsent
    ? "You asked us to send these matches, and you opted in to hear about open days, new courses and events. You can unsubscribe at any time."
    : "You asked us to send these matches. You did not opt in to marketing, so this is the only email you'll get from us about it.";

  const text = [
    isRegistration ? "You're on the list" : "Your course matches",
    "",
    intro,
    "",
    ...saved.map(textCourse),
    ...(alsoMatched.length ? ["Also worth a look", "", ...alsoMatched.map(textCourse)] : []),
    `Browse everything: ${SITE}/courses/`,
    "",
    footer,
  ].join("\n");

  const html = `
<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#fff;color:#19061c;padding:8px">
  <div style="max-width:560px;margin:0 auto">
    <h1 style="font-size:22px;margin:0 0 10px">${isRegistration ? "You're on the list" : "Your course matches"}</h1>
    <p style="font-size:14px;line-height:1.6;color:#4a3f4d;margin:0 0 20px">${esc(intro)}</p>
    ${saved.map(block).join("")}
    ${
      alsoMatched.length
        ? `<h2 style="font-size:15px;margin:22px 0 10px">Also worth a look</h2>${alsoMatched.map(block).join("")}`
        : ""
    }
    <p style="font-size:13px;margin:22px 0 0"><a href="${SITE}/courses/" style="color:#cf1f63">Browse every course at LCBT</a></p>
    <hr style="border:none;border-top:1px solid #eadfe6;margin:22px 0 12px">
    <p style="font-size:11px;line-height:1.6;color:#8a8090;margin:0">${esc(footer)}</p>
  </div>
</div>`.trim();

  return { subject, text, html, tag: "course-match-learner" };
}
