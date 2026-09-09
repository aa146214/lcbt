import { courses, matching, questions, vibeCards } from "../content";
import type {
  AgeId,
  Answers,
  CategoryId,
  Course,
  InterestId,
  MatchResult,
  MatchRule,
  PriorLevel,
  StepKey,
  VibeCard,
} from "../content/types";

/* ---------------------------------------------------------
   VIBE DECK -> INTEREST
   Sums the weights of every card swiped right. A clear leader
   wins its category; a close spread resolves to "all" rather
   than an arbitrary tie-break; liking nothing returns null so
   the caller can fall back to a direct tap pick.
--------------------------------------------------------- */
/** Total weight on offer per category, across the whole deck. */
const CATEGORY_TOTALS: Record<CategoryId, number> = (() => {
  const totals: Record<CategoryId, number> = { hair: 0, beauty: 0, makeup: 0 };
  for (const card of vibeCards) {
    for (const [cat, weight] of Object.entries(card.weights)) {
      totals[cat as CategoryId] += weight ?? 0;
    }
  }
  return totals;
})();

/** Below this gap between the top two categories, the answer is "all". */
const ALL_THRESHOLD = 0.25;

/**
 * Scores are normalised to each category's share of what was on offer, not
 * raw points. The deck is uneven — 2 hair, 2 make-up, 3 beauty as supplied —
 * so raw points let beauty reach 6 where the others cap at 4, and somebody who
 * liked every card came out "beauty" instead of "I love it all". Normalising
 * asks "what proportion of the hair cards did they like?", which is the
 * question we actually mean, and it stays correct if the mix changes.
 */
export function computeInterest(liked: VibeCard[]): InterestId | null {
  const raw: Record<CategoryId, number> = { hair: 0, beauty: 0, makeup: 0 };
  for (const card of liked) {
    for (const [cat, weight] of Object.entries(card.weights)) {
      raw[cat as CategoryId] += weight ?? 0;
    }
  }

  const scores = (Object.keys(raw) as CategoryId[]).map(
    (cat): [CategoryId, number] => [cat, raw[cat] / (CATEGORY_TOTALS[cat] || 1)],
  );

  const ranked = scores.sort((a, b) => b[1] - a[1]);
  const [topCat, topScore] = ranked[0];
  const [, secondScore] = ranked[1];
  if (topScore === 0) return null;
  if (topScore - secondScore <= ALL_THRESHOLD) return "all";
  return topCat;
}

/** Total number of vibe cards — used for progress and analytics numbering. */
export const vibeCardCount = vibeCards.length;

/* ---------------------------------------------------------
   QUESTION FLOW
   Which quick questions to show, derived from `showWhen` in
   questions.json rather than hard-coded here, so adding or
   re-gating a question is a content change.
--------------------------------------------------------- */
export function getSteps(answers: Answers): StepKey[] {
  return questions
    .filter((q) => {
      if (!q.showWhen) return true;
      return Object.entries(q.showWhen).every(
        ([key, value]) => answers[key as keyof Answers] === value,
      );
    })
    .map((q) => q.id);
}

/**
 * Clears answers to questions that are no longer reachable — e.g. someone
 * answers 19+ / Yes / Level 3, goes back and switches to 16-18. Without this
 * the stale `level` would keep steering the matching table.
 */
export function pruneAnswers(answers: Answers): Answers {
  const live = new Set<string>(getSteps(answers));
  const next: Answers = { interest: answers.interest };
  for (const key of ["age", "goal", "priorQual", "level"] as const) {
    if (live.has(key) && answers[key] !== undefined) {
      (next as Record<string, unknown>)[key] = answers[key];
    }
  }
  return next;
}

/* ---------------------------------------------------------
   MATCHING
--------------------------------------------------------- */

/**
 * Collapses the two prior-qualification questions into the single axis the
 * spreadsheet branches on. Asked of everyone: a 16-18 learner who has just
 * finished a Level 2 should progress to Level 3, per the sheet's rows 29-36
 * and the college's own "progress onto a Level 3" wording.
 */
export function getPriorLevel(answers: Answers): PriorLevel {
  if (answers.priorQual === "no") return "none";
  if (answers.priorQual === "yes") return answers.level ?? "notsure";
  return "none";
}

function shortCoursesAvailable(): boolean {
  return courses["short-courses"]?.available !== false;
}

function ruleMatches(rule: MatchRule, age: string, priorLevel: PriorLevel): boolean {
  const { when } = rule;
  if (when.age && when.age !== age) return false;
  if (when.priorLevel !== undefined) {
    const allowed = Array.isArray(when.priorLevel) ? when.priorLevel : [when.priorLevel];
    if (!allowed.includes(priorLevel)) return false;
  }
  if (
    when.shortCoursesAvailable !== undefined &&
    when.shortCoursesAvailable !== shortCoursesAvailable()
  ) {
    return false;
  }
  return true;
}

export function getMatches(answers: Answers): MatchResult {
  const interest: InterestId = answers.interest ?? "all";
  const age = answers.age ?? "16-18";
  const priorLevel = getPriorLevel(answers);

  const rule = matching.rules.find((r) => ruleMatches(r, age, priorLevel));

  const ids = rule?.results[interest] ?? matching.fallback.ids;
  const resolved: Course[] = ids
    .map((id) => courses[id])
    .filter((c): c is Course => Boolean(c))
    // A course marked unavailable is dropped wherever it appears, so taking
    // something out of the catalogue never leaves a rule recommending it.
    .filter((c) => c.available !== false);

  // Everything the rule offered is unavailable — fall through to registering
  // interest rather than showing an empty deck.
  if (resolved.length === 0) {
    return {
      type: "registerInterest",
      ruleId: rule?.id ?? "fallback",
      courses: [courses["register-interest"]],
    };
  }

  // Taking short courses out of the catalogue collapsed some decks to a single
  // card, which undercuts the sheet's whole approach to prior qualifications:
  // offer a plausible set and let people self-select against the entry
  // requirements (logic!F36, "until we know which level 2 they hold"). Top a
  // thin deck back up with the rule's "see all" card so there is still
  // somewhere to go.
  const backfillId = rule?.backfill;
  if (backfillId && resolved.length < matching.minDeckSize) {
    const extra = courses[backfillId];
    if (extra && extra.available !== false && !resolved.some((c) => c.id === extra.id)) {
      resolved.push(extra);
    }
  }

  const type =
    rule?.type ??
    (resolved.every((c) => c.kind === "register-interest")
      ? "registerInterest"
      : "courses");

  return { type, ruleId: rule?.id ?? "fallback", courses: resolved };
}

/**
 * The funding line to show this person. Courses that price differently by age
 * carry both, and showing a 30-year-old "Fully funded for 16-18" is the kind
 * of wrong that costs someone money, so prefer the age-specific line whenever
 * we know which age group we are talking to.
 */
export function fundingFor(course: Course, age?: AgeId): string {
  if (age && course.fundingByAge?.[age]) return course.fundingByAge[age] as string;
  return course.funding;
}

/** Descending match score by rank, extending the last value if the list runs long. */
export function matchScore(rank: number): number {
  const scores = matching.matchScores;
  return scores[rank] ?? scores[scores.length - 1];
}
