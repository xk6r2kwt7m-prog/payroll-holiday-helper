import { format } from "date-fns";
import { AlertTriangle, Clock, FileText, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllExpiringDocuments, DOCUMENT_TYPES, getExpiryStatus } from "@/hooks/useEmployeeDocuments";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface ExpiringDocumentsWidgetProps {
  className?: string;
}

export function ExpiringDocumentsWidget({ className }: ExpiringDocumentsWidgetProps) {
  const { data: documents = [], isLoading } = useAllExpiringDocuments(60);
  const navigate = useNavigate();

  const getDocumentTypeInfo = (type: string) => {
    return DOCUMENT_TYPES.find((t) => t.value === type) || { label: type, emoji: "📄" };
  };

  const expiredCount = documents.filter(d => {
    const status = getExpiryStatus(d.expires_at);
    return status.status === "expired";
  }).length;

  const expiringCount = documents.filter(d => {
    const status = getExpiryStatus(d.expires_at);
    return status.status === "expiring";
  }).length;

  if (isLoading) {
    return (
      <div className={cn("rounded-xl bg-card shadow-card p-5", className)}>
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-40" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className={cn("rounded-xl bg-card shadow-card p-5", className)}>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-card-foreground">Document Expiry</h3>
        </div>
        <div className="text-center py-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 mx-auto mb-3">
            <FileText className="h-6 w-6 text-success" />
          </div>
          <p className="text-sm text-muted-foreground">
            No documents expiring soon
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl bg-card shadow-card p-5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <h3 className="font-semibold text-card-foreground">Document Expiry</h3>
        </div>
        <div className="flex gap-2">
          {expiredCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {expiredCount} expired
            </Badge>
          )}
          {expiringCount > 0 && (
            <Badge className="bg-warning text-warning-foreground text-xs">
              {expiringCount} expiring
            </Badge>
          )}
        </div>
      </div>

      {/* Document List */}
      <div className="space-y-1">
        {documents.slice(0, 5).map((doc: any) => {
          const typeInfo = getDocumentTypeInfo(doc.document_type);
          const expiryInfo = getExpiryStatus(doc.expires_at);
          const employee = doc.employees;

          return (
            <div
              key={doc.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer hover:bg-muted/50",
                expiryInfo.status === "expired" && "bg-destructive/5",
                expiryInfo.status === "expiring" && "bg-warning/5"
              )}
              onClick={() => navigate("/employees")}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg text-sm shrink-0",
                  expiryInfo.status === "expired" && "bg-destructive/10",
                  expiryInfo.status === "expiring" && "bg-warning/10",
                  expiryInfo.status === "valid" && "bg-muted"
                )}
              >
                {typeInfo.emoji}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-card-foreground truncate">
                  {employee?.forename} {employee?.surname}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {typeInfo.label}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {expiryInfo.status === "expired" ? (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Expired
                  </Badge>
                ) : (
                  <Badge className="bg-warning text-warning-foreground text-xs gap-1">
                    <Clock className="h-3 w-3" />
                    {expiryInfo.daysUntil}d
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* View All */}
      {documents.length > 5 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-3 text-muted-foreground"
          onClick={() => navigate("/employees")}
        >
          View all {documents.length} documents
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      )}
    </div>
  );
}
