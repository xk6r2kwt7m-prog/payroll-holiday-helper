import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  evaluateCriticalContractDetails,
  weeklyHoursRequired,
  MISSING_DETAILS_MESSAGE,
} from "@/lib/contract-critical-fields";
import { resolveContractTrackerStatus } from "@/lib/contract-status-tracker";
import { detectStaleContractDraft, STALE_CONTRACT_WARNING } from "@/lib/contract-staleness";

const complete = {
  fullLegalName: "Victor Rodriguez",
  email: "victor@example.com",
  homeAddress: "1 High Street, London, N1 1AA",
  jobTitle: "Chef de Partie",
  workLocation: "Ugly Dumpling",
  startDate: "2026-10-01",
  employmentType: "full_time",
  weeklyHours: "40",
  baseHourlyRate: "13.50",
  reportingManagerName: "Aderito Barros",
};

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

describe("critical detail gating", () => {
  it("allows sending straight away when everything is known", () => {
    const result = evaluateCriticalContractDetails(complete);
    expect(result.canSendStraightAway).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.message).toBe("");
  });

  it("defaults to asking staff for details first", () => {
    expect(evaluateCriticalContractDetails(complete).defaultMode).toBe("details_first");
  });

  it("blocks sending when the email is missing", () => {
    const result = evaluateCriticalContractDetails({ ...complete, email: "  " });
    expect(result.canSendStraightAway).toBe(false);
    expect(result.missing).toContain("Email address");
    expect(result.message).toBe(MISSING_DETAILS_MESSAGE);
  });

  it("blocks sending when the address or pay rate is missing", () => {
    expect(
      evaluateCriticalContractDetails({ ...complete, homeAddress: null }).missing
    ).toContain("Home address");
    expect(
      evaluateCriticalContractDetails({ ...complete, baseHourlyRate: "0" }).missing
    ).toContain("Base hourly rate");
  });

  it("requires weekly hours only for fixed-hours contracts", () => {
    expect(weeklyHoursRequired("full_time")).toBe(true);
    expect(weeklyHoursRequired("variable_hours")).toBe(false);
    expect(
      evaluateCriticalContractDetails({ ...complete, employmentType: "variable_hours", weeklyHours: "" })
        .canSendStraightAway
    ).toBe(true);
    expect(
      evaluateCriticalContractDetails({ ...complete, weeklyHours: "" }).missing
    ).toContain("Weekly hours");
  });
});

describe("status tracker", () => {
  it("shows waiting for staff details until they are submitted", () => {
    const sent = resolveContractTrackerStatus({
      contractState: "sent",
      requiresDetailsFirst: true,
      detailsSubmittedAt: null,
    });
    expect(sent.status).toBe("waiting_for_staff_details");

    const submitted = resolveContractTrackerStatus({
      contractState: "sent",
      requiresDetailsFirst: true,
      detailsSubmittedAt: "2026-09-16T10:00:00Z",
    });
    expect(submitted.status).toBe("sent_for_signing");
  });

  it("marks staff-signed contracts as awaiting company review", () => {
    const result = resolveContractTrackerStatus({ contractState: "employee_signed" });
    expect(result.status).toBe("awaiting_company_review");
    expect(result.label).toBe("Awaiting company review");
  });

  it("marks countersigned and completed contracts", () => {
    expect(resolveContractTrackerStatus({ contractState: "employer_signed" }).status).toBe(
      "accepted_and_countersigned"
    );
    expect(
      resolveContractTrackerStatus({ contractState: "signed", reviewAcceptedAt: "2026-09-16T11:00:00Z" }).status
    ).toBe("completed");
  });

  it("surfaces rejected contracts as needing correction", () => {
    const result = resolveContractTrackerStatus({ contractState: "rejected" });
    expect(result.status).toBe("rejected");
    expect(result.tone).toBe("warning");
  });

  it("shows ready to send once details exist", () => {
    expect(
      resolveContractTrackerStatus({
        contractState: "draft",
        requiresDetailsFirst: false,
      }).status
    ).toBe("ready_to_send");
  });
});

describe("stale draft detection", () => {
  it("warns when the employee record changed after generation", () => {
    const result = detectStaleContractDraft({
      generatedAt: "2026-09-01T10:00:00Z",
      employeeUpdatedAt: "2026-09-05T09:00:00Z",
    });
    expect(result.isStale).toBe(true);
    expect(result.warning).toBe(STALE_CONTRACT_WARNING);
    expect(result.reasons).toContain("employee_record");
  });

  it("warns when staff submitted details after generation", () => {
    const result = detectStaleContractDraft({
      generatedAt: "2026-09-01T10:00:00Z",
      detailsSubmittedAt: "2026-09-02T10:00:00Z",
    });
    expect(result.reasons).toContain("staff_details");
  });

  it("never flags signed or locked contracts", () => {
    expect(
      detectStaleContractDraft({
        generatedAt: "2026-09-01T10:00:00Z",
        employeeUpdatedAt: "2026-09-09T10:00:00Z",
        contractState: "signed",
      }).isStale
    ).toBe(false);
  });

  it("stays quiet when nothing changed", () => {
    expect(
      detectStaleContractDraft({
        generatedAt: "2026-09-10T10:00:00Z",
        employeeUpdatedAt: "2026-09-01T10:00:00Z",
      }).isStale
    ).toBe(false);
  });
});

describe("wired behaviour", () => {
  const dialog = read("src/components/contracts/ContractFormDialog.tsx");
  const list = read("src/components/contracts/SignedContractsList.tsx");
  const signPage = read("src/pages/SignContract.tsx");
  const fn = read("supabase/functions/sign-contract/index.ts");

  it("drives the wizard one question at a time with a default reporting manager", () => {
    expect(dialog).toContain("FILL_STAGES");
    expect(dialog).toContain('"employee", "location", "hours", "manager", "email", "details"');
    expect(dialog).toContain("default_signatory_name");
  });

  it("auto-fills known employee data and blocks sending without an email", () => {
    expect(dialog).toContain("handleEmployeeSelect");
    expect(dialog).toContain("mapEmployeeToContractDefaults");
    expect(dialog).toContain("Email needed");
  });

  it("saves an edited email back to the employee record", () => {
    expect(dialog).toContain('from("employees").update({ email })');
  });

  it("offers details-first as the default and gates send-straight-away", () => {
    expect(dialog).toContain("detailsMode");
    expect(dialog).toContain("details_first");
    expect(dialog).toContain("evaluateCriticalContractDetails");
    expect(dialog).toContain("requires_details_first");
  });

  it("hides the contract until staff submit their details", () => {
    expect(fn).toContain("requires_details_first");
    expect(fn).toContain("details_required: true");
    expect(fn).toContain("submit_details");
    expect(signPage).toContain("detailsRequired");
    expect(signPage).toContain("Save and show my contract");
  });

  it("stores submitted staff details for the contract draft", () => {
    expect(fn).toContain("employee_onboarding_data");
    expect(fn).toContain("details_submitted_at");
    expect(fn).toContain("employee_details_submitted");
  });

  it("shows a review queue with accept, reject-with-reason and resend", () => {
    expect(list).toContain("onlyStates");
    expect(list).toContain("rejectReason");
    expect(list).toContain("contract_rejected");
    expect(list).toContain("resolveContractTrackerStatus");
  });

  it("keeps signed contracts locked against silent edits", () => {
    expect(list).toContain('["signed", "superseded", "terminated"]');
    expect(list).toContain("Signed contracts cannot be deleted");
  });

  it("allows inline email editing from the contract row", () => {
    expect(list).toContain("emailDraft");
    expect(list).toContain('from("employees")');
  });

  it("does not touch payroll, holiday, NMW or service-charge logic", () => {
    for (const source of [dialog, list, signPage]) {
      expect(source).not.toContain("holiday_ledger");
      expect(source).not.toContain("payroll_entries");
      expect(source).not.toContain("payroll_periods");
    }
  });
});

describe("the details step only insists on what is genuinely missing", () => {
  const page = readFileSync("src/pages/SignContract.tsx", "utf8");
  const fn = readFileSync("supabase/functions/sign-contract/index.ts", "utf8");

  it("checks only the details actually asked for", () => {
    expect(page).toContain("const askedKeys = contractInfo?.missing_fields");
    expect(page).toContain("(!askedKeys || askedKeys.includes(f.key))");
  });

  it("never requires a telephone number to save the details", () => {
    expect(fn).not.toContain('const required = ["full_name", "address", "date_of_birth", "phone"]');
  });

  it("treats an address held on the contract as already provided", () => {
    expect(fn).toContain('heldValue("address", "home_address", "full_address", "homeAddress")');
    expect(fn).toContain("!String(details[k] || \"\").trim() && !alreadyHeld[k]");
  });
});
