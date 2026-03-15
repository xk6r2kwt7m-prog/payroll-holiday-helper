import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTenant } from "@/hooks/useTenant";

const ACTION_STYLES: Record<string, string> = {
  INSERT: "bg-success/10 text-success",
  UPDATE: "bg-primary/10 text-primary",
  DELETE: "bg-destructive/10 text-destructive",
  EXPORT: "bg-accent/10 text-accent",
  REVEAL: "bg-warning/10 text-warning",
};

export function AdminAuditLog() {
  const [search, setSearch] = useState("");
  const { tenantId } = useTenant();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-audit-log", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const filtered = logs.filter((log) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      log.table_name?.toLowerCase().includes(s) ||
      log.action?.toLowerCase().includes(s) ||
      (log.record_id && log.record_id.toLowerCase().includes(s))
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
          placeholder="Filter by table, action..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-xs"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No audit log entries found</p>
      ) : (
        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
          {filtered.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 p-2.5 rounded-lg border border-border bg-card text-xs"
            >
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 shrink-0", ACTION_STYLES[log.action] || "")}>
                {log.action}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{log.table_name}</p>
                {log.record_id && (
                  <p className="text-muted-foreground font-mono text-[10px] truncate">{log.record_id}</p>
                )}
              </div>
              <span className="text-muted-foreground text-[10px] whitespace-nowrap shrink-0">
                {new Date(log.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">Showing latest 100 entries. Audit logs are immutable and cannot be edited or deleted.</p>
    </div>
  );
}
