import { useState } from "react";
import { format, isPast, differenceInDays } from "date-fns";
import {
  FileText, Clock, CheckCircle2, X, AlertTriangle, Eye, Send,
  Filter, ChevronDown, MoreHorizontal, RefreshCw, Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  useDocumentRequests,
  useVerifyDocumentRequest,
  useRejectDocumentRequest,
  useCancelDocumentRequest,
  type DocumentRequest,
} from "@/hooks/useDocumentRequests";
import { useTenant } from "@/hooks/useTenant";
import { CreateDocumentRequestDialog } from "./CreateDocumentRequestDialog";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  requested: { label: "Requested", color: "bg-muted text-muted-foreground", icon: Send },
  viewed: { label: "Viewed", color: "bg-accent/10 text-accent-foreground", icon: Eye },
  uploaded: { label: "Uploaded", color: "bg-primary/10 text-primary", icon: FileText },
  pending_review: { label: "Pending Review", color: "bg-warning/10 text-warning", icon: Clock },
  verified: { label: "Verified", color: "bg-success/10 text-success", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-destructive/10 text-destructive", icon: X },
  overdue: { label: "Overdue", color: "bg-destructive/10 text-destructive", icon: AlertTriangle },
  cancelled: { label: "Cancelled", color: "bg-muted text-muted-foreground", icon: Ban },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "text-muted-foreground" },
  normal: { label: "Normal", color: "text-foreground" },
  high: { label: "High", color: "text-warning" },
  urgent: { label: "Urgent", color: "text-destructive" },
};

export function DocumentRequestsManager() {
  const { tenantId } = useTenant();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DocumentRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: requests = [], isLoading } = useDocumentRequests({ status: statusFilter });
  const verifyRequest = useVerifyDocumentRequest();
  const rejectRequest = useRejectDocumentRequest();
  const cancelRequest = useCancelDocumentRequest();

  const filtered = requests.filter(r => {
    if (!search) return true;
    const emp = r.employees;
    const name = emp ? `${emp.forename} ${emp.surname}`.toLowerCase() : "";
    return name.includes(search.toLowerCase()) || r.request_title.toLowerCase().includes(search.toLowerCase());
  });

  const getDisplayStatus = (r: DocumentRequest) => {
    if (r.due_date && isPast(new Date(r.due_date)) && ["requested", "viewed"].includes(r.status)) {
      return "overdue";
    }
    return r.status;
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectReason.trim()) return;
    await rejectRequest.mutateAsync({
      requestId: selectedRequest.id,
      employeeId: selectedRequest.employee_id,
      tenantId: tenantId!,
      reason: rejectReason,
    });
    setRejectDialogOpen(false);
    setRejectReason("");
    setSelectedRequest(null);
  };

  const statusTabs = [
    { value: "all", label: "All" },
    { value: "requested", label: "Requested" },
    { value: "uploaded", label: "Uploaded" },
    { value: "verified", label: "Verified" },
    { value: "rejected", label: "Rejected" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-foreground">Document Requests</h2>
          <p className="text-sm text-muted-foreground">Track and manage document requests from employees</p>
        </div>
        <CreateDocumentRequestDialog />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {statusTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
              statusFilter === tab.value
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Input
        placeholder="Search by employee or request title..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Request List */}
      {isLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            {statusFilter !== "all" || search ? "No matching requests" : "No document requests yet"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {statusFilter !== "all" || search
              ? "Try adjusting your filters or search terms."
              : "Use document requests to collect missing files from employees — passports, right-to-work proof, food hygiene certificates, and more."}
          </p>
          {!search && statusFilter === "all" && (
            <p className="text-xs text-muted-foreground/70 mt-1.5 max-w-xs mx-auto">
              The system tracks the full lifecycle from request to verification, with automated reminders.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(req => {
            const displayStatus = getDisplayStatus(req);
            const statusInfo = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.requested;
            const StatusIcon = statusInfo.icon;
            const priorityInfo = PRIORITY_CONFIG[req.priority] || PRIORITY_CONFIG.normal;
            const emp = req.employees;
            const daysUntilDue = req.due_date ? differenceInDays(new Date(req.due_date), new Date()) : null;
            const canVerify = ["uploaded", "pending_review"].includes(req.status);
            const canReject = ["uploaded", "pending_review"].includes(req.status);
            const canCancel = !["verified", "cancelled"].includes(req.status);

            return (
              <div key={req.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <StatusIcon className={cn("h-5 w-5 shrink-0 mt-0.5",
                      statusInfo.color.includes("success") ? "text-success" :
                      statusInfo.color.includes("warning") ? "text-warning" :
                      statusInfo.color.includes("destructive") ? "text-destructive" :
                      statusInfo.color.includes("primary") ? "text-primary" :
                      "text-muted-foreground"
                    )} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{req.request_title}</p>
                      {emp && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {emp.forename} {emp.surname} · {emp.department}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <Badge className={cn("text-[10px]", statusInfo.color)}>{statusInfo.label}</Badge>
                        {req.priority !== "normal" && (
                          <Badge variant="outline" className={cn("text-[10px]", priorityInfo.color)}>
                            {priorityInfo.label}
                          </Badge>
                        )}
                        {req.requires_verification && (
                          <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Verification Required</Badge>
                        )}
                      </div>
                      {req.due_date && (
                        <p className={cn("text-xs mt-1",
                          displayStatus === "overdue" ? "text-destructive font-medium" :
                          daysUntilDue !== null && daysUntilDue <= 3 ? "text-warning" :
                          "text-muted-foreground"
                        )}>
                          {displayStatus === "overdue" && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                          Due: {format(new Date(req.due_date), "d MMM yyyy")}
                          {daysUntilDue !== null && daysUntilDue > 0 && ` (${daysUntilDue}d)`}
                          {daysUntilDue !== null && daysUntilDue < 0 && ` (${Math.abs(daysUntilDue)}d overdue)`}
                        </p>
                      )}
                      {req.rejection_reason && (
                        <p className="text-xs text-destructive mt-1">Reason: {req.rejection_reason}</p>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canVerify && (
                        <DropdownMenuItem onClick={() => verifyRequest.mutate({
                          requestId: req.id,
                          employeeId: req.employee_id,
                          tenantId: tenantId!,
                        })}>
                          <CheckCircle2 className="h-4 w-4 mr-2 text-success" /> Verify
                        </DropdownMenuItem>
                      )}
                      {canReject && (
                        <DropdownMenuItem onClick={() => {
                          setSelectedRequest(req);
                          setRejectDialogOpen(true);
                        }}>
                          <X className="h-4 w-4 mr-2 text-destructive" /> Reject
                        </DropdownMenuItem>
                      )}
                      {canCancel && (
                        <DropdownMenuItem onClick={() => cancelRequest.mutate({
                          requestId: req.id,
                          employeeId: req.employee_id,
                          tenantId: tenantId!,
                        })}>
                          <Ban className="h-4 w-4 mr-2" /> Cancel Request
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Document is blurry / expired / wrong type..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">This reason will be shown to the employee so they can re-upload.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={!rejectReason.trim() || rejectRequest.isPending}
                onClick={handleReject}
              >
                Reject Document
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
