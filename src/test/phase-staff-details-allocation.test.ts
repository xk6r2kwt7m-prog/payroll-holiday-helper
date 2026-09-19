import { describe, it, expect } from "vitest";
import { allocateStaffDetails, buildContactAliases } from "@/lib/staff-details-allocation";

describe("allocateStaffDetails", () => {
  it("fills empty fields automatically", () => {
    const r = allocateStaffDetails(
      { ni_number: "QQ123456C", nationality: "British" },
      { ni_number: null, nationality: "" },
    );
    expect(r.updates).toEqual({ ni_number: "QQ123456C", nationality: "British" });
    expect(r.conflicts).toEqual([]);
    expect(r.filled.map((f) => f.field).sort()).toEqual(["nationality", "ni_number"]);
  });

  it("never overwrites a critical value that differs", () => {
    const r = allocateStaffDetails(
      { ni_number: "QQ999999C", sort_code: "11-22-33", date_of_birth: "1990-01-01" },
      { ni_number: "QQ123456C", sort_code: "00-00-00", date_of_birth: "1991-05-02" },
    );
    expect(r.updates).toEqual({});
    expect(r.conflicts.map((c) => c.field).sort()).toEqual(["date_of_birth", "ni_number"]);
    expect(r.conflicts[0].current).toBeTruthy();
    // Bank details always wait for an administrator to confirm them directly.
    expect(r.held.map((h) => h.field)).toEqual(["sort_code"]);
  });

  it("updates descriptive fields when they differ", () => {
    const r = allocateStaffDetails({ nationality: "Irish", preferred_name: "Sam" }, {
      nationality: "British",
      preferred_name: "Samuel",
    });
    expect(r.updates).toEqual({ nationality: "Irish", preferred_name: "Sam" });
    expect(r.conflicts).toEqual([]);
  });

  it("ignores spacing, case and dash noise", () => {
    const r = allocateStaffDetails({ ni_number: "qq 12 34 56 c", sort_code: "112233" }, {
      ni_number: "QQ123456C",
      sort_code: "11-22-33",
    });
    expect(r.updates).toEqual({});
    expect(r.conflicts).toEqual([]);
  });

  it("skips blank answers and does not mutate inputs", () => {
    const candidates = { ni_number: "  ", email: null };
    const existing = { ni_number: "QQ1", email: "a@b.com" };
    const snap = JSON.stringify({ candidates, existing });
    const r = allocateStaffDetails(candidates, existing);
    expect(r.updates).toEqual({});
    expect(r.conflicts).toEqual([]);
    expect(JSON.stringify({ candidates, existing })).toBe(snap);
  });
});

describe("buildContactAliases", () => {
  it("writes every address key shape the app reads", () => {
    const a = buildContactAliases({ line1: "1 High St", city: "London", postcode: "E1 1AA", phone: "07000 000000" });
    expect(a.address).toBe("1 High St, London, E1 1AA");
    expect(a.home_address).toBe(a.address);
    expect(a.address_line_1).toBe("1 High St");
    expect(a.address_line1).toBe("1 High St");
    expect(a.post_code).toBe("E1 1AA");
    expect(a.mobile).toBe("07000 000000");
    expect(a.phone_number).toBe("07000 000000");
  });

  it("returns nulls when nothing was supplied", () => {
    const a = buildContactAliases({});
    expect(a.address).toBeNull();
    expect(a.phone).toBeNull();
  });
});

describe("safety", () => {
  it("the edge function uses an identical copy of the rules", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/lib/staff-details-allocation.ts", "utf8");
    const fn = await fs.readFile("supabase/functions/staff-details-portal/allocation.ts", "utf8");
    expect(fn).toBe(src);
  });

  it("the rules module is pure", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/lib/staff-details-allocation.ts", "utf8");
    expect(src).not.toMatch(/@\/integrations\/supabase/);
    expect(src).not.toMatch(/from\s+["']react["']/);
  });
});
