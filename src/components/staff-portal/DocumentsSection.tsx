import { FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useEmployeeDocuments, getExpiryStatus } from "@/hooks/useEmployeeDocuments";
import { StaffDocumentRequests } from "@/components/documents/StaffDocumentRequests";
import { StaffEvidenceUpload } from "@/components/attendance/StaffEvidenceUpload";

interface DocumentsSectionProps {
  employeeId: string;
}

export function DocumentsSection({ employeeId }: DocumentsSectionProps) {
  return (
    <div className="space-y-4">
      <StaffDocumentRequests employeeId={employeeId} />
      <StaffDocumentView employeeId={employeeId} />
      <StaffEvidenceUpload employeeId={employeeId} />
    </div>
  );
}

const STATUS_LABELS: Record<string, { label: string; style: string }> = {
  uploaded: { label: "Uploaded", style: "bg-muted text-muted-foreground" },
  extracted: { label: "Extracted", style: "bg-accent/10 text-accent-foreground" },
  pending_review: { label: "Under Review", style: "bg-warning/10 text-warning" },
  pending_verification: { label: "Pending", style: "bg-warning/10 text-warning" },
  verified: { label: "Verified", style: "bg-success/10 text-success" },
  rejected: { label: "Action Needed", style: "bg-destructive/10 text-destructive" },
  expired: { label: "Expired", style: "bg-destructive/10 text-destructive" },
};

function StaffDocumentView({ employeeId }: { employeeId: string }) {
  const { data: documents = [], isLoading } = useEmployeeDocuments(employeeId);

  if (isLoading) {
    return <div className="text-center py-8 text-sm text-muted-foreground">Loading documents...</div>;
  }

  if (documents.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">My Documents</h2>
        </div>
        <div className="divide-y divide-border">
          {documents.map(doc => {
            const docAny = doc as any;
            const status = STATUS_LABELS[docAny.document_status || "uploaded"] || STATUS_LABELS.uploaded;
            const expiry = getExpiryStatus(doc.expires_at);
            const hasExpiryWarning = expiry.status === "expired" || expiry.status === "expiring";

            return (
              <div key={doc.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.document_name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{doc.document_type.replace(/_/g, " ")}</Badge>
                      <Badge className={cn("text-[10px]", status.style)}>{status.label}</Badge>
                    </div>
                  </div>
                  <CheckCircle2 className={cn("h-5 w-5 shrink-0", docAny.document_status === "verified" ? "text-success" : "text-muted-foreground/20")} />
                </div>
                {doc.expires_at && (
                  <p className={cn("text-xs mt-1.5",
                    expiry.status === "expired" ? "text-destructive" :
                    expiry.status === "expiring" ? "text-warning" :
                    "text-muted-foreground"
                  )}>
                    {hasExpiryWarning && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                    {expiry.label}
                  </p>
                )}
                {docAny.document_status === "rejected" && docAny.rejected_reason && (
                  <p className="text-xs text-destructive mt-1.5">
                    Please re-upload: {docAny.rejected_reason}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Expiry Summary */}
      {documents.some(d => {
        const exp = getExpiryStatus(d.expires_at);
        return exp.status === "expired" || exp.status === "expiring";
      }) && (
        <div className="rounded-xl bg-warning/5 border border-warning/20 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-warning">Document Expiry Alert</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Some of your documents are expiring or expired. Please upload replacement documents or contact your manager.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
