import { describe, it, expect } from "vitest";
import { findPossibleDuplicates, duplicateWarningMessage, loose } from "@/lib/duplicate-check";

const existing = [
  { id: "1", forename: "Sandy", surname: "Tsai", email: "ssjhsandy@gmail.com", user_id: "u1", status: "onboarding" },
  { id: "2", forename: "Wing", surname: "Lee", email: "wing@example.com", ni_number: "QQ 12 34 56 C", status: "active" },
  { id: "3", forename: "Old", surname: "Starter", email: null, status: "leaver", archived_at: "2026-01-01" },
];

describe("duplicate entry detection", () => {
  it("normalises spacing, case and dashes", () => {
    expect(loose(" QQ-12 34.56 c ")).toBe("qq123456c");
  });

  it("flags a repeated email", () => {
    const m = findPossibleDuplicates({ forename: "Hsin Yu", surname: "Tsai", email: "SSJHSandy@gmail.com " }, existing);
    expect(m[0].record.id).toBe("1");
    expect(m[0].reasons).toContain("email");
    expect(m[0].linkedToAccount).toBe(true);
  });

  it("flags a repeated full name", () => {
    const m = findPossibleDuplicates({ forename: "wing", surname: " lee" }, existing);
    expect(m).toHaveLength(1);
    expect(m[0].reasons).toEqual(["name"]);
  });

  it("flags a repeated National Insurance number", () => {
    const m = findPossibleDuplicates({ forename: "Other", surname: "Person", ni_number: "qq123456c" }, existing);
    expect(m[0].reasons).toEqual(["ni_number"]);
  });

  it("includes archived records", () => {
    const m = findPossibleDuplicates({ forename: "Old", surname: "Starter" }, existing);
    expect(m).toHaveLength(1);
    expect(m[0].record.archived_at).toBeTruthy();
  });

  it("ignores the record being edited", () => {
    const m = findPossibleDuplicates({ forename: "Wing", surname: "Lee" }, existing, { excludeId: "2" });
    expect(m).toHaveLength(0);
  });

  it("returns no match for a genuinely new person", () => {
    expect(findPossibleDuplicates({ forename: "Brand", surname: "New", email: "new@example.com" }, existing)).toHaveLength(0);
  });

  it("puts a blocking email clash first, then account-linked records", () => {
    const m = findPossibleDuplicates({ forename: "Sandy", surname: "Tsai", email: "wing@example.com" }, existing);
    // record 2 holds that email and is still current, so it must be dealt with first
    expect(m[0].record.id).toBe("2");
    expect(m[0].blocking).toBe(true);
    expect(m[1].record.id).toBe("1");
  });

  it("writes a plain-English warning and never blocks", () => {
    const m = findPossibleDuplicates({ forename: "Sandy", surname: "Tsai", email: "ssjhsandy@gmail.com" }, existing);
    const msg = duplicateWarningMessage(m)!;
    expect(msg).toContain("Sandy Tsai");
    expect(msg).toContain("the same email address");
    expect(msg).toContain("sign-in");
    expect(duplicateWarningMessage([])).toBeNull();
  });
});
