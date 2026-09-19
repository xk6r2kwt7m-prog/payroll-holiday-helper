import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  canReissueContract,
  compareContractDetails,
  isSubstantiveChange,
  needsCorrectionRecord,
} from "@/lib/contract-detail-drift";

describe("contract detail comparison", () => {
  it("spots a corrected name", () => {
    const drifts = compareContractDetails(
      { employeeName: "Rheana Rahim" },
      { employeeName: "Rehana Raman" },
    );
    expect(drifts).toHaveLength(1);
    expect(drifts[0].label).toBe("Name");
    expect(drifts[0].onFile).toBe("Rehana Raman");
  });

  it("ignores blanks on file so nothing is invented", () => {
    expect(compareContractDetails({ employeeName: "A B", homeAddress: "1 Road" }, { employeeName: "A B" }))
      .toHaveLength(0);
  });

  it("treats equal numbers and dates as unchanged", () => {
    expect(
      compareContractDetails(
        { weeklyHours: 40 as never, effectiveDate: "2026-01-05T00:00:00Z" },
        { weeklyHours: "40" as never, effectiveDate: "2026-01-05" },
      ),
    ).toHaveLength(0);
  });

  it("only allows reissue while the contract is not final", () => {
    expect(canReissueContract("draft")).toBe(true);
    expect(canReissueContract(null)).toBe(true);
    expect(canReissueContract("signed")).toBe(false);
    expect(canReissueContract("superseded")).toBe(false);
    expect(canReissueContract("terminated")).toBe(false);
  });

  it("routes signed contracts to a dated correction record", () => {
    expect(needsCorrectionRecord("signed")).toBe(true);
    expect(needsCorrectionRecord("draft")).toBe(false);
  });

  it("flags changes of terms as needing a variation, not a correction", () => {
    expect(isSubstantiveChange("baseHourlyRate")).toBe(true);
    expect(isSubstantiveChange("jobTitle")).toBe(true);
    expect(isSubstantiveChange("employeeName")).toBe(false);
  });
});

describe("correction safeguards in source", () => {
  const hook = readFileSync("src/hooks/useContractCorrections.ts", "utf8");

  it("never sends an email on these paths", () => {
    expect(hook).not.toMatch(/send-notification|sendContractEmail|functions\.invoke/);
  });

  it("refuses to reissue a final contract", () => {
    expect(hook).toContain("canReissueContract(state)");
  });

  it("keeps the earlier copy by marking it superseded rather than deleting it", () => {
    expect(hook).toContain('contract_state: "superseded"');
    expect(hook).toContain("superseded_by: newId");
    expect(hook).not.toMatch(/\.delete\(\)/);
  });

  it("keeps the new copy in the same contract chain", () => {
    expect(hook).toContain("root_contract_id: rootId");
    expect(hook).toContain("parent_contract_id: input.contractId");
    expect(hook).toContain("version_number: versionNumber");
  });

  it("records every correction in the audit trail", () => {
    expect(hook).toContain("contract_corrected_and_reissued");
    expect(hook).toContain("contract_correction_recorded");
    expect(hook).toContain("employee_changes");
  });

  it("produces no file when correcting a signed contract", () => {
    const recordSection = hook.slice(hook.indexOf("useRecordContractCorrection"));
    expect(recordSection).not.toContain("storage");
    expect(recordSection).not.toContain("pdf(");
  });
});
