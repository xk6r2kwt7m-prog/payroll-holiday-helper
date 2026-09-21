/**
 * Payroll email drafting helpers.
 *
 * The standard wording and the always-copied address live here so the dialog,
 * the preview and the tests all use exactly the same values. Changing the
 * copied-in address is a deliberate one-line edit — it is never derived from
 * user input or altered automatically.
 */

/** Every payroll email is always copied to this address. */
export const PAYROLL_ALWAYS_CC = "barros.aderito@hotmail.com";

/** Providers reject very large attachments; refuse before sending instead. */
export const MAX_PDF_ATTACHMENT_BYTES = 8 * 1024 * 1024;

export function mergeCcRecipients(recipients: string[], cc: string[] = [PAYROLL_ALWAYS_CC]): string[] {
  const normalisedTo = new Set(recipients.map((r) => r.trim().toLowerCase()).filter(Boolean));
  const out: string[] = [];
  for (const address of [...cc, PAYROLL_ALWAYS_CC]) {
    const email = address?.trim().toLowerCase();
    if (!email) continue;
    if (normalisedTo.has(email)) continue; // already a direct recipient
    if (out.includes(email)) continue;
    out.push(email);
  }
  return out;
}

export interface PayrollDraftInput {
  periodName: string;
  companyName?: string | null;
  senderName?: string | null;
  employeeCount: number;
  totalHours: number;
  grandTotal: number;
  payDate?: string | null;
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function formatNumber(value: number, dp = 2): string {
  return value.toLocaleString("en-GB", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

export function buildPayrollEmailSubject(input: PayrollDraftInput): string {
  const company = input.companyName?.trim();
  return company
    ? `Payroll — ${input.periodName} (${company})`
    : `Payroll — ${input.periodName}`;
}

export function buildPayrollEmailMessage(input: PayrollDraftInput): string {
  const lines: string[] = ["Hello,", "", `Please find attached the payroll report for ${input.periodName}.`, ""];

  const figures: string[] = [];
  if (input.employeeCount > 0) {
    figures.push(`${input.employeeCount} ${input.employeeCount === 1 ? "person" : "people"}`);
  }
  if (input.totalHours > 0) figures.push(`${formatNumber(input.totalHours)} hours`);
  if (input.grandTotal > 0) figures.push(`a total of £${formatNumber(input.grandTotal)}`);
  if (figures.length) lines.push(`It covers ${figures.join(", ")}.`);

  const payDate = formatDate(input.payDate);
  if (payDate) lines.push(`Pay date: ${payDate}.`);
  if (figures.length || payDate) lines.push("");

  lines.push("This is a confidential document. Please do not forward it.", "");
  if (input.senderName?.trim()) lines.push(input.senderName.trim());
  if (input.companyName?.trim()) lines.push(input.companyName.trim());

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}

export function buildPayrollEmailDraft(input: PayrollDraftInput): { subject: string; message: string } {
  return {
    subject: buildPayrollEmailSubject(input),
    message: buildPayrollEmailMessage(input),
  };
}

export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
