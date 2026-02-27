import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Calendar,
  MoreHorizontal,
  FileText,
  CalendarDays,
  CalendarClock,
  ClipboardCheck,
  Settings,
  LogOut,
  BarChart3,
  MapPin,
  UserX,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const mainNavItems = [
  { icon: LayoutDashboard, label: "Home", path: "/" },
  { icon: CalendarClock, label: "Schedule", path: "/schedule" },
  { icon: ClipboardCheck, label: "Timesheets", path: "/timesheets" },
  { icon: DollarSign, label: "Payroll", path: "/payroll" },
];

const moreNavItems = [
  { icon: Users, label: "Employees", path: "/employees" },
  { icon: Calendar, label: "Holidays", path: "/holidays" },
  { icon: BarChart3, label: "Schedule Report", path: "/schedule/report" },
  { icon: BarChart3, label: "Schedule Analytics", path: "/schedule/analytics" },
  { icon: CalendarDays, label: "Payroll Calendar", path: "/payroll/calendar" },
  { icon: BarChart3, label: "Payroll Analytics", path: "/payroll/analytics" },
  { icon: AlertTriangle, label: "Overpayments", path: "/payroll/overpayments" },
  { icon: ClipboardCheck, label: "Holiday Audit", path: "/holidays/audit" },
  { icon: UserX, label: "Absences", path: "/absences" },
  { icon: UserPlus, label: "Onboarding", path: "/onboarding" },
  { icon: GraduationCap, label: "Training", path: "/training" },
  { icon: ShieldAlert, label: "Disciplinary", path: "/disciplinary" },
  { icon: Megaphone, label: "Announcements", path: "/announcements" },
  { icon: FileText, label: "Contracts", path: "/contracts" },
  { icon: MapPin, label: "Locations", path: "/locations" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function MobileBottomNav() {
  const location = useLocation();
  const { signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = moreNavItems.some(item => location.pathname === item.path);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border pb-safe">
        <div className="flex items-center justify-around px-2 h-16">
          {mainNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-xl transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground active:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />
                )}
              </Link>
            );
          })}

          {/* More button */}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-xl transition-colors",
                  isMoreActive
                    ? "text-primary"
                    : "text-muted-foreground active:text-foreground"
                )}
              >
                <MoreHorizontal className={cn("h-5 w-5", isMoreActive && "stroke-[2.5px]")} />
                <span className="text-[10px] font-medium leading-none">More</span>
                {isMoreActive && (
                  <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
              <div className="pt-2 pb-4 space-y-1">
                <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />
                {moreNavItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted active:bg-muted"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  );
                })}
                <div className="border-t border-border my-2" />
                <button
                  onClick={() => {
                    setMoreOpen(false);
                    signOut();
                  }}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-destructive w-full hover:bg-destructive/5 active:bg-destructive/10"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}