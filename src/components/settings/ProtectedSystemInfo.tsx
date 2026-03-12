import { ShieldCheck, Lock, Database, Calculator, FileCheck } from "lucide-react";
import { ProtectedBadge } from "./ProtectedBadge";

const PROTECTED_ITEMS = [
  {
    icon: Calculator,
    label: "Payroll Calculation Engine",
    description: "Core pay calculations, total pay formulas, overtime logic, and accrual triggers",
  },
  {
    icon: Calculator,
    label: "Holiday Accrual Engine",
    description: "12.07% statutory accrual rate, carry-over limits, and leave year calculations",
  },
  {
    icon: Database,
    label: "Holiday Ledger Engine",
    description: "Double-entry ledger integrity, balance reconciliation, and audit trail",
  },
  {
    icon: Lock,
    label: "Row-Level Security",
    description: "Tenant isolation, data access policies, and cross-company data protection",
  },
  {
    icon: ShieldCheck,
    label: "Audit Log Integrity",
    description: "Immutable audit records, compliance logging, and evidence traceability",
  },
  {
    icon: FileCheck,
    label: "Closed Period Protection",
    description: "Approved payroll periods are read-only and cannot be recalculated",
  },
  {
    icon: Lock,
    label: "Platform Architecture",
    description: "Multi-tenant isolation, schema structure, and platform-wide system rules",
  },
];

export function ProtectedSystemInfo() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-destructive/5 border border-destructive/10 p-3">
        <p className="text-xs text-foreground font-medium mb-1">Protected Core Logic</p>
        <p className="text-[11px] text-muted-foreground">
          These system components are fundamental to data integrity, compliance, and security. They cannot be modified by any company admin and are managed exclusively at the platform level.
        </p>
      </div>

      <div className="space-y-1.5">
        {PROTECTED_ITEMS.map((item) => (
          <div
            key={item.label}
            className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/5 shrink-0">
              <item.icon className="h-4 w-4 text-destructive/70" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <ProtectedBadge />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
