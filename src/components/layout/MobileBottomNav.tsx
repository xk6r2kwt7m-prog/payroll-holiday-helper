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
  AlertTriangle,
  GraduationCap,
  ShieldAlert,
  Megaphone,
  PieChart,
  Scale,
  ClipboardList,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { ModuleKey } from "@/components/ProtectedRoute";
import { getRoleLevel } from "@/lib/roles";

type MinRole = "admin" | "manager" | "supervisor" | "staff" | "viewer";

interface NavDef {
  icon: any;
  label: string;
  path: string;
  minRole: MinRole;
  module?: ModuleKey;
}

const mainNavItems: NavDef[] = [
  { icon: LayoutDashboard, label: "Home", path: "/", minRole: "viewer" },
  { icon: Users, label: "People", path: "/employees", minRole: "supervisor" },
  { icon: CalendarClock, label: "Schedule", path: "/schedule", minRole: "staff", module: "scheduling" },
  { icon: DollarSign, label: "Payroll", path: "/payroll", minRole: "admin", module: "payroll" },
];

const peopleRoutes = ["/employees", "/absences", "/onboarding", "/training", "/disciplinary"];

interface MoreGroup {
  title: string;
  items: NavDef[];
}

const moreGroups: MoreGroup[] = [
  {
    title: "Schedule",
    items: [
      { icon: ClipboardCheck, label: "Timesheets", path: "/timesheets", minRole: "supervisor" },
      { icon: ClipboardList, label: "Schedule Report", path: "/schedule/report", minRole: "manager" },
      { icon: BarChart3, label: "Schedule Analytics", path: "/schedule/analytics", minRole: "manager" },
    ],
  },
  {
    title: "Payroll",
    items: [
      { icon: CalendarDays, label: "Payroll Calendar", path: "/payroll/calendar", minRole: "admin" },
      { icon: PieChart, label: "Payroll Analytics", path: "/payroll/analytics", minRole: "admin" },
      { icon: AlertTriangle, label: "Overpayments", path: "/payroll/overpayments", minRole: "admin" },
    ],
  },
  {
    title: "Holidays",
    items: [
      { icon: Calendar, label: "Holidays", path: "/holidays", minRole: "staff" },
      { icon: Scale, label: "Holiday Audit", path: "/holidays/audit", minRole: "admin" },
    ],
  },
  {
    title: "People",
    items: [
      { icon: UserX, label: "Absences", path: "/absences", minRole: "manager" },
      { icon: UserPlus, label: "Onboarding", path: "/onboarding", minRole: "manager" },
      { icon: GraduationCap, label: "Training", path: "/training", minRole: "staff" },
      { icon: ShieldAlert, label: "Disciplinary", path: "/disciplinary", minRole: "admin" },
    ],
  },
  {
    title: "Admin",
    items: [
      { icon: Megaphone, label: "Announcements", path: "/announcements", minRole: "staff" },
      { icon: Sparkles, label: "Talent Pool", path: "/talent-pool", minRole: "staff" },
      { icon: FileText, label: "Contracts", path: "/contracts", minRole: "admin" },
      { icon: MapPin, label: "Locations", path: "/locations", minRole: "admin" },
      { icon: Settings, label: "Admin Centre", path: "/settings", minRole: "admin" },
    ],
  },
];

export function MobileBottomNav() {
  const location = useLocation();
  const { role, signOut } = useAuth();
  const { enabledModules, isPlatformAdmin } = useTenant();
  const [moreOpen, setMoreOpen] = useState(false);

  const userLevel = getRoleLevel(role);
  const canAccess = (minRole: MinRole) => userLevel >= getRoleLevel(minRole);
  const isModuleEnabled = (mod?: ModuleKey) => {
    if (!mod || isPlatformAdmin) return true;
    if (!enabledModules) return true;
    return enabledModules[mod] !== false;
  };

  // Filter main nav items by role and module
  const visibleMainNav = mainNavItems.filter(item => canAccess(item.minRole) && isModuleEnabled(item.module));

  // Filter more groups by role, removing empty groups
  const visibleMoreGroups = moreGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => canAccess(item.minRole) && isModuleEnabled(item.module)),
    }))
    .filter(group => group.items.length > 0);

  const allMorePaths = visibleMoreGroups.flatMap(g => g.items.map(i => i.path));
  const isMoreActive = allMorePaths.some(p => location.pathname === p);

  const isNavActive = (item: NavDef) => {
    if (item.path === "/employees") {
      return peopleRoutes.some(r => location.pathname === r);
    }
    if (item.path === "/") return location.pathname === "/";
    return location.pathname.startsWith(item.path);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border pb-safe">
        <div className="flex items-center justify-around px-1 h-16">
          {visibleMainNav.map((item) => {
            const isActive = isNavActive(item);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-xl transition-colors min-h-[48px]",
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
          {visibleMoreGroups.length > 0 && (
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <button
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-xl transition-colors min-h-[48px]",
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
              <SheetContent side="bottom" className="rounded-t-2xl pb-safe max-h-[80vh] overflow-y-auto">
                <div className="pt-2 pb-4">
                  <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />

                  {visibleMoreGroups.map((group, gi) => (
                    <div key={group.title} className={cn(gi > 0 && "mt-3")}>
                      <p className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {group.title}
                      </p>
                      {group.items.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setMoreOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-colors min-h-[48px]",
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
                    </div>
                  ))}

                  <div className="border-t border-border mt-3 pt-2">
                    <button
                      onClick={() => {
                        setMoreOpen(false);
                        signOut();
                      }}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-destructive w-full hover:bg-destructive/5 active:bg-destructive/10 min-h-[48px]"
                    >
                      <LogOut className="h-5 w-5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </nav>
    </>
  );
}
