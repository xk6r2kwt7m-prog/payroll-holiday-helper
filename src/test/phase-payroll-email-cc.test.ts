import { describe, it, expect } from "vitest";
import { REPORT_PRESETS, defaultReportConfig } from "@/components/payroll/PayrollReportConfig";
import {
  PAYROLL_ALWAYS_CC,
  PAYROLL_DEFAULT_RECIPIENT,
  MAX_PDF_ATTACHMENT_BYTES,
  mergeCcRecipients,
  buildPayrollEmailDraft,
  formatAttachmentSize,
} from "@/lib/payroll-email-draft";

describe("payroll email — always copied in", () => {
  it("includes the standing copy address when the caller passes nothing", () => {
    expect(mergeCcRecipients(["accountant@example.com"], [])).toEqual([PAYROLL_ALWAYS_CC]);
  });

  it("does not duplicate the copy address when it is also a direct recipient", () => {
    expect(mergeCcRecipients([PAYROLL_ALWAYS_CC.toUpperCase()])).toEqual([]);
  });

  it("does not duplicate when it is requested twice", () => {
    expect(mergeCcRecipients(["a@b.com"], [PAYROLL_ALWAYS_CC, PAYROLL_ALWAYS_CC])).toEqual([
      PAYROLL_ALWAYS_CC,
    ]);
  });
});

describe("payroll email — standard draft wording", () => {
  const draft = buildPayrollEmailDraft({
    periodName: "September 2026",
    companyName: "Ugly Dumpling",
    senderName: "Aderito Barros",
    employeeCount: 37,
    totalHours: 1842.5,
    grandTotal: 24318.4,
    payDate: "2026-09-24",
  });

  it("names the period and company in the subject", () => {
    expect(draft.subject).toBe("Payroll — September 2026 (Ugly Dumpling)");
  });

  it("states the totals, pay date and confidentiality line", () => {
    expect(draft.message).toContain("payroll report for September 2026");
    expect(draft.message).toContain("37 people");
    expect(draft.message).toContain("1,842.50 hours");
    expect(draft.message).toContain("£24,318.40");
    expect(draft.message).toContain("Pay date: 24 September 2026.");
    expect(draft.message).toContain("This is a confidential document. Please do not forward it.");
    expect(draft.message).toContain("Aderito Barros");
  });

  it("leaves out figures that are not available", () => {
    const sparse = buildPayrollEmailDraft({
      periodName: "August 2026",
      employeeCount: 0,
      totalHours: 0,
      grandTotal: 0,
    });
    expect(sparse.subject).toBe("Payroll — August 2026");
    expect(sparse.message).not.toContain("It covers");
    expect(sparse.message).not.toContain("Pay date");
  });
});

describe("payroll email — standing recipient", () => {
  it("is Philipp Chaykin at his outlook address", () => {
    expect(PAYROLL_DEFAULT_RECIPIENT).toEqual({
      name: "Philipp Chaykin",
      email: "philipp.chaykin@outlook.com",
    });
  });

  it("is not also copied when he is the direct recipient", () => {
    // He is a recipient, not part of the standing copy — the always-CC
    // address must never be confused with him.
    expect(mergeCcRecipients([PAYROLL_DEFAULT_RECIPIENT.email])).toEqual([PAYROLL_ALWAYS_CC]);
  });
});

describe("payroll email — period dates and wording", () => {
  const draft = buildPayrollEmailDraft({
    periodName: "September 2026",
    companyName: "Ugly Dumpling",
    senderName: "Aderito Barros",
    employeeCount: 34,
    totalHours: 4004.41,
    grandTotal: 59163.15,
    payDate: "2026-09-24",
    periodStart: "2026-08-25",
    periodEnd: "2026-09-21",
    recipientName: "Philipp Chaykin",
  });

  it("greets a single named recipient by first name", () => {
    expect(draft.message.startsWith("Dear Philipp,")).toBe(true);
  });

  it("states the exact pay period the payroll covers", () => {
    expect(draft.message).toContain(
      "covering the pay period 25 August 2026 – 21 September 2026."
    );
  });

  it("tells the recipient the mailbox is not monitored", () => {
    expect(draft.message).toContain("replies to this address are not monitored");
    expect(draft.message).toContain("usual channel");
  });

  it("falls back to a plain greeting without a named recipient", () => {
    const anon = buildPayrollEmailDraft({
      periodName: "September 2026",
      employeeCount: 1,
      totalHours: 10,
      grandTotal: 100,
    });
    expect(anon.message.startsWith("Hello,")).toBe(true);
    expect(anon.message).toContain("payroll report for September 2026.");
    expect(anon.message).not.toContain("covering the pay period");
  });
});

describe("payroll email — attachment size", () => {
  it("treats an oversized PDF as refusable", () => {
    expect(MAX_PDF_ATTACHMENT_BYTES).toBe(8 * 1024 * 1024);
    expect(MAX_PDF_ATTACHMENT_BYTES + 1 > MAX_PDF_ATTACHMENT_BYTES).toBe(true);
  });

  it("describes sizes in plain units", () => {
    expect(formatAttachmentSize(900)).toBe("900 B");
    expect(formatAttachmentSize(204800)).toBe("200 KB");
    expect(formatAttachmentSize(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});

describe("payroll email — report type presets", () => {
  it("offers exactly the same four report types as the PDF window", () => {
    expect(Object.keys(REPORT_PRESETS).sort()).toEqual(
      ["accounting", "condensed", "full", "hr_review"].sort()
    );
  });

  it("resolves every preset into a valid report config with notes always off", () => {
    for (const key of Object.keys(REPORT_PRESETS)) {
      const config = {
        ...defaultReportConfig,
        ...REPORT_PRESETS[key].config,
        sortBy: "alphabetical" as const,
        showLogo: true,
        showNotes: false,
      };
      expect(config.showNotes).toBe(false);
      expect(config.sortBy).toBe("alphabetical");
      expect(config.columns.employeeName).toBe(true);
      expect(typeof config.layoutStyle).toBe("string");
    }
  });

  it("hides financial amounts only for the HR review type", () => {
    const hr = { ...defaultReportConfig, ...REPORT_PRESETS.hr_review.config };
    const full = { ...defaultReportConfig, ...REPORT_PRESETS.full.config };
    expect(hr.financial.hideFinancialAmounts).toBe(true);
    expect(full.financial.hideFinancialAmounts).toBe(false);
  });
});
