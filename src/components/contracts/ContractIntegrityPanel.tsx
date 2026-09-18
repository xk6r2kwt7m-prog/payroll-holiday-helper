import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invokeAuthenticatedFunction } from "@/lib/authenticated-function";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, AlertTriangle, FileDown } from "lucide-react";

interface Props {
  documentId: string;
}

const RESULT_LABELS: Record<string, string> = {
  match: "File confirmed unchanged",
  recorded: "Fingerprint recorded",
  mismatch: "Fingerprint does not match",
  unreadable: "File could not be read",
  no_file: "No file stored",
  not_permitted: "Not permitted",
};

/**
 * Shows the reference, fingerprint, the last dated integrity check and any recovery
 * copies for a signed contract. Nothing here alters the stored contract.
 */
export function ContractIntegrityPanel({ documentId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [checking, setChecking] = useState(false);

  const { data: record } = useQuery({
    queryKey: ["contract-integrity-record", documentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("employee_documents")
        .select("contract_reference, final_document_hash, final_signed_pdf_url, contract_state")
        .eq("id", documentId)
        .maybeSingle();
      return data as any;
    },
  });

  const { data: checks } = useQuery({
    queryKey: ["contract-integrity", documentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("contract_integrity_checks")
        .select("id, file_kind, result, detail, checked_at, recalculated_hash")
        .eq("employee_document_id", documentId)
        .order("checked_at", { ascending: false })
        .limit(6);
      return data || [];
    },
  });

  const { data: recoveries } = useQuery({
    queryKey: ["contract-recoveries", documentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("contract_file_recoveries")
        .select("id, recovery_file_path, recovery_file_hash, reason, created_by_name, created_at")
        .eq("employee_document_id", documentId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const runCheck = async () => {
    setChecking(true);
    try {
      const { data } = await invokeAuthenticatedFunction<{ success?: boolean; error?: string }>(
        "sign-contract?action=integrity_check",
        { document_id: documentId },
      );
      if (!data?.success) throw new Error(data?.error || "The check could not be completed.");
      toast({
        title: "Integrity check recorded",
        description: "This confirms the file as at today only — it is not evidence of its condition before today.",
      });
      queryClient.invalidateQueries({ queryKey: ["contract-integrity", documentId] });
    } catch (err: any) {
      toast({ title: "Could not run the check", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setChecking(false);
    }
  };

  const openRecovery = async (path: string) => {
    const { data, error } = await supabase.storage.from("employee-documents").createSignedUrl(path, 300);
    if (error || !data?.signedUrl) {
      toast({ title: "Could not open the recovery copy", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const latest = (checks || [])[0] as any;
  const mismatch = (checks || []).some((c: any) => c.result === "mismatch");

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2">
        {mismatch ? (
          <AlertTriangle className="h-4 w-4 text-destructive" />
        ) : (
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
        )}
        <p className="text-xs font-medium">Document integrity</p>
      </div>

      {record?.contract_reference && (
        <p className="text-[11px] text-muted-foreground">
          Reference <span className="font-mono">{record.contract_reference}</span>
        </p>
      )}
      {record?.final_document_hash && (
        <p className="text-[11px] text-muted-foreground break-all">
          Fingerprint <span className="font-mono">{String(record.final_document_hash).slice(0, 24)}…</span>
        </p>
      )}

      {latest ? (
        <p className="text-[11px] text-muted-foreground">
          {RESULT_LABELS[latest.result] || latest.result} as at{" "}
          {new Date(latest.checked_at).toLocaleString("en-GB")}. This confirms the file from the date checked and is not
          evidence of its condition before that date.
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">No integrity check recorded yet.</p>
      )}

      {mismatch && (
        <p className="text-[11px] text-destructive">
          A fingerprint did not match. Nothing has been changed or corrected — please review before acting.
        </p>
      )}

      <Button onClick={runCheck} disabled={checking} size="sm" variant="outline" className="w-full">
        {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        Check file integrity now
      </Button>

      {(recoveries || []).length > 0 && (
        <div className="space-y-1 pt-1 border-t border-border">
          <p className="text-[11px] font-medium">Recovery copies</p>
          {(recoveries || []).map((r: any) => (
            <div key={r.id} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground truncate">
                  {new Date(r.created_at).toLocaleString("en-GB")}
                  {r.created_by_name ? ` — ${r.created_by_name}` : ""}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{r.reason}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => openRecovery(r.recovery_file_path)}>
                <FileDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground">
            The original signed file remains the authoritative document.
          </p>
        </div>
      )}
    </div>
  );
}
