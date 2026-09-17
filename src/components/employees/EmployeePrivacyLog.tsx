import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Eye, FileDown, Trash2, ChevronDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

interface Props {
  employeeId: string;
  employeeName: string;
}

interface LogRow {
  id: string;
  at: string;
  who: string;
  what: string;
  kind: "reveal" | "document" | "decision" | "change";
}

const LABELS: Record<string, { text: string; kind: LogRow["kind"] }> = {
  privacy_shield: { text: "Revealed a hidden field", kind: "reveal" },
  staff_submitted_detail_confirmation: { text: "Decided on a submitted detail", kind: "decision" },
  employee_info_request: { text: "Sent a details request", kind: "change" },
  employees: { text: "Changed the staff record", kind: "change" },
};

const DOC_LABELS: Record<string, string> = {
  viewed: "Opened a document",
  downloaded: "Downloaded a document",
  uploaded: "Uploaded a document",
  deleted: "Removed a document",
  verified: "Verified a document",
};

/**
 * Read-only privacy record: who looked at, downloaded or decided on this
 * person's information, and a manager action to clear raw submitted answers
 * once they have been filed onto the record.
 */
export function EmployeePrivacyLog({ employeeId, employeeName }: Props) {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["employee_privacy_log", tenantId, employeeId],
    queryFn: async () => {
      if (!tenantId) return [] as LogRow[];

      const [audit, docs, profiles] = await Promise.all([
        supabase
          .from("audit_log")
          .select("id, action, table_name, record_id, new_data, user_id, created_at")
          .eq("tenant_id", tenantId)
          .eq("record_id", employeeId)
          .order("created_at", { ascending: false })
          .limit(150),
        supabase
          .from("document_audit_log")
          .select("id, action, performed_by, created_at, metadata")
          .eq("tenant_id", tenantId)
          .eq("employee_id", employeeId)
          .order("created_at", { ascending: false })
          .limit(150),
        supabase.from("profiles").select("user_id, full_name"),
      ]);

      const nameOf = (userId: string | null) =>
        (profiles.data ?? []).find((p) => p.user_id === userId)?.full_name || "A manager";

      const out: LogRow[] = [];

      for (const a of audit.data ?? []) {
        const label = LABELS[a.table_name] ?? { text: `${a.action} — ${a.table_name}`, kind: "change" as const };
        const field = (a.new_data as Record<string, unknown> | null)?.["field"];
        out.push({
          id: `a-${a.id}`,
          at: a.created_at,
          who: nameOf(a.user_id),
          what: field ? `${label.text}: ${String(field)}` : label.text,
          kind: label.kind,
        });
      }

      for (const d of docs.data ?? []) {
        out.push({
          id: `d-${d.id}`,
          at: d.created_at,
          who: nameOf(d.performed_by),
          what: DOC_LABELS[d.action] ?? `Document: ${d.action}`,
          kind: "document",
        });
      }

      return out.sort((a, b) => (a.at < b.at ? 1 : -1));
    },
    enabled: !!tenantId,
  });

  const { data: rawCount = 0 } = useQuery({
    queryKey: ["employee_raw_submissions", tenantId, employeeId],
    queryFn: async () => {
      if (!tenantId) return 0;
      const { data } = await supabase
        .from("employee_info_requests")
        .select("id, submitted_data, submitted_at")
        .eq("tenant_id", tenantId)
        .eq("employee_id", employeeId)
        .not("submitted_at", "is", null);
      return (data ?? []).filter((r) => r.submitted_data && Object.keys(r.submitted_data as object).length > 0)
        .length;
    },
    enabled: !!tenantId,
  });

  const clearRaw = useMutation({
    mutationFn: async () => {
      const { data: requests } = await supabase
        .from("employee_info_requests")
        .select("id")
        .eq("tenant_id", tenantId!)
        .eq("employee_id", employeeId)
        .not("submitted_at", "is", null);

      for (const r of requests ?? []) {
        const { error } = await supabase
          .from("employee_info_requests")
          .update({ submitted_data: {} })
          .eq("id", r.id)
          .eq("tenant_id", tenantId!);
        if (error) throw error;
      }

      const { data: auth } = await supabase.auth.getUser();
      await supabase.from("audit_log").insert({
        tenant_id: tenantId!,
        user_id: auth.user?.id ?? null,
        action: "delete",
        table_name: "employee_info_request_raw_answers",
        record_id: employeeId,
        new_data: { cleared_requests: (requests ?? []).length, reason: "retention_cleanup" },
      } as never);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee_raw_submissions"] });
      qc.invalidateQueries({ queryKey: ["employee_privacy_log"] });
      toast.success("Raw submitted answers cleared — the staff record is unchanged");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const visible = expanded ? rows : rows.slice(0, 6);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Who saw what
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Every time {employeeName.split(" ")[0]}'s hidden details were revealed, a document was opened or downloaded,
          or a submitted answer was decided on, it is recorded here and cannot be edited.
        </p>

        {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!isLoading && rows.length === 0 && (
          <p className="text-xs text-muted-foreground">Nothing recorded yet.</p>
        )}

        <div className="space-y-1.5">
          {visible.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-2 rounded-md border border-border px-2.5 py-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-card-foreground flex items-center gap-1.5">
                  {r.kind === "reveal" && <Eye className="h-3 w-3" />}
                  {r.kind === "document" && <FileDown className="h-3 w-3" />}
                  {r.what}
                </p>
                <p className="text-[11px] text-muted-foreground">{r.who}</p>
              </div>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {format(parseISO(r.at), "d MMM yyyy HH:mm")}
              </span>
            </div>
          ))}
        </div>

        {rows.length > 6 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpanded((v) => !v)}>
            <ChevronDown className="h-3.5 w-3.5 mr-1" />
            {expanded ? "Show less" : `Show all ${rows.length}`}
          </Button>
        )}

        <div className="rounded-lg bg-muted/40 p-3 space-y-2">
          <p className="text-xs font-medium text-card-foreground">Keeping only what you need</p>
          <p className="text-[11px] text-muted-foreground">
            {rawCount > 0
              ? `${rawCount} completed submission${rawCount > 1 ? "s" : ""} still hold${rawCount > 1 ? "" : "s"} the raw answers as they were typed. Once you are happy they are filed on the record, you can clear them. Right-to-work photos and the staff record itself are untouched.`
              : "No raw submitted answers are being kept. Details live on the staff record only."}
          </p>
          {rawCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={clearRaw.isPending}
              onClick={() => clearRaw.mutate()}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Clear raw submitted answers
            </Button>
          )}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Badge variant="outline" className="text-[10px]">Details link: 7 days, single use</Badge>
            <Badge variant="outline" className="text-[10px]">Documents: private store, short-lived links</Badge>
            <Badge variant="outline" className="text-[10px]">Payroll records: kept 3 tax years</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
