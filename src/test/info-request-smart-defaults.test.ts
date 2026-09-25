import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  computeInfoCoverage,
  allMissingItems,
  missingItems,
  REASKABLE_ITEMS,
} from "@/lib/info-request-coverage";

const single = readFileSync("src/components/employees/RequestStaffDetailsDialog.tsx", "utf8");
const bulk = readFileSync("src/components/employees/BulkRequestInfoDialog.tsx", "utf8");

const employee = {
  forename: "Maria",
  surname: "Silva",
  email: "maria@example.com",
  date_of_birth: "1990-01-01",
  has_ni_number: true,
  nationality: "Portuguese",
  passport_no: null,
  residence_permit: null,
  sharing_code: null,
  sort_code: null,
  bank_account_no: null,
} as any;

const onboarding = {
  personal_info: { address: "1 Test Street, London", phone: "07700900000" },
  bank_details: null,
  emergency_contact: null,
} as any;

describe("what the system already holds", () => {
  const coverage = computeInfoCoverage(employee, onboarding);

  it("counts details we hold as on file", () => {
    expect(coverage.legal_name).toBe(true);
    expect(coverage.address).toBe(true);
    expect(coverage.phone).toBe(true);
    expect(coverage.ni_number).toBe(true);
  });

  it("counts genuinely absent details as missing", () => {
    expect(coverage.bank).toBe(false);
    expect(coverage.emergency).toBe(false);
    expect(allMissingItems(coverage)).toContain("bank");
    expect(allMissingItems(coverage)).not.toContain("address");
  });

  it("treats placeholder text as not held", () => {
    const c = computeInfoCoverage(employee, {
      personal_info: { address: "n/a", phone: "  " },
    } as any);
    expect(c.address).toBe(false);
    expect(c.phone).toBe(false);
  });

  it("narrows a chosen set down to what is missing", () => {
    expect(missingItems(["address", "phone", "bank"], coverage)).toEqual(["bank"]);
  });

  it("keeps right to work items askable because they expire", () => {
    expect(REASKABLE_ITEMS).toEqual(["passport", "visa", "share_code"]);
  });
});

describe("single request asks only for what is missing", () => {
  it("starts from the missing items rather than nothing", () => {
    expect(single).toMatch(/setSelected\(missingKeys\)/);
  });

  it("labels details already held", () => {
    expect(single).toContain("already on file");
    expect(single).toContain("on file — may expire");
  });

  it("trims presets to the missing items", () => {
    expect(single).toMatch(/missingItems\(items, coverage\)/);
  });

  it("says nothing more is needed when the record is complete", () => {
    expect(single).toContain("Nothing further needs requesting on this list");
  });

  it("lets the administrator still tick anything", () => {
    expect(single).toMatch(/setTouched\(true\)/);
  });
});

describe("bulk request is tailored per person", () => {
  it("offers the only-what-is-missing control, on by default", () => {
    expect(bulk).toMatch(/useState\(true\)/);
    expect(bulk).toContain("Only ask each person for what we don't already hold");
  });

  it("uses each person's own record", () => {
    expect(bulk).toMatch(/useBulkInfoCoverage/);
    expect(bulk).toMatch(/missingItems\(selected, cover\)/);
  });

  it("leaves out people whose records already cover everything", () => {
    expect(bulk).toContain("Not asked, because we already hold everything ticked for them");
  });

  it("still lists every recipient before anything is sent", () => {
    expect(bulk).toContain("bulk-confirm-list");
  });
});
