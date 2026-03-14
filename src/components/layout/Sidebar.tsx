import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ugloIcon from "@/assets/uglo-icon.png";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarDays,
  DollarSign,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  FileText,
  CalendarClock,
  ClipboardCheck,
  BarChart3,
  MapPin,
  Search,
  UserX,
  UserPlus,
  GraduationCap,
  Megaphone,
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  Globe,
  Building2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ModuleKey } from "@/components/ProtectedRoute";
import { getRoleLevel } from "@/lib/roles";

interface SideNavItem {
  icon: any;
  label: string;
  path: string;
  minRole: string;
  /** Module that must be enabled for this nav item to show */
  module?: ModuleKey;
}

const navItems: SideNavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", minRole: "viewer" },
  { icon: Users, label: "Employees", path: "/employees", minRole: "supervisor" },
  { icon: CalendarClock, label: "Schedule", path: "/schedule", minRole: "staff", module: "scheduling" },
  { icon: ClipboardCheck, label: "Timesheets", path: "/timesheets", minRole: "supervisor", module: "scheduling" },
  { icon: BarChart3, label: "Schedule Report", path: "/schedule/report", minRole: "manager", module: "scheduling" },
  { icon: BarChart3, label: "Analytics", path: "/schedule/analytics", minRole: "manager", module: "analytics" },
  { icon: DollarSign, label: "Payroll", path: "/payroll", minRole: "admin", module: "payroll" },
  { icon: CalendarDays, label: "Payroll Calendar", path: "/payroll/calendar", minRole: "admin", module: "payroll" },
  { icon: BarChart3, label: "Payroll Analytics", path: "/payroll/analytics", minRole: "admin", module: "payroll" },
  { icon: AlertTriangle, label: "Overpayments", path: "/payroll/overpayments", minRole: "admin", module: "payroll" },
  { icon: ShieldCheck, label: "Payroll Audit", path: "/payroll/audit", minRole: "admin", module: "payroll" },
  { icon: Calendar, label: "Holidays", path: "/holidays", minRole: "staff" },
  { icon: ClipboardCheck, label: "Holiday Audit", path: "/holidays/audit", minRole: "admin" },
  { icon: UserX, label: "Absences", path: "/absences", minRole: "manager" },
  { icon: Building2, label: "Workforce", path: "/workforce", minRole: "manager" },
  { icon: UserPlus, label: "Onboarding", path: "/onboarding", minRole: "manager" },
  { icon: GraduationCap, label: "Training", path: "/training", minRole: "staff", module: "training" },
  { icon: ShieldAlert, label: "Disciplinary", path: "/disciplinary", minRole: "admin" },
  { icon: Megaphone, label: "Announcements", path: "/announcements", minRole: "staff" },
  { icon: FileText, label: "Contracts", path: "/contracts", minRole: "admin", module: "documents" },
  { icon: MapPin, label: "Locations", path: "/locations", minRole: "admin" },
  { icon: Sparkles, label: "Talent Pool", path: "/talent-pool", minRole: "staff" },
  { icon: Settings, label: "Admin Centre", path: "/settings", minRole: "admin" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, isAdmin, role, signOut } = useAuth();
  const { isPlatformAdmin, enabledModules, tenantName, availableTenants } = useTenant();
  const { data: settings } = useCompanySettings();
  const companyName = settings?.company_name || tenantName || "UGLŌ";

  const userLevel = getRoleLevel(role);
  const canAccess = (minRole: string) => userLevel >= getRoleLevel(minRole);

  const isModuleEnabled = (module?: ModuleKey) => {
    if (!module) return true;
    if (isPlatformAdmin) return true;
    if (!enabledModules) return true;
    return enabledModules[module] !== false;
  };

  const visibleNavItems = navItems.filter(
    (item) => canAccess(item.minRole) && isModuleEnabled(item.module)
  );

  const hasMultipleTenants = availableTenants.length > 1;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out z-50",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-3">
            <img 
              src={settings?.company_logo_url || ugloIcon} 
              alt={companyName} 
              className="h-10 w-10 rounded-xl object-cover" 
            />
            {!collapsed && (
              <span className="text-lg font-semibold text-sidebar-foreground animate-fade-in truncate">
                {companyName}
              </span>
            )}
          </div>
        </div>

        {/* User Info */}
        {!collapsed && user && (
          <div className="border-b border-sidebar-border px-4 py-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user.email}
              </p>
              {isAdmin && (
                <Shield className="h-4 w-4 text-sidebar-primary flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-sidebar-foreground/60 capitalize">
              {role || "Viewer"}
              {isPlatformAdmin && " · Platform Admin"}
            </p>
            {hasMultipleTenants && (
              <Link
                to="/select-workspace"
                className="mt-1 flex items-center gap-1 text-xs text-sidebar-primary hover:underline"
              >
                <Building2 className="h-3 w-3" />
                Switch Workspace
              </Link>
            )}
          </div>
        )}

        {/* Search trigger */}
        <div className="px-3 py-2">
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors hover:bg-sidebar-accent",
              collapsed && "justify-center"
            )}
          >
            <Search className="h-5 w-5 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Search…</span>
                <kbd className="rounded bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-mono text-sidebar-foreground/50">⌘K</kbd>
              </>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-3 py-2 overflow-y-auto scrollbar-none">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const linkContent = (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                  isActive
                    ? "text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg bg-sidebar-accent"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <item.icon className="relative z-10 h-5 w-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="relative z-10 animate-fade-in">{item.label}</span>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path} delayDuration={0}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={12}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.path}>{linkContent}</div>;
          })}

          {/* Platform Admin link */}
          {isPlatformAdmin && (
            (() => {
              const isActive = location.pathname === "/platform-admin";
              const linkContent = (
                <Link
                  to="/platform-admin"
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 mt-2 border-t border-sidebar-border pt-3",
                    isActive
                      ? "text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-lg bg-sidebar-accent"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Globe className="relative z-10 h-5 w-5 flex-shrink-0" />
                  {!collapsed && (
                    <span className="relative z-10 animate-fade-in">Platform Admin</span>
                  )}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={12}>Platform Admin</TooltipContent>
                  </Tooltip>
                );
              }
              return linkContent;
            })()
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3 space-y-2">
          <Button
            variant="ghost"
            onClick={signOut}
            className={cn(
              "w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span className="ml-3">Sign Out</span>}
          </Button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-lg py-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
