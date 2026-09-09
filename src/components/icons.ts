import {
  Award,
  Briefcase,
  Check,
  GraduationCap,
  Heart,
  HelpCircle,
  Repeat,
  Rocket,
  Scissors,
  Sparkles,
  TrendingUp,
  UserRound,
  Wand2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CategoryId, InterestId } from "../content/types";

/** Lets questions.json name its icons as strings rather than importing them. */
export const ICONS: Record<string, LucideIcon> = {
  Award,
  Briefcase,
  Check,
  GraduationCap,
  Heart,
  HelpCircle,
  Repeat,
  Rocket,
  Scissors,
  Sparkles,
  TrendingUp,
  UserRound,
  Wand2,
  X,
};

export function icon(name: string): LucideIcon {
  return ICONS[name] ?? Sparkles;
}

export const CATEGORY_STYLE: Record<
  CategoryId,
  { color: string; icon: LucideIcon; label: string }
> = {
  hair: { color: "var(--cat-hair)", icon: Scissors, label: "Hairdressing" },
  beauty: { color: "var(--cat-beauty)", icon: Sparkles, label: "Beauty Therapy" },
  makeup: { color: "var(--cat-makeup)", icon: Wand2, label: "Make-Up" },
};

export const INTEREST_STYLE: Record<InterestId, { color: string; icon: LucideIcon }> = {
  hair: { color: "var(--cat-hair)", icon: Scissors },
  beauty: { color: "var(--cat-beauty)", icon: Sparkles },
  makeup: { color: "var(--cat-makeup)", icon: Wand2 },
  all: { color: "var(--pink)", icon: Heart },
};
