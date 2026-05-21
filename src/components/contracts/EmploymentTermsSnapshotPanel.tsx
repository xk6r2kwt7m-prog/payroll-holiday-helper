import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import type { EmploymentTerms } from "@/lib/employment-terms";

interface Props {
  employeeId: string;
  rootContractId?: string | null;
}

/**
 * Read-only timeline of employment terms snapshots for an employee.
 * Shows active / scheduled / superseded rows linked to contract versions.
 * Does NOT allow editing — Phase 2A only.
 */
export function EmploymentTermsSnapshotPanel({ employeeId, rootContractId }: Props) {
  const { tenantId } = useTenant();
  const { data: rows, isLoading } = useQuery({
    queryKey: ["employee_contract_terms", tenantId, employeeId, rootContractId ?? null],
    enabled: !!tenantId && !!employeeId,
    queryFn: async () => {
      if (!tenantId) return [];
      let q = supabase
        .from("employee_contract_terms")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("employee_id", employeeId)
        .order("effective_from", { ascending: false });
      if (rootContractId) q = q.or(`root_contract_id.eq.${rootContractId},contract_id.eq.${rootContractId}`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as EmploymentTerms[];
    },
  });

  if (isLoading) return <Skeleton className="h-20 w-full" />;
  if (!rows?.length) {
    return <p className="text-xs text-muted-foreground">No structured employment terms recorded yet.</p>;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Employment terms snapshots</h4>
      <p className="text-xs text-muted-foreground">
        Structured operational terms recorded from signed contracts and amendments.
        These do not yet drive payroll or rota calculations.
      </p>
      <ol className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="rounded-md border bg-card p-3 text-xs space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">v{r.version_number}</span>
                <StatusBadge status={r.status} />
                {r.source_type === "backfill_from_employee_profile" && (
                  <Badge variant="outline" className="text-[10px]">
                    Backfill (no signed contract)
                  </Badge>
                )}
              </div>
              <span className="text-muted-foreground">
                {r.effective_from ? format(new Date(r.effective_from), "d MMM yyyy") : "—"}
                {r.effective_to ? ` → ${format(new Date(r.effective_to), "d MMM yyyy")}` : ""}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
              <Field label="Hourly rate" value={fmtMoney(r.hourly_rate)} />
              <Field label="Annual salary" value={fmtMoney(r.annual_salary)} />
              <Field label="Pay type" value={r.pay_type ?? "—"} />
              <Field label="Contracted hrs" value={r.contracted_hours ?? "—"} />
              <Field label="Department" value={r.department ?? "—"} />
              <Field label="Role" value={r.role_title ?? "—"} />
              <Field label="Location" value={r.work_location ?? "—"} />
              <Field label="Employment type" value={r.employment_type ?? "—"} />
            </dl>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    active: "default",
    scheduled: "secondary",
    superseded: "outline",
    terminated: "destructive",
    draft: "outline",
  };
  return (
    <Badge variant={variant[status] ?? "outline"} className="text-[10px] capitalize">
      {status}
    </Badge>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-1">
      <dt className="text-[10px] uppercase tracking-wide">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}

function fmtMoney(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return `£${Number(v).toFixed(2)}`;
}
