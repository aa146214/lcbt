/**
 * CONTENT LAYER
 * -------------
 * Everything the app renders — courses, questions, swipe cards, copy and the
 * matching table — is read through this module. Today it resolves from the
 * bundled JSON files in this folder.
 *
 * WordPress swap: replace the four `import ... from "./*.json"` lines with a
 * fetch against the WP REST API and make `loadContent()` async. Nothing
 * outside this folder reads the JSON directly, so no screen needs to change.
 * See README.md § "Moving content to WordPress".
 */
import coursesJson from "./courses.json";
import questionsJson from "./questions.json";
import matchingJson from "./matching.json";
import copyJson from "./copy.json";

import type {
  Course,
  Interest,
  MatchingTable,
  Question,
  VibeCard,
} from "./types";

/**
 * The JSON files carry `_source` provenance notes alongside the real records.
 * Stripped here so nothing downstream can iterate the catalogue and trip over
 * a string where it expected a course.
 */
function withoutMeta<T>(raw: Record<string, unknown>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(raw).filter(([key]) => !key.startsWith("_")),
  ) as Record<string, T>;
}

export const courses = withoutMeta<Course>(coursesJson as unknown as Record<string, unknown>);
export const vibeCards = questionsJson.vibeCards as unknown as VibeCard[];
export const interests = questionsJson.interests as unknown as Interest[];
export const questions = questionsJson.questions as unknown as Question[];
export const matching = matchingJson as unknown as MatchingTable;
export const copy = copyJson;

export function getCourse(id: string): Course | undefined {
  return courses[id];
}

export function interestLabel(id: string | undefined): string | undefined {
  return interests.find((i) => i.id === id)?.label;
}

/** Lower-case form for dropping into a sentence. */
export function interestPhrase(id: string | undefined): string | undefined {
  return interests.find((i) => i.id === id)?.phrase;
}

export function questionById(id: string): Question | undefined {
  return questions.find((q) => q.id === id);
}

/**
 * A question's fixed position in the flow, for GA4's `question_number`.
 *
 * Numbered against the full content list rather than the steps a given person
 * actually sees, so a number always means the same question: 1-7 are the vibe
 * cards, 8-11 the quick questions in questions.json order (10 and 11 only
 * apply to 19+), and the last slot is the interest fallback that only appears
 * when someone swipes right on nothing. Stable numbers are what make the
 * per-question drop-off funnel comparable between people.
 */
export function questionNumber(questionId: string): number {
  const vibeIndex = vibeCards.findIndex((c) => c.id === questionId);
  if (vibeIndex > -1) return vibeIndex + 1;

  const quizIndex = questions.findIndex((q) => q.id === questionId);
  if (quizIndex > -1) return vibeCards.length + 1 + quizIndex;

  // interest-fallback and anything else off the main sequence
  return vibeCards.length + questions.length + 1;
}

/** Fills {placeholders} in a copy string. */
export function t(template: string, vars: Record<string, string | number> = {}) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in vars ? String(vars[key]) : match,
  );
}

export * from "./types";
