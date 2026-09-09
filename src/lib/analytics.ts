/**
 * GA4 TRACKING
 * ------------
 * Implements GA4_Quiz_Tracking_Plan.docx: the four quiz events, pushed to the
 * dataLayer for GTM (Option A) and, when gtag.js is present without GTM,
 * forwarded straight to gtag (Option B). Both paths are safe to leave on —
 * if neither tag is installed the calls are inert.
 *
 * Every event carries the ambient profile (course + age_range) once it is
 * known, so the Explorations in s.6 of the plan can break any step down by
 * either dimension without needing user-scoped properties to have propagated.
 *
 * NOTE ON `is_correct`: this is a course-matching quiz, so no answer is right
 * or wrong. The parameter is sent as "n/a" to keep the plan's schema intact;
 * `answer_value` carries the answer the person actually gave and is the
 * dimension worth registering in GA4. See README § Analytics.
 */

const QUIZ_ID = import.meta.env.VITE_QUIZ_ID ?? "lcbt-course-match";
const QUIZ_NAME = import.meta.env.VITE_QUIZ_NAME ?? "LCBT Course Match";
const DEBUG = import.meta.env.VITE_ANALYTICS_DEBUG === "true";

type Params = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Profile carried on every event once the person has told us. */
const profile: { course: string; age_range: string } = {
  course: "unknown",
  age_range: "unknown",
};

let quizStartedAt: number | null = null;
let questionShownAt: number | null = null;
let currentQuestionNumber = 0;
let totalQuestions = 0;

/** Last question a view was sent for. Guards against React re-mounting the
 *  same screen (StrictMode does this in dev) sending the view twice, while
 *  still letting a genuine back-navigation re-fire it. */
let lastViewedQuestionId: string | null = null;

/** Stages that should fire at most once per run through the quiz. */
const firedOnce = new Set<string>();

function push(event: string, params: Params) {
  const payload = {
    event,
    quiz_id: QUIZ_ID,
    course: profile.course,
    age_range: profile.age_range,
    ...params,
  };

  if (typeof window !== "undefined") {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push(payload);

    // Option B — direct gtag.js. Only fires when gtag exists and GTM does not,
    // so a site running both doesn't double-count.
    if (typeof window.gtag === "function" && !hasGtm()) {
      const { event: _event, ...rest } = payload;
      window.gtag("event", event, rest);
    }
  }

  if (DEBUG) console.info("[analytics]", event, payload);
}

function hasGtm(): boolean {
  return typeof window !== "undefined" && "google_tag_manager" in window;
}

/**
 * Injects the GTM container when VITE_GTM_ID is set. Doing it here rather than
 * hard-coding a snippet in index.html means switching environments (or turning
 * tracking off entirely) is an environment variable, not an edit.
 */
export function initAnalytics() {
  const id = import.meta.env.VITE_GTM_ID;
  if (!id || typeof document === "undefined") return;
  if (document.getElementById("gtm-loader")) return;

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });

  const script = document.createElement("script");
  script.id = "gtm-loader";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

/** Sets the profile dimensions and mirrors them as GA4 user properties. */
export function setProfile(next: Partial<typeof profile>) {
  Object.assign(profile, next);
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("set", "user_properties", { ...profile });
  }
}

export function setTotalQuestions(n: number) {
  totalQuestions = n;
}

/** 1. Quiz started — fires on the landing CTA. */
export function trackQuizStart() {
  quizStartedAt = Date.now();
  currentQuestionNumber = 0;
  lastViewedQuestionId = null;
  firedOnce.clear();
  push("quiz_start", { quiz_name: QUIZ_NAME });
}

/**
 * 2. Question displayed.
 *
 * `questionNumber` is the question's fixed position in the flow (see
 * questionNumber() in src/content), NOT a running count of views. It has to be
 * stable for the per-question drop-off funnel in s.6 of the plan to line up:
 * question_number = 8 must mean "the age question" for everyone, whether they
 * reached it first time or came back to it.
 */
export function trackQuestionView(questionId: string, questionNumber: number) {
  if (lastViewedQuestionId === questionId) return;
  lastViewedQuestionId = questionId;
  questionShownAt = Date.now();
  currentQuestionNumber = questionNumber;
  push("quiz_question_view", {
    question_id: questionId,
    question_number: questionNumber,
  });
}

/** 3. Question answered. */
export function trackQuestionAnswered(questionId: string, answerValue: string) {
  const timeOnQuestion = questionShownAt
    ? Math.round((Date.now() - questionShownAt) / 100) / 10
    : 0;
  push("quiz_question_answered", {
    question_id: questionId,
    question_number: currentQuestionNumber,
    is_correct: "n/a",
    answer_value: answerValue,
    time_on_question: timeOnQuestion,
  });
}

/**
 * 4. Results screen shown.
 *
 * The plan's `score` was the top match percentage. Percentages are gone — they
 * implied a precision the matching never had — so this reports how many
 * courses the person was matched with instead, which is the number that
 * actually varies and is worth reporting on.
 */
export function trackQuizComplete(matchedCourseIds: string[]) {
  if (firedOnce.has("complete")) return;
  firedOnce.add("complete");
  const completionTime = quizStartedAt
    ? Math.round((Date.now() - quizStartedAt) / 100) / 10
    : 0;
  push("quiz_complete", {
    score: matchedCourseIds.length,
    total_questions: totalQuestions,
    completion_time: completionTime,
    matched_courses: matchedCourseIds.join(","),
  });
}

/* --- Beyond the plan: the funnel stages after the results reveal. -------
   The plan's Path Exploration (s.6) needs events for where people actually
   leave, and quiz_complete fires at the results screen, not at the end. --- */

export function trackCourseSwipe(courseId: string, direction: "save" | "skip") {
  push("quiz_course_swipe", { course_id: courseId, direction });
}

export function trackEmailView(savedCount: number) {
  if (firedOnce.has("email_view")) return;
  firedOnce.add("email_view");
  push("quiz_email_view", { saved_count: savedCount });
}

export function trackEmailSubmitted(savedCount: number, marketingConsent: boolean) {
  push("quiz_email_submitted", {
    saved_count: savedCount,
    marketing_consent: marketingConsent,
  });
}

export function trackShare(courseId: string, method: string) {
  push("quiz_share", { course_id: courseId, method });
}

/** Someone chose to browse the full catalogue instead of taking a match. */
export function trackDiscoverAll(from: string) {
  push("quiz_discover_all", { from });
}

export function trackRestart() {
  push("quiz_restart", {});
}
