import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  RTW_BASIS_OPTIONS,
  RTW_DOCUMENT_TYPES,
  rtwBasisNeedsExpiry,
  rtwDocumentFiledAs,
} from "@/lib/info-request-items";
import { evaluateContractAutoDraft } from "@/lib/contract-auto-draft";

const portal = readFileSync("src/pages/StaffDetailsPortal.tsx", "utf8");
const notify = readFileSync("supabase/functions/send-notification/index.ts", "utf8");
const server = readFileSync("supabase/functions/staff-details-portal/index.ts", "utf8");
const shared = readFileSync("supabase/functions/_shared/info-request-items.ts", "utf8");
const review = readFileSync("src/components/employees/StaffChangesReview.tsx", "utf8");

describe("staff emails never invite a reply", () => {
  it("has dropped the reply invitation from the contract email", () => {
    expect(notify).not.toContain("just reply to this email");
  });

  it("tells staff not to reply, in the body as well as the footer", () => {
    expect(notify).toContain("Please do not reply to this email — it is not monitored");
    expect(notify).toContain("Do not reply to this email.");
  });

  it("uses the same wording on the details request and the signature emails", () => {
    expect(notify.split("${DO_NOT_REPLY}").length - 1).toBeGreaterThanOrEqual(4);
  });
});

describe("bank numbers are hidden while they are typed", () => {
  it("marks the sort code and account number as masked", () => {
    expect(portal).toMatch(/key: "sort_code",[\s\S]{0,120}masked: true/);
    expect(portal).toMatch(/key: "confirm_sort_code",[\s\S]{0,200}masked: true/);
    expect(portal).toMatch(/key: "account_number",[\s\S]{0,120}masked: true/);
    expect(portal).toMatch(/key: "confirm_account_number",[\s\S]{0,200}masked: true/);
  });

  it("still asks twice and still compares the two answers", () => {
    expect(portal).toContain("The two sort codes do not match");
    expect(portal).toContain("The two account numbers do not match");
  });

  it("keeps the payroll security notice exactly as approved", () => {
    expect(portal).toContain(
      "Ugly Dumpling will never ask for your online-banking password, PIN, card security code or verification code.",
    );
  });
});

describe("a held email address is shown partly and cannot be changed", () => {
  it("masks the middle of the address", async () => {
    const { maskEmail } = await import("@/pages/StaffDetailsPortal");
    expect(maskEmail("real.acpb@gmail.com")).toBe("re•••••••@gmail.com");
    expect(maskEmail("")).toBe("");
  });

  it("makes the field read-only and points them at their manager", () => {
    expect(portal).toContain("readOnly: true");
    expect(portal).toContain("please speak to your manager before continuing");
  });

  it("ignores a submitted email when one is already held", () => {
    expect(server).toContain("if (!emp?.email) candidates.email");
  });
});

describe("right to work", () => {
  it("only asks for an expiry date where something actually expires", () => {
    expect(rtwBasisNeedsExpiry("british_irish")).toBe(false);
    expect(rtwBasisNeedsExpiry("settled")).toBe(false);
    expect(rtwBasisNeedsExpiry("pre_settled")).toBe(true);
    expect(rtwBasisNeedsExpiry("visa")).toBe(true);
    expect(rtwBasisNeedsExpiry("other")).toBe(true);
    expect(rtwBasisNeedsExpiry(null)).toBe(false);
  });

  it("offers the supported routes to working in the UK", () => {
    expect(RTW_BASIS_OPTIONS.map((o) => o.value)).toEqual([
      "british_irish",
      "settled",
      "pre_settled",
      "visa",
      "student",
      "ecs_pending",
      "other",
    ]);
  });

  it("lists the acceptable documents and files each one correctly", () => {
    expect(RTW_DOCUMENT_TYPES.length).toBeGreaterThanOrEqual(10);
    expect(rtwDocumentFiledAs("passport")).toBe("passport");
    expect(rtwDocumentFiledAs("brp")).toBe("visa");
    expect(rtwDocumentFiledAs("share_code")).toBe("right_to_work");
    expect(rtwDocumentFiledAs(undefined)).toBe("right_to_work");
  });

  it("asks which document is being sent before a photo can be taken", () => {
    expect(portal).toContain('key: "document_type"');
    expect(portal).toContain("Please choose which document you are sending");
    expect(portal).toContain("docTypeChosen");
  });

  it("refuses a submission with no expiry date when the permission runs out", () => {
    expect(server).toContain("rtw_expiry_required");
    expect(server).toContain("rtwBasisNeedsExpiry");
  });

  it("records the document type and expiry against the file", () => {
    expect(server).toContain("rtwDocumentFiledAs");
    expect(server).toContain("rtw_expires_on");
  });

  it("keeps the page and the server reading the same lists", () => {
    expect(shared).toContain("RTW_DOCUMENT_TYPES");
    expect(shared).toContain("rtwBasisNeedsExpiry");
  });
});

describe("the contract is prepared once everything is approved", () => {
  const approved = [
    { field_name: "forename", field_label: "First name", state: "accepted" as const, needs_review: true },
  ];

  it("is ready when nothing is waiting", () => {
    const r = evaluateContractAutoDraft({ changes: approved, rtwStatus: "verified" });
    expect(r.ready).toBe(true);
    expect(r.outstanding).toEqual([]);
  });

  it("waits for a decision that has not been made", () => {
    const r = evaluateContractAutoDraft({
      changes: [{ field_name: "ni_number", field_label: "National Insurance number", state: "pending", needs_review: true }],
      rtwStatus: "verified",
    });
    expect(r.ready).toBe(false);
    expect(r.outstanding[0]).toContain("waiting for your decision");
  });

  it("waits for bank details to be confirmed directly", () => {
    const r = evaluateContractAutoDraft({
      changes: approved,
      rtwStatus: "verified",
      bankAwaitingDirectConfirmation: true,
    });
    expect(r.ready).toBe(false);
    expect(r.outstanding.join(" ")).toContain("confirming directly with the employee");
  });

  it("waits for an unchecked right to work", () => {
    const r = evaluateContractAutoDraft({ changes: approved, rtwStatus: "submitted" });
    expect(r.ready).toBe(false);
    expect(r.outstanding.join(" ")).toContain("not been checked");
  });

  it("lists missing contract details instead of producing a draft", () => {
    const r = evaluateContractAutoDraft({
      changes: approved,
      rtwStatus: "verified",
      missingContractFields: ["Home address"],
    });
    expect(r.ready).toBe(false);
    expect(r.outstanding).toContain("Home address is still missing");
  });

  it("does not offer to prepare a second contract", () => {
    const r = evaluateContractAutoDraft({ changes: approved, rtwStatus: "verified", hasContract: true });
    expect(r.ready).toBe(false);
  });

  it("produces a draft for review and never sends or signs anything", () => {
    expect(review).toContain("Prepare the contract now");
    expect(review).toContain("nothing is sent or\n                signed until you decide");
    expect(review).not.toContain("send-notification");
  });
});
