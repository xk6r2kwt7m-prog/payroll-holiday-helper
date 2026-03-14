import { useState } from "react";
import { format } from "date-fns";
import {
  FileText,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  MoreHorizontal,
  ExternalLink,
  Edit2,
  Shield,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useEmployeeDocuments,
  useDeleteDocument,
  DOCUMENT_TYPES,
  getExpiryStatus,
  type EmployeeDocument,
} from "@/hooks/useEmployeeDocuments";
import { DocumentUploadDialog } from "./DocumentUploadDialog";
import { DocumentVerificationPanel } from "./DocumentVerificationPanel";
import { cn } from "@/lib/utils";
import { useTenant } from "@/hooks/useTenant";

interface EmployeeDocumentListProps {
  employeeId: string;
  employeeName: string;
  isAdmin: boolean;
}

export function EmployeeDocumentList({ employeeId, employeeName, isAdmin }: EmployeeDocumentListProps) {
  const { data: documents = [], isLoading } = useEmployeeDocuments(employeeId);
  const deleteDocument = useDeleteDocument();
  const [deleteTarget, setDeleteTarget] = useState<EmployeeDocument | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  const { tenantId } = useTenant();

  const handleDownload = async (doc: EmployeeDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from("employee-documents")
        .createSignedUrl(doc.file_path, 60);

      if (error) throw error;

      window.open(data.signedUrl, "_blank");
    } catch (error) {
      toast.error("Failed to download document");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteDocument.mutateAsync({
        id: deleteTarget.id,
        filePath: deleteTarget.file_path,
      });
      toast.success("Document deleted");
      setDeleteTarget(null);
    } catch (error) {
      toast.error("Failed to delete document");
    }
  };

  const getDocumentTypeInfo = (type: string) => {
    return DOCUMENT_TYPES.find((t) => t.value === type) || { label: type, emoji: "📄" };
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-4 rounded-lg border border-border">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-card-foreground">
          Documents ({documents.length})
        </h3>
        <div className="flex items-center gap-2">
          {isAdmin && documents.length > 0 && (
            <Button
              variant={showVerification ? "secondary" : "ghost"}
              size="sm"
              className="gap-1.5"
              onClick={() => setShowVerification(!showVerification)}
            >
              <Shield className="h-3.5 w-3.5" />
              Verify
            </Button>
          )}
          {isAdmin && (
            <DocumentUploadDialog employeeId={employeeId} employeeName={employeeName} />
          )}
        </div>
      </div>

      {/* Verification Panel */}
      {showVerification && isAdmin && tenantId && documents.length > 0 && (
        <DocumentVerificationPanel
          documents={documents}
          employeeId={employeeId}
          tenantId={tenantId}
        />
      )}

      {/* Document List */}
      {documents.length === 0 ? (
        <div className="text-center py-8 rounded-lg border border-dashed border-border">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-3">No documents uploaded yet</p>
          {isAdmin && (
            <DocumentUploadDialog
              employeeId={employeeId}
              employeeName={employeeName}
              trigger={
                <Button variant="outline" size="sm">
                  Upload First Document
                </Button>
              }
            />
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const typeInfo = getDocumentTypeInfo(doc.document_type);
            const expiryInfo = getExpiryStatus(doc.expires_at);

            return (
              <div
                key={doc.id}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border transition-colors hover:bg-muted/50",
                  expiryInfo.status === "expired" && "border-destructive/30 bg-destructive/5",
                  expiryInfo.status === "expiring" && "border-warning/30 bg-warning/5"
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg text-lg shrink-0",
                    expiryInfo.status === "expired" && "bg-destructive/10",
                    expiryInfo.status === "expiring" && "bg-warning/10",
                    expiryInfo.status === "valid" && "bg-muted"
                  )}
                >
                  {typeInfo.emoji}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-card-foreground truncate">
                      {doc.document_name}
                    </p>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {typeInfo.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>•</span>
                    <span>Uploaded {format(new Date(doc.created_at), "MMM d, yyyy")}</span>
                  </div>
                </div>

                {/* Expiry Status */}
                {doc.expires_at && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {expiryInfo.status === "expired" && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Expired
                      </Badge>
                    )}
                    {expiryInfo.status === "expiring" && (
                      <Badge className="gap-1 bg-warning text-warning-foreground">
                        <Clock className="h-3 w-3" />
                        {expiryInfo.daysUntil} days
                      </Badge>
                    )}
                    {expiryInfo.status === "valid" && (
                      <Badge variant="outline" className="gap-1 text-success border-success/30">
                        <CheckCircle className="h-3 w-3" />
                        {format(new Date(doc.expires_at), "MMM yyyy")}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownload(doc)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload(doc)}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in New Tab
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(doc)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.document_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
