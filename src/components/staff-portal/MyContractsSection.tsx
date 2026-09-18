import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { pdf } from "@react-pdf/renderer";
import { FileSignature, Download, Eye, Loader2, Award, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { SigningCertificatePDF } from "@/components/contracts/SigningCertificatePDF";
import type { SignatureRecord } from "@/components/contracts/SigningCertificatePDF";

/**
 * Staff self-service: a person's own completed contract, any later signed variation and
 * their signing certificate. Drafts, recovery copies, internal audit records and other
 * people's documents are never listed here, and the database rules refuse them even if
 * this screen asked for them.
 */

const COMPLETED_STATES = ["signed", "superseded", "terminated"];

const STATE_LABEL: Record<string, { label: string; style: string }> = {
  signed: { label: "In force", style: "bg-success/10 text-success" },
  superseded: { label: "Replaced by a later version", style: "bg-muted text-muted-foreground" },
  terminated: { label: "Ended", style: "bg-muted text-muted-foreground" },
};

export function MyContractsSection({ employeeId }: { employeeId: string }) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["my-contracts", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_documents")
        .select(
          "id, document_name, contract_state, contract_reference, issue_date, signed_at, contract_version, template_version, wording_provenance, final_signed_pdf_url",
        )
        .eq("employee_id", employeeId)
        .eq("document_type", "contract")
        .in("contract_state", COMPLETED_STATES)
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!employeeId,
  });

  const openContract = async (documentId: string, download: boolean) => {
    setBusyId(documentId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("no_session");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/serve-document?id=${documentId}&variant=final`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        toast({
          title: "Could not open your contract",
          description: detail.error || "Please try again, or ask your manager for a copy.",
          variant: "destructive",
        });
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      if (download) {
        const link = document.createElement("a");
        link.href = url;
        link.download = "My_signed_contract.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.open(url, "_blank");
      }
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      toast({
        title: "Could not open your contract",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const downloadCertificate = async (documentId: string, documentName: string) => {
    setBusyId(`${documentId}-cert`);
    try {
      const { data: sigs, error } = await supabase
        .from("contract_signatures")
        .select("*")
        .eq("employee_document_id", documentId)
        .order("signed_at", { ascending: true });

      if (error) throw error;
      if (!sigs || sigs.length === 0) {
        toast({ title: "No signing certificate", description: "No electronic signatures are recorded for this contract." });
        return;
      }

      const records: SignatureRecord[] = sigs.map((s: any) => ({
        signer_type: s.signer_type,
        signer_name: s.signer_name,
        typed_name: s.typed_name,
        signed_at: s.signed_at,
        signed_by_email: s.signed_by_email,
        ip_address: s.ip_address,
        user_agent: s.user_agent,
        signature_data: s.signature_data,
        signature_type: s.signature_type,
        consent_text: s.consent_text,
        consent_given: s.consent_given,
        document_hash: s.document_hash,
        signatory_title: s.signatory_title,
      }));

      const blob = await pdf(
        <SigningCertificatePDF
          documentName={documentName}
          employeeName={records[0]?.signer_name || "Employee"}
          companyName=""
          signatures={records}
          documentId={documentId}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "My_signing_certificate.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      toast({
        title: "Could not prepare your certificate",
        description: "Please try again, or ask your manager for a copy.",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-6 text-sm text-muted-foreground">Loading your contract…</div>;
  }

  if (contracts.length === 0) return null;

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <FileSignature className="h-4 w-4 text-primary" />
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">My Contract</h2>
      </div>

      <div className="divide-y divide-border">
        {contracts.map((c: any) => {
          const state = STATE_LABEL[c.contract_state] || { label: c.contract_state, style: "bg-muted text-muted-foreground" };
          return (
            <div key={c.id} className="px-4 py-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.document_name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge className={`text-[10px] ${state.style}`}>{state.label}</Badge>
                    {c.contract_reference && (
                      <Badge variant="outline" className="text-[10px]">{c.contract_reference}</Badge>
                    )}
                  </div>
                </div>
              </div>

              {c.wording_provenance && (
                <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                  <Info className="h-3 w-3 mt-0.5 shrink-0" />
                  {c.wording_provenance}
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openContract(c.id, false)}
                  disabled={busyId === c.id}
                >
                  {busyId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  View
                </Button>
                <Button size="sm" variant="outline" onClick={() => openContract(c.id, true)} disabled={busyId === c.id}>
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => downloadCertificate(c.id, c.document_name)}
                  disabled={busyId === `${c.id}-cert`}
                >
                  {busyId === `${c.id}-cert` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Award className="h-4 w-4" />
                  )}
                  Signing certificate
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 bg-muted/30 border-t border-border">
        <p className="text-[11px] text-muted-foreground">
          These copies are available here while your employment and account are active. Please keep your own copy — when
          employment ends we will send you a final downloadable copy before access here closes. The company keeps its own
          copy under its retention policy.
        </p>
      </div>
    </div>
  );
}
