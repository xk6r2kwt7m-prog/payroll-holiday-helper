import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertTriangle, Check, X } from "lucide-react";
import type { StaffDetailConflict } from "@/lib/staff-details-allocation";

interface PendingItem extends StaffDetailConflict {
  submitted_at?: string;
}

/**
 * Shows the details a staff member supplied that differ from what is already
 * held on their record. Nothing is changed until the admin picks a value —
 * payroll and identity fields are never overwritten silently.
 */
export function SubmittedDetailsReview({ employeeId }: { employeeId: string }) {
  const qc = useQueryClient();

  const { data: pending = [] } = useQuery({
    queryKey: ["staff_detail_confirmations", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_onboarding_data")
        .select("id, personal_info")
        .eq("employee_id", employeeId)
        .maybeSingle();
      if (error) throw error;
      const list = (data?.personal_info as any)?.pending_confirmations;
      return Array.isArray(list) ? (list as PendingItem[]) : [];
    },
    enabled: !!employeeId,
  });

  const resolve = useMutation({
    mutationFn: async ({ item, accept }: { item: PendingItem; accept: boolean }) => {
      const { data: onb, error: readErr } = await supabase
        .from("employee_onboarding_data")
        .select("id, personal_info")
        .eq("employee_id", employeeId)
        .maybeSingle();
      if (readErr) throw readErr;

      if (accept) {
        const { error } = await supabase
          .from("employees")
          .update({ [item.field]: item.submitted } as never)
          .eq("id", employeeId);
        if (error) throw error;
      }

      const info = ((onb?.personal_info as Record<string, unknown>) ?? {}) as any;
      const remaining = (Array.isArray(info.pending_confirmations) ? info.pending_confirmations : []).filter(
        (p: PendingItem) => p.field !== item.field,
      );
      const { error: updErr } = await supabase
        .from("employee_onboarding_data")
        .update({ personal_info: { ...info, pending_confirmations: remaining } } as never)
        .eq("id", onb!.id);
      if (updErr) throw updErr;

      const { data: emp } = await supabase
        .from("employees")
        .select("tenant_id")
        .eq("id", employeeId)
        .maybeSingle();
      if (emp?.tenant_id) {
        await supabase.from("audit_log").insert({
          tenant_id: emp.tenant_id,
          action: "update",
          table_name: "staff_submitted_detail_confirmation",
          record_id: employeeId,
          old_data: { field: item.field, value: item.current },
          new_data: {
            field: item.field,
            submitted: item.submitted,
            decision: accept ? "accepted_staff_value" : "kept_existing_value",
          },
        } as never);
      }
    },
    onSuccess: (_, { accept }) => {
      qc.invalidateQueries({ queryKey: ["staff_detail_confirmations", employeeId] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success(accept ? "Record updated" : "Existing value kept");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (pending.length === 0) return null;

  return (
    <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <AlertTriangle className="h-4 w-4 text-warning" />
        Details to confirm
        <Badge variant="outline" className="ml-auto text-[10px]">{pending.length}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        These answers differ from what is already on record, so nothing has been changed yet.
      </p>
      {pending.map((item) => (
        <div key={item.field} className="rounded-md bg-background border border-border p-3 space-y-2">
          <p className="text-xs font-medium text-foreground">{item.label}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">On record</p>
              <p className="font-mono break-all">{item.current}</p>
            </div>
            <div>
              <p className="text-muted-foreground">They entered</p>
              <p className="font-mono break-all">{item.submitted}</p>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1 gap-1"
              disabled={resolve.isPending}
              onClick={() => resolve.mutate({ item, accept: true })}
            >
              <Check className="h-3.5 w-3.5" /> Use their answer
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1"
              disabled={resolve.isPending}
              onClick={() => resolve.mutate({ item, accept: false })}
            >
              <X className="h-3.5 w-3.5" /> Keep current
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
