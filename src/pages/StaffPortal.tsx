import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import {
  Clock, LogOut, AlertCircle, FileText, User, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProfileSection } from "@/components/staff-portal/ProfileSection";
import { TimesheetsSection } from "@/components/staff-portal/TimesheetsSection";
import { DocumentsSection } from "@/components/staff-portal/DocumentsSection";
import { ReadinessBanner } from "@/components/staff-portal/ReadinessBanner";
import { StaffTrainingView } from "@/components/training/StaffTrainingView";

const anim = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

type Section = "profile" | "timesheets" | "documents" | "training";

const sections: { id: Section; icon: any; label: string }[] = [
  { id: "profile", icon: User, label: "Profile" },
  { id: "timesheets", icon: Clock, label: "Timesheets" },
  { id: "training", icon: BookOpen, label: "Training" },
  { id: "documents", icon: FileText, label: "Documents" },
];

export default function StaffPortal() {
  const { signOut } = useAuth();
  const { employee, employeeId, employeeName, isLinked, isLoading } = useCurrentEmployee();
  const [activeSection, setActiveSection] = useState<Section>("profile");

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  if (!isLinked || !employeeId) {
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

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto pb-24 space-y-5">
        {/* Profile Header */}
        <motion.div {...anim} transition={{ duration: 0.25 }}>
          <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-primary">
                  {employee?.forename?.[0]}{employee?.surname?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-foreground truncate">{employeeName}</h1>
                <p className="text-sm text-muted-foreground">
                  {employee?.department} · {employee?.status === "active" ? "Active" : employee?.status}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Readiness Banner — only shows when incomplete */}
        <motion.div {...anim} transition={{ duration: 0.25, delay: 0.02 }}>
          <ReadinessBanner employeeId={employeeId} />
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
              </button>
            ))}
          </div>
        </motion.div>

        {/* Section Content */}
        <motion.div key={activeSection} {...anim} transition={{ duration: 0.25 }}>
          {activeSection === "profile" && (
            <ProfileSection employeeData={employee} onSignOut={signOut} />
          )}
          {activeSection === "timesheets" && <TimesheetsSection />}
          {activeSection === "training" && <StaffTrainingView employeeId={employeeId} />}
          {activeSection === "documents" && <DocumentsSection employeeId={employeeId} />}
        </motion.div>
      </div>
    </AppLayout>
  );
}
