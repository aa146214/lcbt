import { describe, expect, it } from "vitest";
import { parse } from "./lead";

/**
 * The endpoint is public: anything can POST to it. These cover the cases that
 * would otherwise reach the database.
 */
const valid = {
  email: "someone@example.com",
  leadType: "matches",
  marketingConsent: true,
  answers: { age: "19+", interest: "hair" },
  savedCourseIds: ["l3-hair"],
  matchedCourseIds: ["l3-hair", "l3-mua"],
  source: "course-match-web",
  submittedAt: "2026-09-22T10:00:00.000Z",
};

const err = (body: unknown) => {
  const out = parse(body);
  return "error" in out ? out.error : null;
};

describe("lead payload validation", () => {
  it("accepts a well-formed submission", () => {
    const out = parse(valid);
    expect("lead" in out).toBe(true);
    if (!("lead" in out)) return;
    expect(out.lead.email).toBe("someone@example.com");
    expect(out.lead.marketingConsent).toBe(true);
  });

  it("rejects anything that is not an object", () => {
    for (const body of [null, "a string", 42, undefined]) {
      expect(err(body)).toBe("body must be an object");
    }
  });

  it("rejects a missing or malformed email", () => {
    expect(err({ ...valid, email: "" })).toBe("invalid email");
    expect(err({ ...valid, email: "not-an-email" })).toBe("invalid email");
    expect(err({ ...valid, email: 42 })).toBe("invalid email");
    expect(err({ ...valid, email: `${"a".repeat(250)}@example.com` })).toBe("invalid email");
  });

  it("trims the email rather than storing the whitespace", () => {
    const out = parse({ ...valid, email: "  someone@example.com  " });
    expect("lead" in out && out.lead.email).toBe("someone@example.com");
  });

  it("only allows the two lead types the CRM routes on", () => {
    expect(err({ ...valid, leadType: "registration" })).toBeNull();
    expect(err({ ...valid, leadType: "something-else" })).toBe("invalid leadType");
  });

  it("will not take a truthy value in place of consent", () => {
    // Consent has to be an explicit boolean — "yes" or 1 must not become true.
    expect(err({ ...valid, marketingConsent: "yes" })).toBe("marketingConsent must be a boolean");
    expect(err({ ...valid, marketingConsent: 1 })).toBe("marketingConsent must be a boolean");
  });

  it("caps the course id arrays", () => {
    expect(err({ ...valid, savedCourseIds: Array(51).fill("x") })).toBe("invalid course ids");
    expect(err({ ...valid, matchedCourseIds: ["a".repeat(65)] })).toBe("invalid course ids");
    expect(err({ ...valid, savedCourseIds: "l3-hair" })).toBe("invalid course ids");
    expect(err({ ...valid, savedCourseIds: [] })).toBeNull();
  });

  it("keeps an unusable timestamp out of the column rather than losing the lead", () => {
    const out = parse({ ...valid, submittedAt: "not a date" });
    expect("lead" in out && out.lead.submittedAt).toBeNull();
  });

  it("falls back to a known source rather than storing junk", () => {
    const out = parse({ ...valid, source: "x".repeat(200) });
    expect("lead" in out && out.lead.source).toBe("unknown");
  });
});
