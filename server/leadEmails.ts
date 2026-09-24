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
import questionsJson from "../src/content/questions.json" with { type: "json" };

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

interface QuestionRecord {
  id: string;
  question: string;
  options: { id: string; label: string }[];
}
const QUESTIONS = questionsJson.questions as QuestionRecord[];
const INTERESTS = questionsJson.interests as { id: string; label: string }[];

/**
 * The answers as the person saw them: the question they were asked and the
 * option they tapped, instead of `priorQual: yes`. Read from the same
 * questions.json the quiz renders, so rewording a question updates the email
 * with it.
 *
 * Interest leads because the swipe deck comes first in the flow, and it is
 * labelled for what it is — the deck's conclusion, not something they were
 * asked outright. Anything not in the content (a question since removed, a
 * value we don't recognise) falls back to the raw key and value rather than
 * being dropped: an email that silently omits an answer is worse than one
 * that shows it plainly.
 */
export function readableAnswers(answers: Record<string, unknown>): [string, string][] {
  const out: [string, string][] = [];
  const seen = new Set<string>();

  if (answers.interest != null && answers.interest !== "") {
    const label = INTERESTS.find((i) => i.id === answers.interest)?.label;
    out.push(["What they were drawn to (swipe cards)", label ?? String(answers.interest)]);
    seen.add("interest");
  }

  for (const q of QUESTIONS) {
    const value = answers[q.id];
    if (value == null || value === "") continue;
    const label = q.options.find((o) => o.id === value)?.label;
    out.push([q.question, label ?? String(value)]);
    seen.add(q.id);
  }

  for (const [key, value] of Object.entries(answers)) {
    if (seen.has(key) || value == null || value === "") continue;
    out.push([key, String(value)]);
  }

  return out;
}

export interface LeadForEmail {
  email: string;
  leadType: "matches" | "registration" | string;
  marketingConsent: boolean;
  answers: Record<string, unknown>;
  savedCourseIds: string[];
  matchedCourseIds: string[];
  submittedAt: string | null;
  /** When the server took it. Preferred for display: a device clock can be
   *  wrong, and this is the time LCBT should act on. */
  receivedAt?: string;
}

/**
 * "Wednesday, 23 September 2026 at 12:00 pm", in UK time. Pinned to
 * Europe/London rather than the server's zone, because the function runs in
 * whatever region Vercel picks and a lead stamped in US Eastern time would be
 * five hours out for the people reading it.
 */
export function ukTime(iso: string | null | undefined): string {
  if (!iso) return "Unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

const SITE = "https://www.lcbt.co.uk";

/**
 * Served from this app's own public/ folder, not hotlinked from LCBT's
 * WordPress. Every email already sent keeps pointing at this URL for good,
 * and the original is a homepage banner — exactly the kind of file that gets
 * replaced — so hotlinking would break the image in every past email the day
 * the homepage changes. The copy here is also 71 KB instead of 659 KB.
 *
 * Override for local testing: an email client fetches images from the public
 * internet, so a banner that only exists on localhost will never load.
 */
const BANNER_URL =
  process.env.EMAIL_BANNER_URL || "https://quiz.lcbt.co.uk/email/banner.jpg";

/* Mirrors tokens.css. Repeated rather than imported because email clients
   have no CSS variables — every value has to be inlined at the point of use,
   so these exist to stop the two templates drifting from the app. */
const PINK = "#e01e6f";
const PLUM = "#19061c";
const DIM = "#6e5c6a";
const BORDER = "#e5dae3";
const SURFACE = "#f7f2f6";

/** A whole email, wrapped in the brand's shell. */
function shell(title: string, body: string, opts: { banner?: boolean } = {}): string {
  /* width="560" as an attribute, not only CSS: Outlook ignores max-width and
     would otherwise render the image at its full 1120px. display:block stops
     the thin gap some clients leave under inline images. */
  const banner = opts.banner
    ? `<img src="${BANNER_URL}" width="560" alt="London College of Beauty Therapy" style="display:block;width:100%;max-width:560px;height:auto;border:0">`
    : "";
  return `
<div style="margin:0;padding:24px 12px;background:${SURFACE};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${BORDER}">
    <div style="background:${PLUM};padding:18px 24px">
      <div style="color:#ffffff;font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase">LCBT Course Match</div>
    </div>
    ${banner}
    <div style="padding:24px">
      <h1 style="font-size:20px;line-height:1.3;margin:0 0 16px;color:${PLUM}">${title}</h1>
      ${body}
    </div>
  </div>
  <div style="max-width:560px;margin:12px auto 0;text-align:center">
    <a href="${SITE}" style="color:${DIM};font-size:11px;text-decoration:none">London College of Beauty Therapy</a>
  </div>
</div>`.trim();
}

/** Question above answer. Full questions are too long to sit in a label
 *  column without forcing the email wider than a phone. */
function qa(pairs: readonly (readonly [string, string])[]): string {
  return pairs
    .map(
      ([q, a]) =>
        `<div style="padding:10px 0;border-bottom:1px solid ${BORDER}"><div style="font-size:12.5px;color:${DIM};line-height:1.5">${esc(q)}</div><div style="font-size:14.5px;color:${PLUM};font-weight:700;margin-top:3px">${esc(a)}</div></div>`,
    )
    .join("");
}

/** Label/value pairs, the shape both emails use for facts. */
function rows(pairs: readonly (readonly [string, string])[]): string {
  return `<table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;line-height:1.6;border-collapse:collapse">${pairs
    .map(
      ([k, v]) =>
        `<tr><td style="padding:7px 12px 7px 0;color:${DIM};white-space:nowrap;vertical-align:top;border-bottom:1px solid ${BORDER}">${esc(k)}</td><td style="padding:7px 0;color:${PLUM};border-bottom:1px solid ${BORDER}">${v}</td></tr>`,
    )
    .join("")}</table>`;
}

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
 * To LCBT. A work item rather than a brochure, but wearing the same shell as
 * the learner's mail so it is recognisably from the quiz at a glance in a
 * crowded inbox. Every answer is included rather than a summary: whoever
 * follows the lead up should not have to open a database to know what the
 * person said.
 */
export function staffEmail(lead: LeadForEmail) {
  const saved = courseList(lead.savedCourseIds);
  const matched = courseList(lead.matchedCourseIds);
  const isRegistration = lead.leadType === "registration";

  const answerRows = readableAnswers(lead.answers);

  const subject = isRegistration
    ? `Course Match: interest registered — ${lead.email}`
    : `Course Match: new enquiry — ${lead.email}`;

  const lines = [
    subject,
    "",
    `Email:     ${lead.email}`,
    `Type:      ${isRegistration ? "Registered interest (no match available)" : "Course matches"}`,
    `Marketing: ${lead.marketingConsent ? "OPTED IN" : "not opted in"}`,
    `Submitted: ${ukTime(lead.receivedAt ?? lead.submittedAt)}`,
    "",
    "Their answers",
    ...answerRows.flatMap(([q, a]) => [`  ${q}`, `    ${a}`]),
    "",
    saved.length ? "Saved" : "Saved: none",
    ...saved.map((c) => `  ${c.title} — ${c.url}`),
    "",
    matched.length ? "Matched" : "Matched: none",
    ...matched.map((c) => `  ${c.title} — ${c.url}`),
  ];

  const courseLinks = (list: CourseRecord[], empty: string) =>
    list.length
      ? `<ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.8">${list
          .map(
            (c) =>
              `<li><a href="${esc(c.url)}" style="color:${PINK};font-weight:700;text-decoration:none">${esc(c.title)}</a> <span style="color:${DIM}">${esc(c.level)}</span></li>`,
          )
          .join("")}</ul>`
      : `<p style="margin:0;font-size:14px;color:${DIM}">${empty}</p>`;

  const consentPill = lead.marketingConsent
    ? `<span style="display:inline-block;background:${PINK};color:#fff;font-size:11px;font-weight:700;letter-spacing:.4px;padding:3px 10px;border-radius:999px">OPTED IN</span>`
    : `<span style="display:inline-block;background:${SURFACE};color:${DIM};font-size:11px;font-weight:700;letter-spacing:.4px;padding:3px 10px;border-radius:999px;border:1px solid ${BORDER}">NOT OPTED IN</span>`;

  const html = shell(
    isRegistration ? "Interest registered" : "New course enquiry",
    `
    ${rows([
      ["Email", `<a href="mailto:${esc(lead.email)}" style="color:${PINK};font-weight:700;text-decoration:none">${esc(lead.email)}</a>`],
      ["Marketing", consentPill],
      ["Submitted", esc(ukTime(lead.receivedAt ?? lead.submittedAt))],
    ])}

    <h2 style="font-size:13px;letter-spacing:.6px;text-transform:uppercase;color:${DIM};margin:24px 0 8px">Their answers</h2>
    ${qa(answerRows)}

    <h2 style="font-size:13px;letter-spacing:.6px;text-transform:uppercase;color:${DIM};margin:24px 0 8px">Saved</h2>
    ${courseLinks(saved, "Nothing saved.")}

    <h2 style="font-size:13px;letter-spacing:.6px;text-transform:uppercase;color:${DIM};margin:24px 0 8px">Matched</h2>
    ${courseLinks(matched, "No matches — interest registered.")}

    <p style="margin:24px 0 0;font-size:12px;color:${DIM};line-height:1.6">Reply to this email to reach them directly.</p>
  `,
  );

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
  <div style="border:1px solid ${BORDER};border-radius:12px;padding:18px;margin:0 0 12px;background:#ffffff">
    <div style="font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:${PINK};font-weight:700">${esc(c.level)}</div>
    <div style="font-size:17px;font-weight:700;margin:5px 0 8px;color:${PLUM};line-height:1.3">${esc(c.title)}</div>
    <div style="font-size:13.5px;color:${DIM};line-height:1.65">${esc(c.blurb)}</div>
    <div style="font-size:12px;color:${DIM};margin-top:10px">${esc(c.duration)}</div>
    ${note ? `<div style="font-size:12px;color:${DIM};font-style:italic;margin-top:4px">${esc(note)}</div>` : ""}
    <div style="margin-top:14px"><a href="${esc(c.url)}" style="background:${PINK};color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:11px 18px;border-radius:8px;display:inline-block">See full details</a></div>
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

  const html = shell(
    isRegistration ? "You're on the list" : "Your course matches",
    `
    <p style="font-size:14px;line-height:1.7;color:${DIM};margin:0 0 22px">${esc(intro)}</p>
    ${saved.map(block).join("")}
    ${
      alsoMatched.length
        ? `<h2 style="font-size:13px;letter-spacing:.6px;text-transform:uppercase;color:${DIM};margin:26px 0 12px">Also worth a look</h2>${alsoMatched
            .map(block)
            .join("")}`
        : ""
    }
    <p style="margin:24px 0 0;font-size:14px"><a href="${SITE}/courses/" style="color:${PINK};font-weight:700;text-decoration:none">Browse every course at LCBT &rarr;</a></p>
    <p style="margin:22px 0 0;padding-top:16px;border-top:1px solid ${BORDER};font-size:11px;line-height:1.6;color:${DIM}">${esc(footer)}</p>
  `,
    { banner: true },
  );

  return { subject, text, html, tag: "course-match-learner" };
}
