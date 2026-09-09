import { copy, interestPhrase } from "../content";
import type { Answers } from "../content/types";

/** "you're into hairdressing, you're 16-18 and you want to start a career" */
export function buildReasoning(answers: Answers): string | null {
  const parts: string[] = [];

  const interest = interestPhrase(answers.interest);
  if (interest) parts.push(`you're into ${interest}`);
  if (answers.age) parts.push(`you're ${answers.age}`);

  const goalClause = answers.goal
    ? (copy.reasoningGoal as Record<string, string>)[answers.goal]
    : undefined;
  if (goalClause) parts.push(goalClause);

  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}
