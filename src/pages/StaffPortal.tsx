import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Clock, LogOut, CheckCircle2, AlertCircle, AlertTriangle, FileText,
  User, BookOpen,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { StaffEvidenceUpload } from "@/components/attendance/StaffEvidenceUpload";
import { StaffDocumentRequests } from "@/components/documents/StaffDocumentRequests";
import { useMyTimeEntries } from "@/hooks/useTimeEntries";
import { AppLayout } from "@/components/layout/AppLayout";
import { useEmployeeDocuments, getExpiryStatus } from "@/hooks/useEmployeeDocuments";
import { StaffTrainingView } from "@/components/training/StaffTrainingView";

const anim = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

export default function StaffPortal() {
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<"profile" | "timesheets" | "documents" | "training">("profile");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("employees")
      .select("id, forename, surname, department, status, start_date, hourly_rate, pay_type")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) { setEmployeeId(data.id); setEmployeeData(data); }
      });
  }, [user]);

  const { data: myEntries } = useMyTimeEntries();
  const { data: myRequests = [] } = useMyHolidayRequests(employeeId || "");

  const { data: announcements = [] } = useQuery({
    queryKey: ["staff_announcements_portal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_announcements" as any)
        .select("*")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: myReadReceipts = [] } = useQuery({
    queryKey: ["my_read_receipts", employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from("announcement_read_receipts" as any)
        .select("announcement_id")
        .eq("employee_id", employeeId);
      if (error) throw error;
      return (data || []).map((r: any) => r.announcement_id);
    },
    enabled: !!employeeId,
  });

  const markAsRead = useMutation({
    mutationFn: async (announcementId: string) => {
      if (!employeeId) return;
      const { error } = await supabase
        .from("announcement_read_receipts" as any)
        .insert({ announcement_id: announcementId, employee_id: employeeId } as any);
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my_read_receipts"] }),
  });

  if (!employeeId) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <div className="text-center max-w-sm">
            <AlertCircle className="h-12 w-12 text-warning mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-2">Account Not Linked</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your account hasn't been linked to an employee record. Contact your manager.
            </p>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const employeeName = employeeData ? `${employeeData.forename} ${employeeData.surname}` : "";
  const pendingRequests = myRequests.filter(r => r.status === "pending").length;
  const unreadAnnouncements = announcements.filter((a: any) => !myReadReceipts.includes(a.id)).length;

  const sections = [
    { id: "profile" as const, icon: User, label: "Profile" },
    { id: "requests" as const, icon: Sun, label: "Requests", badge: pendingRequests },
    { id: "timesheets" as const, icon: Clock, label: "Timesheets" },
    { id: "training" as const, icon: BookOpen, label: "Training" },
    { id: "documents" as const, icon: FileText, label: "Documents" },
  ];

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto pb-24 space-y-5">
        {/* Profile Header */}
        <motion.div {...anim} transition={{ duration: 0.25 }}>
          <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-primary">
                  {employeeData?.forename?.[0]}{employeeData?.surname?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-foreground truncate">{employeeName}</h1>
                <p className="text-sm text-muted-foreground">
                  {employeeData?.department} · {employeeData?.status === "active" ? "Active" : employeeData?.status}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section Tabs */}
        <motion.div {...anim} transition={{ duration: 0.25, delay: 0.04 }}>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all min-h-[44px]",
                  activeSection === s.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-card border border-border text-muted-foreground active:bg-muted"
                )}
              >
                <s.icon className="h-4 w-4" />
                {s.label}
                {s.badge && s.badge > 0 && (
                  <span className="ml-1 h-5 min-w-[20px] rounded-full bg-warning/20 text-warning text-[10px] font-bold flex items-center justify-center px-1">
                    {s.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Profile Section */}
        {activeSection === "profile" && (
          <motion.div {...anim} transition={{ duration: 0.25 }} className="space-y-4">
            {/* Personal Details */}
            <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Personal Details</h2>
              </div>
              <div className="divide-y divide-border">
                <ProfileRow label="Full Name" value={employeeName} />
                <ProfileRow label="Department" value={employeeData?.department} />
                <ProfileRow label="Pay Type" value={employeeData?.pay_type === "hourly" ? "Hourly" : "Salaried"} />
                <ProfileRow label="Start Date" value={employeeData?.start_date ? format(new Date(employeeData.start_date), "d MMM yyyy") : "—"} />
                <ProfileRow label="Status" value={employeeData?.status} badge />
              </div>
            </div>

            {/* Sign Out */}
            <button
              onClick={signOut}
              className="flex items-center gap-3 w-full p-3.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/5 active:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4.5 w-4.5" />
              Sign Out
            </button>
          </motion.div>
        )}

        {/* Requests Section */}
        {activeSection === "requests" && (
          <motion.div {...anim} transition={{ duration: 0.25 }}>
            {employeeId && <HolidayRequestForm employeeId={employeeId} employeeName={employeeName} />}
          </motion.div>
        )}

        {/* Timesheets Section */}
        {activeSection === "timesheets" && (
          <motion.div {...anim} transition={{ duration: 0.25 }} className="space-y-2">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Recent Timesheets</h2>
            {!myEntries || myEntries.length === 0 ? (
              <EmptyState icon={Clock} message="No recent timesheets" />
            ) : (
              myEntries.slice(0, 20).map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border shadow-sm">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {format(new Date(entry.clock_in_time), "EEE d MMM")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(entry.clock_in_time), "HH:mm")}
                      {entry.clock_out_time ? ` – ${format(new Date(entry.clock_out_time), "HH:mm")}` : " – on shift"}
                      {entry.total_hours ? ` · ${entry.total_hours}h` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px]", {
                    "text-warning border-warning/30": entry.status === "pending",
                    "text-success border-success/30": entry.status === "approved",
                    "text-destructive border-destructive/30": entry.status === "rejected",
                    "text-primary border-primary/30": entry.status === "clocked_in",
                  })}>
                    {entry.status === "clocked_in" ? "Active" : entry.status}
                  </Badge>
                </div>
              ))
            )}
          </motion.div>
        )}

        {/* Training Section */}
        {activeSection === "training" && (
          <motion.div {...anim} transition={{ duration: 0.25 }}>
            {employeeId && <StaffTrainingView employeeId={employeeId} />}
          </motion.div>
        )}

        {/* Documents Section */}
        {activeSection === "documents" && (
          <motion.div {...anim} transition={{ duration: 0.25 }} className="space-y-4">
            {employeeId && <StaffDocumentRequests employeeId={employeeId} />}
            {employeeId && <StaffDocumentView employeeId={employeeId} />}
            {employeeId && <StaffEvidenceUpload employeeId={employeeId} />}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}

function ProfileRow({ label, value, badge }: { label: string; value?: string; badge?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      {badge ? (
        <Badge variant="outline" className="text-[10px] text-success border-success/30 capitalize">{value}</Badge>
      ) : (
        <span className="text-sm font-medium text-foreground">{value || "—"}</span>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function StaffDocumentView({ employeeId }: { employeeId: string }) {
  const { data: documents = [], isLoading } = useEmployeeDocuments(employeeId);

  if (isLoading) {
    return <div className="text-center py-8 text-sm text-muted-foreground">Loading documents...</div>;
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-xl bg-card border border-border p-6 text-center">
        <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
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
            const warnings: any[] = docAny.extraction_warnings || [];
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
