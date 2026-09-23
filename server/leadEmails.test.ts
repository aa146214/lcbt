import { describe, expect, it } from "vitest";
import { learnerEmail, readableAnswers, staffEmail, ukTime, type LeadForEmail } from "./leadEmails";

const lead = (over: Partial<LeadForEmail> = {}): LeadForEmail => ({
  email: "someone@example.com",
  leadType: "matches",
  marketingConsent: false,
  answers: { age: "19+", subject: "hair" },
  savedCourseIds: ["l3-hair"],
  matchedCourseIds: ["l3-hair", "l3-mua"],
  submittedAt: "2026-09-23T10:00:00.000Z",
  ...over,
});

describe("learner email", () => {
  it("names the course they saved, from our own content", () => {
    const m = learnerEmail(lead());
    expect(m.subject).toContain("Level 3 Diploma in Hairdressing");
    expect(m.html).toContain("https://www.lcbt.co.uk/courses/level-3-diploma-in-hairdressing/");
  });

  it("does not repeat a saved course under 'also worth a look'", () => {
    const m = learnerEmail(lead());
    const occurrences = m.html.split("Level 3 Diploma in Hairdressing").length - 1;
    expect(occurrences).toBe(1);
    expect(m.html).toContain("Level 3 Diploma in Hair &amp; Media Make-Up");
  });

  it("carries the Level 3 caveat, as the card does", () => {
    expect(learnerEmail(lead()).text).toContain("*Requires a relevant Level 2 qualification");
  });

  it("ignores ids that are not courses, rather than inventing content", () => {
    // The endpoint is public: anything can post an id.
    const m = learnerEmail(lead({ savedCourseIds: ["not-a-course", "_source"], matchedCourseIds: [] }));
    expect(m.html).not.toContain("not-a-course");
    expect(m.html).not.toContain("Verified against");
  });

  it("says a different thing to someone with no match", () => {
    const m = learnerEmail(lead({ leadType: "registration", savedCourseIds: [], matchedCourseIds: [] }));
    expect(m.subject).toContain("on the list");
    expect(m.text).toContain("as soon as something suitable opens up");
  });

  it("tells them which emails they agreed to", () => {
    expect(learnerEmail(lead({ marketingConsent: false })).text).toContain("did not opt in to marketing");
    expect(learnerEmail(lead({ marketingConsent: true })).text).toContain("unsubscribe at any time");
  });
});

describe("staff email", () => {
  it("leads with the address and whether they opted in", () => {
    const m = staffEmail(lead({ marketingConsent: true }));
    expect(m.text).toContain("someone@example.com");
    expect(m.text).toContain("OPTED IN");
    expect(m.replyTo).toBe("someone@example.com");
  });

  it("escapes the address instead of putting markup in the email", () => {
    // parse() rejects this shape, but the template must not be the only guard.
    const m = staffEmail(lead({ email: '<img src=x onerror="alert(1)">@example.com' }));
    expect(m.html).not.toContain("<img");
    expect(m.html).toContain("&lt;img");
  });

  it("shows the question they were asked and the option they picked", () => {
    const m = staffEmail(lead({ answers: { age: "16-18", goal: "career", subject: "beauty" } }));
    expect(m.text).toContain("How old will you be when you start the course?");
    expect(m.text).toContain("Start a career in the industry");
    expect(m.text).toContain("Which area was it in?");
    expect(m.text).toContain("Beauty Therapy");
    // No field names leaking through.
    expect(m.html).not.toMatch(/>priorQual</);
  });

  it("labels the swipe-deck result as the deck's conclusion, and puts it first", () => {
    const rows = readableAnswers({ age: "19+", interest: "all" });
    expect(rows[0]).toEqual(["What they were drawn to (swipe cards)", "I love it all"]);
    expect(rows[1]).toEqual(["How old will you be when you start the course?", "19+"]);
  });

  it("keeps an answer it cannot label rather than dropping it", () => {
    const rows = readableAnswers({ goal: "something-new", retiredQuestion: "x" });
    expect(rows).toContainEqual(["What would you like to do after your qualification?", "something-new"]);
    expect(rows).toContainEqual(["retiredQuestion", "x"]);
  });
});

describe("ukTime", () => {
  it("reads as a person would say it, in UK time", () => {
    // 11:00 UTC in September is 12:00 in London (BST).
    expect(ukTime("2026-09-23T11:00:00.000Z")).toBe("Wednesday, 23 September 2026 at 12:00 pm");
  });

  it("follows the clocks going back", () => {
    // 11:00 UTC in December is 11:00 in London (GMT).
    expect(ukTime("2026-12-02T11:00:00.000Z")).toBe("Wednesday, 2 December 2026 at 11:00 am");
  });

  it("says so plainly when there is no usable time", () => {
    expect(ukTime(null)).toBe("Unknown");
    expect(ukTime("not a date")).toBe("Unknown");
  });
});
