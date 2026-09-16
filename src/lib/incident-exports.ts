/**
 * Register exports for the incident book.
 *
 * Pure builders — restricted personal and medical records are stripped from
 * general registers here, so no export can leak them by accident.
 */

import { categoryLabel, isRestricted, statusLabel } from "@/lib/incident-categories";

export interface ExportableIncident {
  report_number?: string | null;
  branch?: string | null;
  category: string;
  incident_date?: string | null;
  incident_time?: string | null;
  location_detail?: string | null;
  description?: string | null;
  status?: string | null;
  confidentiality?: string | null;
  people_involved?: string | null;
  submitted_at?: string | null;
  details?: Record<string, any> | null;
  action_deadline?: string | null;
  responsible_person?: string | null;
  [key: string]: any;
}

export type RegisterKind =
  | "branch"
  | "date_range"
  | "alcohol_refusals"
  | "open_investigations"
  | "overdue_actions"
  | "authority_visits"
  | "cctv_faults";

export const REGISTER_KINDS: { value: RegisterKind; label: string }[] = [
  { value: "branch", label: "Branch register" },
  { value: "date_range", label: "Register for a date range" },
  { value: "alcohol_refusals", label: "Alcohol refusals register" },
  { value: "open_investigations", label: "Open investigations" },
  { value: "overdue_actions", label: "Overdue actions" },
  { value: "authority_visits", label: "Authority and emergency service visits" },
  { value: "cctv_faults", label: "CCTV faults" },
];

const REFUSAL_CATEGORIES = ["alcohol_refusal", "underage_sale", "intoxicated_customer"];
const VISIT_CATEGORIES = ["police_visit", "authority_visit", "ambulance_attendance", "fire_service_attendance"];

export function filterRegister(
  rows: ExportableIncident[],
  kind: RegisterKind,
  opts?: { branch?: string; from?: string; to?: string; today?: string }
): ExportableIncident[] {
  const today = opts?.today ?? new Date().toISOString().slice(0, 10);
  let out = rows.filter((r) => r.status !== "draft");
  switch (kind) {
    case "branch":
      if (opts?.branch) out = out.filter((r) => r.branch === opts.branch);
      break;
    case "date_range":
      if (opts?.from) out = out.filter((r) => (r.incident_date ?? "") >= opts.from!);
      if (opts?.to) out = out.filter((r) => (r.incident_date ?? "") <= opts.to!);
      break;
    case "alcohol_refusals":
      out = out.filter((r) => REFUSAL_CATEGORIES.includes(r.category));
      break;
    case "open_investigations":
      out = out.filter((r) => r.status !== "closed");
      break;
    case "overdue_actions":
      out = out.filter((r) => !!r.action_deadline && r.action_deadline < today && r.status !== "closed");
      break;
    case "authority_visits":
      out = out.filter((r) => VISIT_CATEGORIES.includes(r.category));
      break;
    case "cctv_faults":
      out = out.filter((r) => r.category === "cctv_fault");
      break;
  }
  return out;
}

/** Rows for a general register: restricted records appear without personal detail. */
export function registerRows(rows: ExportableIncident[]) {
  return rows.map((r) => {
    const restricted = isRestricted(r.confidentiality);
    return {
      "Report number": r.report_number ?? "",
      Branch: r.branch ?? "",
      Date: r.incident_date ?? "",
      Time: r.incident_time ?? "",
      Category: categoryLabel(r.category),
      Location: r.location_detail ?? "",
      "People involved": restricted ? "Withheld — restricted record" : r.people_involved ?? "",
      "What happened": restricted ? "Withheld — restricted record" : (r.description ?? "").replace(/\s+/g, " "),
      Status: statusLabel(r.status),
      Confidentiality: restricted ? "Restricted" : "Standard",
      Submitted: r.submitted_at ? r.submitted_at.slice(0, 16).replace("T", " ") : "",
      Responsible: r.responsible_person ?? "",
      "Action deadline": r.action_deadline ?? "",
    };
  });
}

function escapeCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escapeCell(r[h])).join(",")),
  ].join("\n");
}

export function registerCsv(
  rows: ExportableIncident[],
  kind: RegisterKind,
  opts?: { branch?: string; from?: string; to?: string; today?: string }
): string {
  return toCsv(registerRows(filterRegister(rows, kind, opts)));
}

export function registerFileName(kind: RegisterKind, opts?: { branch?: string }): string {
  const label = REGISTER_KINDS.find((k) => k.value === kind)?.label ?? "register";
  const branch = opts?.branch ? `-${opts.branch}` : "";
  return `incident-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}${branch}-${new Date()
    .toISOString().slice(0, 10)}.csv`;
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
