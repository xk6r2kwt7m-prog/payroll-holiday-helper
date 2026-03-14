import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Clock, LogOut, Calendar, CheckCircle2, AlertCircle, Megaphone, FileText,
  Upload, Sun, User, ChevronRight, Shield, Phone, Building2, GraduationCap,
  Bell, Settings,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { HolidayRequestForm } from "@/components/holidays/HolidayRequestForm";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { StaffEvidenceUpload } from "@/components/attendance/StaffEvidenceUpload";
import { useMyTimeEntries } from "@/hooks/useTimeEntries";
import { useMyHolidayRequests } from "@/hooks/useHolidayRequests";
import { AppLayout } from "@/components/layout/AppLayout";
import { useEmployeeDocuments, getExpiryStatus } from "@/hooks/useEmployeeDocuments";

const anim = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

export default function StaffPortal() {
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<"profile" | "requests" | "timesheets" | "documents">("profile");
  const qc = useQueryClient();

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

            {/* Quick Links */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Calendar, label: "Schedule", path: "/schedule" },
                { icon: Sun, label: "Time Off", path: "/holidays" },
                { icon: GraduationCap, label: "Training", path: "/training" },
                { icon: Megaphone, label: "Updates", path: "/announcements" },
              ].map((link) => (
                <Link key={link.label} to={link.path} className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border shadow-sm active:bg-muted transition-all">
                  <link.icon className="h-4.5 w-4.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{link.label}</span>
                </Link>
              ))}
            </div>

            {/* Announcements */}
            {announcements.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Updates</h2>
                  {unreadAnnouncements > 0 && (
                    <Badge variant="outline" className="text-[10px] text-warning border-warning/30">{unreadAnnouncements} new</Badge>
                  )}
                </div>
                {announcements.slice(0, 3).map((ann: any) => {
                  const isRead = myReadReceipts.includes(ann.id);
                  return (
                    <div key={ann.id} className={cn(
                      "p-3.5 rounded-xl border shadow-sm",
                      isRead ? "bg-card border-border" : "bg-primary/5 border-primary/20"
                    )}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{ann.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ann.content}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1.5">{format(new Date(ann.published_at), "d MMM yyyy")}</p>
                        </div>
                        {!isRead && (
                          <Button size="sm" variant="ghost" className="text-xs h-8 shrink-0 text-primary" onClick={() => markAsRead.mutate(ann.id)}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Read
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

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

        {/* Documents Section */}
        {activeSection === "documents" && (
          <motion.div {...anim} transition={{ duration: 0.25 }} className="space-y-4">
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
