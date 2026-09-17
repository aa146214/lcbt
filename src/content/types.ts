export type CategoryId = "hair" | "beauty" | "makeup";
export type InterestId = CategoryId | "all";
export type AgeId = "16-18" | "19+";
export type PriorLevel = "none" | "Level 2" | "Level 3" | "notsure";
/** The subject a prior qualification was in. "other" is a real answer — a
 *  qualification outside the three we teach tells us nothing about progression,
 *  so it is treated as unknown rather than as a fourth category. */
export type SubjectId = CategoryId | "other";
export type CourseKind = "course" | "collection" | "register-interest";

export interface Course {
  id: string;
  kind: CourseKind;
  title: string;
  level: string;
  category: CategoryId;
  prerequisite: "none" | "prior-study";
  audience: AgeId | "all";
  /**
   * `false` takes the course out of every result. Short courses are currently
   * false because they are not in the live catalogue; see the sheet's
   * "short courses exist" / "do not exist" branches.
   */
  available?: boolean;
  blurb: string;
  /** Card artwork, with the subject name burnt into the top of the frame.
   *  Absent on the register-interest and "explore all" cards, which fall back
   *  to the flat category colour and its icon. */
  image?: string;
  duration: string;
  /** Next intake, where the course page states one. */
  startDate?: string | null;
  entryRequirements: string;
  /** `entryRequirements` in a form the matcher can read. `subjects` lists the
   *  Level 2 subjects that satisfy it — see matching.ts for why it is applied
   *  only to people whose highest qualification is a Level 2. */
  entry?: { level: PriorLevel; subjects: CategoryId[] };
  /** The full, always-true funding line. */
  funding: string;
  /** Funding for the age group in front of us, when it differs. */
  fundingByAge?: Partial<Record<AgeId, string>>;
  /** Where these figures came from, so unverified rows stay visible. */
  source?: string;
  url: string;
}

export interface VibeCard {
  id: string;
  text: string;
  image: string;
  weights: Partial<Record<CategoryId, number>>;
}

export interface Interest {
  id: InterestId;
  /** Title case, for buttons and chips. */
  label: string;
  /** Lower case, for mid-sentence use. Not derivable: "I love it all"
   *  lowercases to "i love it all", which reads as a typo. */
  phrase: string;
}

export interface QuestionOption {
  id: string;
  label: string;
  icon: string;
}

export interface Question {
  id: "age" | "goal" | "priorQual" | "level" | "subject";
  layout: "grid" | "list";
  question: string;
  sub: string | null;
  reassurance: string | null;
  showWhen?: Record<string, string>;
  options: QuestionOption[];
}

export interface MatchRule {
  id: string;
  note?: string;
  when: {
    age?: AgeId;
    priorLevel?: PriorLevel | PriorLevel[];
    shortCoursesAvailable?: boolean;
  };
  type?: "courses" | "registerInterest";
  results: Record<InterestId, string[]>;
}

export interface MatchingTable {
  rules: MatchRule[];
  fallback: { type: "registerInterest"; ids: string[] };
}

export interface Answers {
  interest?: InterestId;
  age?: AgeId;
  goal?: string;
  priorQual?: "yes" | "no";
  level?: "Level 2" | "Level 3" | "notsure";
  subject?: SubjectId;
}

export type StepKey = Question["id"];

export interface MatchResult {
  type: "courses" | "registerInterest";
  ruleId: string;
  courses: Course[];
  /** What the deck was chosen on. "qualification" means their swipes led
   *  somewhere they are not eligible for, so the subject they hold picked the
   *  courses instead — and the "Matched you because" line has to say so. */
  basis?: "interest" | "qualification";
}
