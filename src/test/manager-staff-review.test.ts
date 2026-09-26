import { describe, expect, it } from "vitest";
import { isManagerReviewable, MANAGER_REVIEW_FIELDS } from "@/components/employees/ManagerStaffChangesReview";
import { readFileSync } from "node:fs";

const base = { state: "pending" as const, needs_review: true, sensitive: false };
describe("manager review of ordinary staff details", () => {
  it("offers ordinary fields only", () => {
    expect(isManagerReviewable({ ...base, field_name: "forename" })).toBe(true);
    for (const f of ["bank_account_no", "sort_code", "ni_number", "passport_no", "sharing_code", "date_of_birth", "settlement_status"])
      expect(isManagerReviewable({ ...base, field_name: f })).toBe(false);
  });
  it("never offers a protected row even if its field looks ordinary", () => {
    expect(isManagerReviewable({ ...base, sensitive: true, field_name: "email" })).toBe(false);
  });
  it("skips decided or informational rows", () => {
    expect(isManagerReviewable({ ...base, state: "accepted", field_name: "email" })).toBe(false);
    expect(isManagerReviewable({ ...base, needs_review: false, field_name: "email" })).toBe(false);
  });
  it("matches the server's manager field list", () => {
    const sql = readFileSync("supabase/pending-migrations/20260926110500_manager_ordinary_staff_review.proposed.sql", "utf8");
    const list = sql.match(/c\.field_name NOT IN \(([^)]*)\)/)![1].replace(/'/g, "").split(",");
    expect(list).toEqual([...MANAGER_REVIEW_FIELDS]);
  });
});
