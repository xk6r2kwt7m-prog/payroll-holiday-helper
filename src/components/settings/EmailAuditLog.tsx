import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, Mail, MailX, MailCheck, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTenant } from "@/hooks/useTenant";

const STATUS_STYLES: Record<string, { class: string; icon: any }> = {
  sent: { class: "bg-success/10 text-success", icon: MailCheck },
  blocked: { class: "bg-destructive/10 text-destructive", icon: MailX },
  suppressed: { class: "bg-warning/10 text-warning", icon: MailX },
  failed: { class: "bg-destructive/10 text-destructive", icon: AlertTriangle },
  pending: { class: "bg-primary/10 text-primary", icon: Mail },
};

interface EmailAuditEntry {
  id: string;
  created_at: string;
  action: string;
  table_name: string;
  record_id: string | null;
  new_data: any;
}

export function EmailAuditLog() {
  const [search, setSearch] = useState("");
  const { tenantId } = useTenant();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["email-audit-log", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("table_name", [
          "email_sent",
          "email_blocked",
          "email_failed",
          "contract_email_sent",
          "contract_email_blocked",
          "completed_contract_sent_to_managers",
          "employer_signing_email_sent",
          "employer_signing_email_blocked",
        ])
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as EmailAuditEntry[];
    },
    enabled: !!tenantId,
  });

  const filtered = logs.filter((log) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const d = log.new_data as any;
    return (
      log.table_name?.toLowerCase().includes(s) ||
      d?.recipient_email?.toLowerCase().includes(s) ||
      d?.employee_name?.toLowerCase().includes(s) ||
      d?.email_type?.toLowerCase().includes(s) ||
      d?.event?.toLowerCase().includes(s) ||
      d?.status?.toLowerCase().includes(s)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Filter by recipient, type, status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-xs"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No email events recorded yet</p>
      ) : (
        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
          {filtered.map((log) => {
            const d = log.new_data as any;
            const status = d?.status || (log.table_name.includes("blocked") ? "blocked" : "sent");
            const style = STATUS_STYLES[status] || STATUS_STYLES.sent;
            const Icon = style.icon;

            return (
              <div
                key={log.id}
                className="flex items-start gap-3 p-2.5 rounded-lg border border-border bg-card text-xs"
              >
                <Badge
                  variant="outline"
                  className={cn("text-[10px] px-1.5 py-0 h-5 shrink-0 flex items-center gap-1", style.class)}
                >
                  <Icon className="h-3 w-3" />
                  {status}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {d?.event || log.table_name.replace(/_/g, " ")}
                  </p>
                  {d?.recipient_email && (
                    <p className="text-muted-foreground text-[10px] truncate">
                      To: {d.recipient_email}
                    </p>
                  )}
                  {d?.employee_name && (
                    <p className="text-muted-foreground text-[10px] truncate">
                      Employee: {d.employee_name}
                    </p>
                  )}
                  {d?.email_type && (
                    <p className="text-muted-foreground text-[10px]">
                      Type: {d.email_type}
                    </p>
                  )}
                  {d?.reason && (
                    <p className="text-destructive text-[10px]">
                      Reason: {d.reason}
                    </p>
                  )}
                  {d?.trigger && (
                    <p className="text-muted-foreground text-[10px]">
                      Trigger: {d.trigger}
                    </p>
                  )}
                </div>
                <span className="text-muted-foreground text-[10px] whitespace-nowrap shrink-0">
                  {new Date(log.created_at).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Showing latest 200 email events. All email attempts are immutable audit records.
      </p>
    </div>
  );
}
