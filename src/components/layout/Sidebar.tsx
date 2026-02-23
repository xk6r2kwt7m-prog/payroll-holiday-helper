import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Users, label: "Employees", path: "/employees" },
  { icon: CalendarClock, label: "Schedule", path: "/schedule" },
  { icon: ClipboardCheck, label: "Timesheets", path: "/timesheets" },
  { icon: BarChart3, label: "Schedule Report", path: "/schedule/report" },
  { icon: BarChart3, label: "Analytics", path: "/schedule/analytics" },
  { icon: DollarSign, label: "Payroll", path: "/payroll" },
  { icon: CalendarDays, label: "Payroll Calendar", path: "/payroll/calendar" },
  { icon: BarChart3, label: "Payroll Analytics", path: "/payroll/analytics" },
  { icon: Calendar, label: "Holidays", path: "/holidays" },
  { icon: ClipboardCheck, label: "Holiday Audit", path: "/holidays/audit" },
  { icon: FileText, label: "Contracts", path: "/contracts" },
  { icon: MapPin, label: "Locations", path: "/locations" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();

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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-2xl">
              🥟
            </div>
            {!collapsed && (
              <span className="text-lg font-semibold text-sidebar-foreground animate-fade-in">
                Ugly Dumpling
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
            <p className="text-xs text-sidebar-foreground/60">
              {isAdmin ? "Administrator" : "Viewer"}
            </p>
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
          {navItems.map((item) => {
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
