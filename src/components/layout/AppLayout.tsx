import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MobileBottomNav } from "./MobileBottomNav";
import { useAuth } from "@/hooks/useAuth";
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
  Shield,
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AppLayoutProps {
  children: ReactNode;
}

const primaryNavItems = [
  { label: "Dashboard", path: "/" },
  { label: "Employees", path: "/employees" },
  { label: "Schedule", path: "/schedule" },
  { label: "Timesheets", path: "/timesheets" },
  { label: "Payroll", path: "/payroll" },
  { label: "Holidays", path: "/holidays" },
];

const moreNavItems = [
  { icon: BarChart3, label: "Schedule Report", path: "/schedule/report" },
  { icon: BarChart3, label: "Schedule Analytics", path: "/schedule/analytics" },
  { icon: CalendarDays, label: "Payroll Calendar", path: "/payroll/calendar" },
  { icon: BarChart3, label: "Payroll Analytics", path: "/payroll/analytics" },
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

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();
  const { data: settings } = useCompanySettings();
  const companyName = settings?.company_name || "UGLŌ";

  const isMoreActive = moreNavItems.some((item) => location.pathname === item.path);

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
          {primaryNavItems.map((item) => {
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative px-3.5 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="topnav-active"
                    className="absolute bottom-0 left-1 right-1 h-0.5 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}

          {/* More dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
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
              {moreNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <DropdownMenuItem key={item.path} asChild>
                    <Link
                      to={item.path}
                      className={cn(
                        "gap-2",
                        isActive && "bg-accent text-accent-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
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
            {isAdmin && <Shield className="h-3.5 w-3.5 text-primary" />}
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

      {/* Main content — fullscreen, no sidebar margin */}
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

      {/* Mobile bottom nav */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
}
