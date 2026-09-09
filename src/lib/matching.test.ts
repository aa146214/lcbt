import { describe, expect, it } from "vitest";
import {
  computeInterest,
  fundingFor,
  getMatches,
  getPriorLevel,
  getSteps,
  pruneAnswers,
} from "./matching";
import { courses, vibeCards } from "../content";
import type { Answers, InterestId } from "../content/types";

/**
 * Every expectation below is transcribed from
 * "LCBT course finder logic v1.xlsx" (sheet `logic`), with the row range noted
 * on each block. If the sheet changes, change matching.json and these
 * expectations together — that pairing is the point of this file.
 */

const ids = (a: Answers) => getMatches(a).courses.map((c) => c.id);

const card = (id: string) => {
  const found = vibeCards.find((c) => c.id === id);
  if (!found) throw new Error(`no vibe card ${id}`);
  return found;
};

describe("computeInterest — vibe deck scoring", () => {
  it("returns null when nothing is swiped right, so the caller can fall back", () => {
    expect(computeInterest([])).toBeNull();
  });

  it("gives a clear leader its own category", () => {
    expect(computeInterest([card("vibe-hair-trim"), card("vibe-hair-blowdry")])).toBe("hair");
    expect(computeInterest([card("vibe-makeup-fx"), card("vibe-makeup-occasion")])).toBe("makeup");
    expect(computeInterest([card("vibe-beauty-skin"), card("vibe-beauty-nails")])).toBe("beauty");
  });

  it("resolves a close spread to 'all' rather than an arbitrary tie-break", () => {
    expect(computeInterest([card("vibe-hair-trim"), card("vibe-beauty-skin")])).toBe("all");
  });

  it("calls liking every card 'all', despite the deck being beauty-heavy", () => {
    // The raw totals are hair 4, make-up 4, beauty 6, so unnormalised scoring
    // handed this person "beauty" purely because there are more beauty cards.
    expect(computeInterest([...vibeCards])).toBe("all");
  });

  it("is not swayed by the number of cards in a category", () => {
    // Every beauty card vs every hair card: both are a full sweep, so neither
    // should win on card count alone.
    const allBeauty = vibeCards.filter((c) => c.weights.beauty);
    const allHair = vibeCards.filter((c) => c.weights.hair);
    expect(computeInterest([...allBeauty, ...allHair])).toBe("all");
  });

  it("needs a lead of more than one point to pick a single category", () => {
    // hair 4 vs beauty 2 — a two-point lead is decisive.
    const liked = [card("vibe-hair-trim"), card("vibe-hair-blowdry"), card("vibe-beauty-skin")];
    expect(computeInterest(liked)).toBe("hair");
  });
});

describe("getSteps — question gating", () => {
  it("asks everyone about prior qualifications, whatever their age", () => {
    expect(getSteps({ age: "16-18" })).toEqual(["age", "goal", "priorQual"]);
    expect(getSteps({ age: "19+" })).toEqual(["age", "goal", "priorQual"]);
  });

  it("adds the level question only after a yes", () => {
    expect(getSteps({ age: "19+", priorQual: "no" })).toEqual(["age", "goal", "priorQual"]);
    for (const age of ["16-18", "19+"] as const) {
      expect(getSteps({ age, priorQual: "yes" })).toEqual([
        "age",
        "goal",
        "priorQual",
        "level",
      ]);
    }
  });
});

describe("sheet rows 29-36 — 16-18 who already hold a Level 2", () => {
  const cases: [InterestId, string[]][] = [
    ["beauty", ["l3-beauty", "explore-l3"]],
    ["hair", ["l3-hair", "explore-l3"]],
    ["makeup", ["l3-mua", "explore-l3"]],
    ["all", ["l3-mua", "l3-beauty", "l3-hair"]],
  ];

  it.each(cases)("%s progresses to Level 3", (interest, expected) => {
    expect(ids({ interest, age: "16-18", priorQual: "yes", level: "Level 2" })).toEqual(expected);
  });

  it("does not send someone who holds a Level 2 back to Level 2", () => {
    const result = ids({ interest: "beauty", age: "16-18", priorQual: "yes", level: "Level 2" });
    expect(result).not.toContain("l2-beauty");
  });
});

describe("pruneAnswers — going back and changing an answer", () => {
  it("drops the level when someone switches to no prior qualification", () => {
    const stale: Answers = { age: "19+", goal: "career", priorQual: "no", level: "Level 3" };
    expect(pruneAnswers(stale)).toEqual({ age: "19+", goal: "career", priorQual: "no" });
  });

  it("a stale level cannot steer the matching table once it is unreachable", () => {
    const stale: Answers = { interest: "beauty", age: "19+", priorQual: "no", level: "Level 3" };
    expect(getPriorLevel(pruneAnswers(stale))).toBe("none");
    expect(getMatches(pruneAnswers(stale)).type).toBe("registerInterest");
  });

  it("keeps answers that are still reachable", () => {
    const live: Answers = {
      interest: "hair",
      age: "16-18",
      goal: "career",
      priorQual: "yes",
      level: "Level 2",
    };
    expect(pruneAnswers(live)).toEqual(live);
  });
});

describe("sheet rows 18-27 — 16-18, no previous qualification, recommend Level 2", () => {
  const cases: [InterestId, string[]][] = [
    ["beauty", ["l2-beauty", "l2-mua", "explore-l2"]],
    ["hair", ["l2-hair", "l2-mua", "l2-beauty"]],
    ["makeup", ["l2-mua", "l2-beauty", "l2-hair"]],
    ["all", ["l2-mua", "l2-beauty", "l2-hair"]],
  ];

  it.each(cases)("%s", (interest, expected) => {
    expect(ids({ interest, age: "16-18" })).toEqual(expected);
  });
});

describe("sheet rows 39-46 — 19+, no previous qualification", () => {
  const cases: InterestId[] = ["beauty", "hair", "makeup", "all"];

  // Short courses are the sheet's best match here, but they are not in the
  // live catalogue, so the "short courses do not exist" branch applies.
  it.each(cases)("%s registers interest while short courses are unavailable", (interest) => {
    const result = getMatches({ interest, age: "19+", priorQual: "no" });
    expect(result.type).toBe("registerInterest");
    expect(result.courses.map((c) => c.id)).toEqual(["register-interest"]);
  });
});

describe("sheet rows 56-62 — 19+ holding a Level 2, no short courses", () => {
  // Resolves to the shared Level 3 diplomas: the live catalogue has one per
  // subject open to both age groups, not separate 19+ courses.
  const cases: [InterestId, string[]][] = [
    ["beauty", ["l3-beauty", "explore-l3"]],
    ["hair", ["l3-hair", "l3-mua"]],
    ["makeup", ["l3-mua", "l3-hair"]],
    ["all", ["l3-beauty", "l3-hair"]],
  ];

  it.each(cases)("%s", (interest, expected) => {
    expect(ids({ interest, age: "19+", priorQual: "yes", level: "Level 2" })).toEqual(expected);
  });
});

describe("sheet rows 66-72 — 19+ holding a Level 3", () => {
  // Short courses are dropped as unavailable, so each of these would come out
  // as a single card; the rule's "see all" backfill tops it back up.
  const cases: [InterestId, string[]][] = [
    ["beauty", ["l4-aesthetic", "explore-l3"]],
    ["hair", ["l3-mua", "explore-l3"]],
    ["makeup", ["l3-hair", "explore-l3"]],
    ["all", ["l4-aesthetic", "explore-l3"]],
  ];

  it.each(cases)("%s", (interest, expected) => {
    expect(ids({ interest, age: "19+", priorQual: "yes", level: "Level 3" })).toEqual(expected);
  });
});

describe("thin decks get a route onwards", () => {
  it("tops up a deck left with one card after filtering", () => {
    // 19+ / Level 2 / beauty is just L3 Beauty Therapy once short courses go.
    expect(ids({ interest: "beauty", age: "19+", priorQual: "yes", level: "Level 2" })).toEqual([
      "l3-beauty",
      "explore-l3",
    ]);
  });

  it("leaves decks that are already big enough alone", () => {
    expect(ids({ interest: "hair", age: "16-18" })).toEqual(["l2-hair", "l2-mua", "l2-beauty"]);
  });

  it("never backfills the register-interest path", () => {
    const result = getMatches({ interest: "hair", age: "19+", priorQual: "no" });
    expect(result.courses.map((c) => c.id)).toEqual(["register-interest"]);
  });

  it("never leaves anyone with a single card and nowhere to go", () => {
    for (const age of ["16-18", "19+"] as const) {
      for (const interest of ["beauty", "hair", "makeup", "all"] as InterestId[]) {
        for (const level of ["Level 2", "Level 3"] as const) {
          const result = getMatches({ interest, age, priorQual: "yes", level });
          if (result.type === "registerInterest") continue;
          expect(
            result.courses.length,
            `${age}/${interest}/${level} deck too thin`,
          ).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });
});

describe("entry requirements — the sheet's answer to unknown prior subjects", () => {
  it("every course states what it needs, so people can self-select", () => {
    for (const course of Object.values(courses)) {
      expect(course.entryRequirements, `${course.id} has none`).toBeTruthy();
    }
  });
});

describe("course availability", () => {
  it("never recommends a course marked unavailable", () => {
    const everyId = new Set<string>();
    const ages: Answers["age"][] = ["16-18", "19+"];
    const levels: Answers["level"][] = ["Level 2", "Level 3", "notsure"];
    for (const age of ages) {
      for (const interest of ["beauty", "hair", "makeup", "all"] as InterestId[]) {
        for (const priorQual of ["yes", "no"] as const) {
          for (const level of levels) {
            ids({ interest, age, priorQual, level }).forEach((id) => everyId.add(id));
          }
        }
      }
    }
    const unavailable = [...everyId].filter((id) => courses[id]?.available === false);
    expect(unavailable).toEqual([]);
  });

  it("still produces a deck for every reachable combination", () => {
    for (const age of ["16-18", "19+"] as const) {
      for (const interest of ["beauty", "hair", "makeup", "all"] as InterestId[]) {
        expect(getMatches({ interest, age }).courses.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("funding shown to the person in front of us", () => {
  it("gives a 19+ learner the adult fee, not the 16-18 line", () => {
    expect(fundingFor(courses["l3-hair"], "19+")).toBe("£2,583 (loans available)");
    expect(fundingFor(courses["l3-beauty"], "19+")).toBe("£3,345 (loans available)");
  });

  it("gives a 16-18 learner the funded line", () => {
    expect(fundingFor(courses["l3-beauty"], "16-18")).toBe("Fully funded for 16-18");
  });

  it("never shows a 19+ learner a line that mentions being funded for 16-18", () => {
    for (const course of Object.values(courses)) {
      if (!course.fundingByAge?.["19+"]) continue;
      expect(fundingFor(course, "19+")).not.toMatch(/fully funded/i);
    }
  });

  it("keeps every live course's figures traceable to a source", () => {
    for (const course of Object.values(courses)) {
      if (course.kind !== "course" || course.available === false) continue;
      expect(course.source, `${course.id} has no source`).toBeTruthy();
    }
  });

  it("falls back to the full line when the age is unknown", () => {
    expect(fundingFor(courses["l3-beauty"])).toBe(
      "Fully funded for 16-18; £3,345 for 19+ (loans available)",
    );
  });
});

describe("screen copy s.5 — the no-match variant", () => {
  it("a 19+ learner who cannot confirm their level registers interest", () => {
    const result = getMatches({ interest: "hair", age: "19+", priorQual: "yes", level: "notsure" });
    expect(result.type).toBe("registerInterest");
    expect(result.courses.map((c) => c.id)).toEqual(["register-interest"]);
  });

  it("never returns an empty deck, whatever it is handed", () => {
    expect(getMatches({}).courses.length).toBeGreaterThan(0);
  });
});

describe("getPriorLevel — collapsing two questions onto the sheet's one axis", () => {
  it("treats 16-18 as no prior study, because the copy gates that question to 19+", () => {
    expect(getPriorLevel({ age: "16-18" })).toBe("none");
  });

  it("reads the held level for a qualified 19+ learner", () => {
    expect(getPriorLevel({ age: "19+", priorQual: "yes", level: "Level 3" })).toBe("Level 3");
  });

  it("falls back to 'notsure' if the level question was somehow skipped", () => {
    expect(getPriorLevel({ age: "19+", priorQual: "yes" })).toBe("notsure");
  });
});
