import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, UserPlus, Plus, MoreHorizontal, ChevronRight,
  Calendar, BookOpen, AlertTriangle, FileText, Shield,
  Megaphone, ClipboardCheck, Scale, UserCheck, Clock,
  Baby, Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEmployees, type Employee } from "@/hooks/useEmployees";
import { useAllHolidayRequests } from "@/hooks/useHolidayRequests";
import { EmployeeFormDialog } from "@/components/employees/EmployeeFormDialog";
import { InviteEmployeeDialog } from "@/components/employees/InviteEmployeeDialog";
import { usePermission } from "@/hooks/useRolePermissions";
import { TALENT_POOL_ROUTE } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import {
  getPeopleDashboardCounts,
  isRelevantForOnboardingAttention,
  isFormerEmployee,
} from "@/lib/employee-lifecycle-display";

const anim = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

export function PeopleDashboard({ onViewDirectory }: { onViewDirectory: () => void }) {
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const { data: employees = [] } = useEmployees();
  const { data: allEmployeesIncArchived = [] } = useEmployees(true);
  const { data: holidayRequests = [] } = useAllHolidayRequests();
  const canEdit = usePermission("edit_employees");

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Count off-today (approved holidays for today)
  const offToday = useMemo(() => {
    return holidayRequests.filter((r: any) =>
      r.status === "approved" &&
      r.start_date <= todayStr &&
      r.end_date >= todayStr
    ).length;
  }, [holidayRequests, todayStr]);

  const counts = useMemo(() => ({
    active: employees.filter(e => e.status === "active" && !e.archived_at).length,
    starters: employees.filter(e => e.status === "starter" && !e.archived_at).length,
    onboarding: employees.filter(e => (e.status as string) === "onboarding" && !e.archived_at).length,
    offToday,
  }), [employees, offToday]);

  // Needs attention queries
  const { data: overdueTraining = [] } = useQuery({
    queryKey: ["overdue_training_count", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from("training_assignments")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("status", "assigned")
        .lt("due_date", todayStr);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: pendingDocRequests = [] } = useQuery({
    queryKey: ["pending_doc_requests_count", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from("document_requests")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("status", "pending");
      return data || [];
    },
    enabled: !!tenantId,
  });

  const pendingLeave = useMemo(() =>
    holidayRequests.filter((r: any) => r.status === "pending").length,
    [holidayRequests]
  );

  const incompleteOnboarding = useMemo(() =>
    employees.filter(e => (e.status as string) === "onboarding" || e.status === "starter").length,
    [employees]
  );

  // Summary cards
  const summaryCards = [
    { label: "Active", value: counts.active, color: "text-success", bg: "bg-success/10", icon: UserCheck },
    { label: "Starters", value: counts.starters, color: "text-primary", bg: "bg-primary/10", icon: Plus },
    { label: "Onboarding", value: counts.onboarding, color: "text-accent", bg: "bg-accent/10", icon: ClipboardCheck },
    { label: "Off today", value: counts.offToday, color: "text-warning", bg: "bg-warning/10", icon: Calendar },
  ];

  // Quick actions
  const quickActions = [
    { icon: Calendar, label: "Leave Management", desc: "Approvals, balances and requests", path: "/holidays", color: "text-primary", bg: "bg-primary/8" },
    { icon: Briefcase, label: "Onboarding", desc: "New starters and setup tasks", path: "/onboarding", color: "text-accent", bg: "bg-accent/8" },
    { icon: BookOpen, label: "Training", desc: "Learning, compliance and records", path: "/training", color: "text-success", bg: "bg-success/8" },
    { icon: Baby, label: "Absences", desc: "Sickness, lateness and attendance", path: "/timesheets", color: "text-destructive", bg: "bg-destructive/8" },
  ];

  // Needs attention alerts
  const alerts: { icon: any; label: string; color: string; bg: string; path: string }[] = [];
  if (incompleteOnboarding > 0) {
    alerts.push({ icon: ClipboardCheck, label: `${incompleteOnboarding} incomplete onboarding`, color: "text-accent", bg: "bg-accent/10", path: "/onboarding" });
  }
  if (overdueTraining.length > 0) {
    alerts.push({ icon: BookOpen, label: `${overdueTraining.length} overdue training`, color: "text-destructive", bg: "bg-destructive/10", path: "/training" });
  }
  if (pendingLeave > 0) {
    alerts.push({ icon: Calendar, label: `${pendingLeave} pending leave request${pendingLeave !== 1 ? "s" : ""}`, color: "text-warning", bg: "bg-warning/10", path: "/holidays" });
  }
  if (pendingDocRequests.length > 0) {
    alerts.push({ icon: FileText, label: `${pendingDocRequests.length} missing document${pendingDocRequests.length !== 1 ? "s" : ""}`, color: "text-primary", bg: "bg-primary/10", path: "/employees?status=onboarding" });
  }

  // People operations
  const operationsLinks = [
    { icon: Users, label: "Talent Pool", desc: "Search and manage candidates", path: `${TALENT_POOL_ROUTE}?tab=browse` },
    { icon: Shield, label: "Disciplinary", desc: "Records and actions", path: "/disciplinary" },
    { icon: Megaphone, label: "Announcements", desc: "Team communications", path: "/announcements" },
    { icon: Scale, label: "Leave Audit", desc: "Balances and history", path: "/holidays?tab=audit" },
  ];

  // Employee preview — first 5 active
  const previewEmployees = useMemo(() =>
    employees
      .filter(e => e.status === "active" && !e.archived_at)
      .slice(0, 5),
    [employees]
  );

  return (
    <div className="space-y-5 max-w-lg mx-auto pb-24 min-w-0 overflow-x-hidden">
      {/* Header */}
      <motion.div {...anim} transition={{ duration: 0.25 }}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-foreground">People</h1>
            <p className="text-sm text-muted-foreground">Manage your team, starters, leave and development</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {canEdit && <EmployeeFormDialog />}
            {canEdit && (
              <InviteEmployeeDialog
                trigger={
                  <Button size="icon" variant="outline" className="h-9 w-9">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                }
              />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-9 w-9">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onViewDirectory}>View all employees</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>Team settings</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.div>

      {/* Summary cards — 2×2 */}
      <motion.div {...anim} transition={{ duration: 0.25, delay: 0.02 }}>
        <div className="grid grid-cols-2 gap-2.5">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl bg-card border border-border p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", card.bg)}>
                  <card.icon className={cn("h-4 w-4", card.color)} />
                </div>
              </div>
              <p className={cn("text-2xl font-bold tabular-nums", card.color)}>{card.value}</p>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Quick actions — 2 col */}
      <motion.div {...anim} transition={{ duration: 0.25, delay: 0.04 }}>
        <div className="grid grid-cols-2 gap-2.5">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.path}
              className="rounded-2xl bg-card border border-border p-4 shadow-sm active:bg-muted transition-all"
            >
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-3", action.bg)}>
                <action.icon className={cn("h-5 w-5", action.color)} />
              </div>
              <p className="text-sm font-semibold text-foreground">{action.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{action.desc}</p>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Needs attention */}
      {alerts.length > 0 && (
        <motion.div {...anim} transition={{ duration: 0.25, delay: 0.06 }}>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Needs attention</h2>
          <div className="space-y-1.5">
            {alerts.map((alert, i) => (
              <Link
                key={i}
                to={alert.path}
                className={cn(
                  "flex items-center gap-3 p-3.5 rounded-xl border border-border shadow-sm active:bg-muted transition-all",
                  alert.bg
                )}
              >
                <alert.icon className={cn("h-4.5 w-4.5 shrink-0", alert.color)} />
                <span className="text-sm font-medium text-foreground flex-1">{alert.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* People operations */}
      <motion.div {...anim} transition={{ duration: 0.25, delay: 0.08 }}>
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">People operations</h2>
        <div className="space-y-1.5">
          {operationsLinks.map((op) => (
            <Link
              key={op.label}
              to={op.path}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border shadow-sm active:bg-muted transition-all"
            >
              <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <op.icon className="h-4 w-4 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{op.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{op.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Employee preview */}
      {previewEmployees.length > 0 && (
        <motion.div {...anim} transition={{ duration: 0.25, delay: 0.1 }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Your team</h2>
            <button
              onClick={onViewDirectory}
              className="text-xs text-primary font-medium flex items-center gap-0.5"
            >
              View all <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-1.5">
            {previewEmployees.map((emp) => (
              <Link
                key={emp.id}
                to={`/employees?edit=${emp.id}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border shadow-sm active:bg-muted transition-all"
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                    {emp.forename?.[0]}{emp.surname?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {emp.forename} {emp.surname}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{emp.department}</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0 bg-success/10 text-success border-success/20">
                  Active
                </Badge>
              </Link>
            ))}
          </div>
          <button
            onClick={onViewDirectory}
            className="w-full mt-2.5 py-3 rounded-xl bg-card border border-border text-sm font-medium text-primary active:bg-muted transition-all shadow-sm"
          >
            View all employees →
          </button>
        </motion.div>
      )}
    </div>
  );
}
