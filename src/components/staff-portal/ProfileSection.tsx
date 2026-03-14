import { format } from "date-fns";
import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NotificationPreferences } from "@/components/settings/NotificationPreferences";

interface ProfileSectionProps {
  employeeData: {
    forename?: string;
    surname?: string;
    department?: string;
    pay_type?: string;
    start_date?: string;
    status?: string;
  } | null;
  onSignOut: () => void;
}

export function ProfileSection({ employeeData, onSignOut }: ProfileSectionProps) {
  const employeeName = employeeData ? `${employeeData.forename} ${employeeData.surname}` : "";

  return (
    <div className="space-y-4">
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

      {/* Notification Preferences */}
      <NotificationPreferences />

      {/* Sign Out */}
      <button
        onClick={onSignOut}
        className="flex items-center gap-3 w-full p-3.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/5 active:bg-destructive/10 transition-colors"
      >
        <LogOut className="h-5 w-5" />
        Sign Out
      </button>
    </div>
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
