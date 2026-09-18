import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Mail, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Delivery record for a completed contract: every attempt, success and failure.
 * Retrying only creates a new secure download link and a new attempt record — the
 * signed file and its fingerprint are never read for writing, rebuilt or replaced.
 */

interface Props {
  documentId: string;
  employeeEmail?: string | null;
}

const STATUS: Record<string, { label: string; style: string }> = {
  sent: { label: "Sent", style: "bg-success/10 text-success" },
  failed: { label: "Failed", style: "bg-destructive/10 text-destructive" },
  pending: { label: "Pending", style: "bg-muted text-muted-foreground" },
  blocked: { label: "Blocked", style: "bg-warning/10 text-warning" },
};

export function ContractDeliveryPanel({ documentId, employeeEmail }: Props) {
  const queryClient = useQueryClient();
  const [retrying, setRetrying] = useState(false);

  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ["contract-delivery-attempts", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_delivery_attempts")
        .select("*")
        .eq("employee_document_id", documentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const openFailures = attempts.filter((a: any) => a.status === "failed" && !a.resolved_at);

  const retryDelivery = async () => {
    setRetrying(true);
    try {
      const { error } = await supabase.functions.invoke("send-signed-contract", {
        body: { documentId, trigger_source: "manual_retry" },
      });
      if (error) throw error;
      toast({
        title: "Delivery retried",
        description: "A new secure download link was sent. The signed file itself was not changed.",
      });
      queryClient.invalidateQueries({ queryKey: ["contract-delivery-attempts", documentId] });
    } catch {
      toast({
        title: "Retry failed",
        description: "The email could not be sent. The failure has been recorded.",
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["contract-delivery-attempts", documentId] });
    } finally {
      setRetrying(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Delivery record</h3>
        </div>
        <Button size="sm" variant="outline" onClick={retryDelivery} disabled={retrying}>
          {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Retry delivery
        </Button>
      </div>

      {openFailures.length > 0 && (
        <div className="px-4 py-3 bg-destructive/5 border-b border-border flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-xs text-foreground">
            {openFailures.length} delivery {openFailures.length === 1 ? "attempt" : "attempts"} failed and needs action.
            Check the address {employeeEmail ? <span className="font-medium">({employeeEmail})</span> : null} and retry.
          </p>
        </div>
      )}

      {attempts.length === 0 ? (
        <p className="px-4 py-3 text-xs text-muted-foreground">No delivery attempts recorded yet.</p>
      ) : (
        <div className="divide-y divide-border">
          {attempts.map((a: any) => {
            const s = STATUS[a.status] || { label: a.status, style: "bg-muted text-muted-foreground" };
            return (
              <div key={a.id} className="px-4 py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{a.recipient_email}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {a.recipient_role === "employee" ? "Employee" : "Employer"} ·{" "}
                    {a.delivery_method === "attachment" ? "Attached copy" : "Secure download link"} ·{" "}
                    {a.trigger_source === "automatic" ? "Automatic" : "Manual"} ·{" "}
                    {a.created_at ? format(new Date(a.created_at), "d MMM yyyy HH:mm") : ""}
                  </p>
                  {a.error_message && <p className="text-[11px] text-destructive mt-0.5">{a.error_message}</p>}
                  {a.email_verified === false && (
                    <p className="text-[11px] text-warning mt-0.5">Address not verified — sent as a secure link only.</p>
                  )}
                </div>
                <Badge className={`text-[10px] shrink-0 ${s.style}`}>
                  {a.status === "sent" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                  {s.label}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
