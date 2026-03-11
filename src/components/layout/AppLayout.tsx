import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MobileBottomNav } from "./MobileBottomNav";
import { FloatingActionButton } from "./FloatingActionButton";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import ugloIcon from "@/assets/uglo-icon.png";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  ClipboardCheck,
  DollarSign,
  Calendar,
  Settings,
  LogOut,
  Search,
  ChevronDown,
  BarChart3,
  MapPin,
  UserX,
  UserPlus,
  GraduationCap,
  Megaphone,
  ShieldAlert,
  FileText,
  CalendarDays,
  AlertTriangle,
  ClipboardList,
  PieChart,
  Scale,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AppLayoutProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  path: string;
  minRole: "admin" | "manager" | "supervisor" | "staff" | "viewer";
  icon?: any;
  children?: NavItem[];
}

const primaryNavItems: NavItem[] = [
  { label: "Dashboard", path: "/", minRole: "staff" },
  { label: "Employees", path: "/employees", minRole: "supervisor" },
  {
    label: "Schedule",
    path: "/schedule",
    minRole: "supervisor",
    children: [
      { icon: CalendarClock, label: "Rota", path: "/schedule", minRole: "supervisor" },
      { icon: ClipboardList, label: "Report", path: "/schedule/report", minRole: "manager" },
      { icon: BarChart3, label: "Analytics", path: "/schedule/analytics", minRole: "manager" },
    ],
  },
  { label: "Timesheets", path: "/timesheets", minRole: "supervisor" },
  {
    label: "Payroll",
    path: "/payroll",
    minRole: "admin",
    children: [
      { icon: DollarSign, label: "Payroll", path: "/payroll", minRole: "admin" },
      { icon: CalendarDays, label: "Calendar", path: "/payroll/calendar", minRole: "admin" },
      { icon: PieChart, label: "Analytics", path: "/payroll/analytics", minRole: "admin" },
      { icon: AlertTriangle, label: "Overpayments", path: "/payroll/overpayments", minRole: "admin" },
    ],
  },
  {
    label: "Holidays",
    path: "/holidays",
    minRole: "manager",
    children: [
      { icon: Calendar, label: "Holiday Management", path: "/holidays", minRole: "manager" },
      { icon: Scale, label: "Holiday Audit", path: "/holidays/audit", minRole: "admin" },
    ],
  },
];

const moreNavItems: NavItem[] = [
  { icon: UserX, label: "Absences", path: "/absences", minRole: "manager" },
  { icon: UserPlus, label: "Onboarding", path: "/onboarding", minRole: "manager" },
  { icon: GraduationCap, label: "Training", path: "/training", minRole: "manager" },
  { icon: ShieldAlert, label: "Disciplinary", path: "/disciplinary", minRole: "admin" },
  { icon: Megaphone, label: "Announcements", path: "/announcements", minRole: "manager" },
  { icon: FileText, label: "Contracts", path: "/contracts", minRole: "admin" },
  { icon: MapPin, label: "Locations", path: "/locations", minRole: "admin" },
  { icon: Settings, label: "Settings", path: "/settings", minRole: "admin" },
];

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { user, isAdmin, isManagerOrAbove, isSupervisorOrAbove, role, signOut } = useAuth();
  const isMobile = useIsMobile();
  const { data: settings } = useCompanySettings();
  const companyName = settings?.company_name || "UGLŌ";

  const ROLE_LEVEL: Record<string, number> = { admin: 4, manager: 3, supervisor: 2, staff: 1, viewer: 0 };
  const userLevel = role ? (ROLE_LEVEL[role] ?? 0) : 0;
  const canAccess = (minRole: string) => userLevel >= (ROLE_LEVEL[minRole] ?? 0);

  const visibleMore = moreNavItems.filter(item => canAccess(item.minRole));
  const isMoreActive = visibleMore.some((item) => location.pathname === item.path);

  const isNavActive = (item: NavItem) => {
    if (item.children) {
      return item.children.some(child => 
        child.path === "/" ? location.pathname === "/" : location.pathname === child.path
      );
    }
    return item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
  };

  const roleBadgeColors: Record<string, string> = {
    admin: "text-primary",
    manager: "text-accent",
    supervisor: "text-warning",
    staff: "text-muted-foreground",
    viewer: "text-muted-foreground",
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top navigation bar — desktop only */}
      <header className="hidden md:flex items-center h-12 border-b border-border bg-card px-4 shrink-0 z-50">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mr-6 shrink-0">
          <img
            src={settings?.company_logo_url || ugloIcon}
            alt={companyName}
            className="h-7 w-7 rounded-lg object-cover"
          />
          <span className="text-sm font-bold text-foreground hidden lg:inline">
            {companyName}
          </span>
        </Link>

        {/* Primary nav tabs — centered */}
        <nav className="flex items-center gap-0.5 flex-1 justify-center">
          {primaryNavItems.filter(item => canAccess(item.minRole)).map((item) => {
            const active = isNavActive(item);

            // Items with children get a dropdown
            if (item.children) {
              const visibleChildren = item.children.filter(c => canAccess(c.minRole));
              if (visibleChildren.length === 0) return null;

              return (
                <DropdownMenu key={item.path}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "relative flex items-center gap-1 px-3.5 py-2 text-sm font-medium rounded-md transition-colors outline-none",
                        active
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      {item.label}
                      <ChevronDown className="h-3 w-3 opacity-50" />
                      {active && (
                        <motion.div
                          layoutId="topnav-active"
                          className="absolute bottom-0 left-1 right-1 h-0.5 bg-primary rounded-full"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-[200px]">
                    {visibleChildren.map((child) => {
                      const childActive = location.pathname === child.path;
                      return (
                        <DropdownMenuItem key={child.path} asChild>
                          <Link
                            to={child.path}
                            className={cn(
                              "gap-2.5 cursor-pointer",
                              childActive && "bg-primary/10 text-primary font-medium"
                            )}
                          >
                            {child.icon && <child.icon className="h-4 w-4" />}
                            {child.label}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            // Simple nav item
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative px-3.5 py-2 text-sm font-medium rounded-md transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {item.label}
                {active && (
                  <motion.div
                    layoutId="topnav-active"
                    className="absolute bottom-0 left-1 right-1 h-0.5 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}

          {/* More dropdown — remaining items */}
          {visibleMore.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors outline-none",
                    isMoreActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  More
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-[220px]">
                {visibleMore.map((item) => {
                  const active = location.pathname === item.path;
                  return (
                    <DropdownMenuItem key={item.path} asChild>
                      <Link
                        to={item.path}
                        className={cn(
                          "gap-2",
                          active && "bg-accent text-accent-foreground"
                        )}
                      >
                        {item.icon && <item.icon className="h-4 w-4" />}
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>

        {/* Right side — search, user, sign out */}
        <div className="flex items-center gap-2 shrink-0">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  document.dispatchEvent(
                    new KeyboardEvent("keydown", { key: "k", metaKey: true })
                  )
                }
              >
                <Search className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search (⌘K)</TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {role && (
              <span className={cn("text-xs font-medium capitalize", roleBadgeColors[role] || "text-muted-foreground")}>
                {role}
              </span>
            )}
            <span className="hidden lg:inline max-w-[120px] truncate">
              {user?.email}
            </span>
          </div>

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign Out</TooltipContent>
          </Tooltip>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="flex-1 flex flex-col px-4 py-4 sm:px-6 sm:py-6 pb-24 md:pb-6"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom nav + FAB (hidden on schedule page which has its own controls) */}
      <div className="md:hidden">
        <MobileBottomNav />
        {isMobile && !location.pathname.startsWith("/schedule") && <FloatingActionButton />}
      </div>
    </div>
  );
}