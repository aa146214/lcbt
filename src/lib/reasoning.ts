import { copy, interestPhrase, t } from "../content";
import type { Answers, MatchResult } from "../content/types";

/** "you're into hairdressing, you're 16-18 and you want to start a career" */
export function buildReasoning(answers: Answers, basis?: MatchResult["basis"]): string | null {
  const parts: string[] = [];

  /* When their swipes led somewhere they are not eligible for, the deck was
     picked by the Level 2 they hold — so leading with "you're into beauty
     therapy" would explain a card that is no longer there. */
  const heldPhrase =
    basis === "qualification" && answers.subject
      ? (copy.subjectPhrase as Record<string, string>)[answers.subject]
      : undefined;

  if (heldPhrase) {
    parts.push(t(copy.reasoningHeld, { subject: heldPhrase }));
  } else {
    const interest = interestPhrase(answers.interest);
    if (interest) parts.push(`you're into ${interest}`);
  }

  if (answers.age) parts.push(`you're ${answers.age}`);

  const goalClause = answers.goal
    ? (copy.reasoningGoal as Record<string, string>)[answers.goal]
    : undefined;
  if (goalClause) parts.push(goalClause);

  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}
