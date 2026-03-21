import { Eye, MoreHorizontal, MapPin, Clock, Archive, UserMinus, MailWarning, Send } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmployeeFormDialog } from "./EmployeeFormDialog";
import { ReadinessStatusBadge } from "./OnboardingChecklist";
import { useEmployeeReadiness } from "@/hooks/useOnboardingReadiness";
import { useInviteEmail } from "@/hooks/useInviteEmail";
import { toast } from "sonner";
import { formatCurrency } from "@/hooks/useHolidays";
import { useEmployeeBranches, type BranchType } from "@/hooks/useBranches";
import type { Employee } from "@/hooks/useEmployees";
import { cn } from "@/lib/utils";
import { SensitiveField } from "@/components/ui/sensitive-field";

const statusStyles: Record<string, string> = {
  active: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300",
  starter: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300",
  onboarding: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-300",
  leaver: "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-600 dark:bg-orange-900/30 dark:text-orange-300",
  archived: "border-muted bg-muted/50 text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  starter: "Starter",
  onboarding: "Onboarding",
  leaver: "Leaver",
  archived: "Archived",
};

const deptEmoji: Record<string, string> = {
  FOH: "🍽️",
  BOH: "👨‍🍳",
  CPU: "🏭",
};

interface EmployeeCardProps {
  employee: Employee;
  isAdmin: boolean;
  canViewSensitive?: boolean;
  onArchive: (employee: Employee) => void;
  onMarkLeaver: (employee: Employee) => void;
  
  onViewDetails: (employee: Employee) => void;
  index: number;
}

export function EmployeeCard({ employee, isAdmin, canViewSensitive = false, onArchive, onMarkLeaver, onViewDetails, index }: EmployeeCardProps) {
  const { data: branches = [] } = useEmployeeBranches(employee.id);
  const isNewStarter = employee.status === "starter" || (employee.status as string) === "onboarding";
  const { data: readiness } = useEmployeeReadiness(isNewStarter ? employee.id : undefined);
  const { sendInviteEmail } = useInviteEmail();

  const isAlreadyArchived = !!employee.archived_at;
  const isLeaver = employee.status === "leaver";
  const hasEmail = !!employee.email;
  const hasNoUserLink = !employee.user_id;

  const handleSendInvite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!employee.email) {
      toast.error("No email address on file. Add an email first.");
      return;
    }
    const result = await sendInviteEmail({
      recipientEmail: employee.email,
      employeeName: `${employee.forename} ${employee.surname}`,
      tenantId: employee.tenant_id,
    });
    if (result.success) {
      toast.success(`Invite email sent to ${employee.email}`);
    } else {
      toast.error(`Invite email failed: ${result.error || "Unknown error"}`);
    }
  };

  return (
    <div
      className={cn(
        "group rounded-xl bg-card border border-border/50 shadow-card p-3.5 transition-all cursor-pointer hover:shadow-elevated hover:border-border",
        isAlreadyArchived && "opacity-60"
      )}
      onClick={() => onViewDetails(employee)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onViewDetails(employee); }}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* Row 1: Avatar + Name + Status + Actions */}
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-[13px] font-semibold">
            {employee.forename?.[0]}{employee.surname?.[0]}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
            {employee.forename} {employee.surname}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground leading-tight mt-0.5">
            <span>{deptEmoji[employee.department] || "📂"} {employee.department}</span>
            {branches.length > 0 && (
              <>
                <span className="text-border">•</span>
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {branches.find(b => b.is_primary)?.branch || branches[0]?.branch}
                </span>
              </>
            )}
          </div>
        </div>

        {isNewStarter && readiness ? (
          <ReadinessStatusBadge status={readiness.status} />
        ) : (
          <Badge variant="outline" className={cn("text-[10px] font-medium px-1.5 py-0 h-5 shrink-0", statusStyles[employee.status])}>
            {statusLabels[employee.status]}
          </Badge>
        )}

        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetails(employee); }}>
                <Eye className="h-4 w-4 mr-2" /> View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {!isLeaver && !isAlreadyArchived && (
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onMarkLeaver(employee); }}
                >
                  <UserMinus className="h-4 w-4 mr-2" /> Mark as Leaver
                </DropdownMenuItem>
              )}
              {!isAlreadyArchived && (
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onArchive(employee); }}
                >
                  <Archive className="h-4 w-4 mr-2" /> Archive
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Row 2: Compact protected pay — only for authorized */}
      {canViewSensitive && (
        <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-border flex-wrap min-w-0">
          <SensitiveField
            fieldKey={`emp-${employee.id}-hourly_rate`}
            value={formatCurrency(employee.hourly_rate)}
            category="compensation"
            employeeId={employee.id}
            size="sm"
          />
          {employee.pay_type && (
            <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5">
              {employee.pay_type}
            </Badge>
          )}
          {employee.service_charge_eligible && (
            <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 border-primary/30 text-primary">
              SC
            </Badge>
          )}
        </div>
      )}

      {/* Row 3: Contract / compliance flags */}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {!employee.email && (
          <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 border-warning/40 text-warning bg-warning/5 gap-0.5">
            <MailWarning className="h-3 w-3" />
            No email
          </Badge>
        )}
        {employee.contract_country && (
          <Badge variant="outline" className="text-[10px] h-4.5 px-1.5">
            {employee.contract_country}
          </Badge>
        )}
        {employee.employee_ref && (
          <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 text-muted-foreground">
            #{employee.employee_ref}
          </Badge>
        )}
        {employee.start_date && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            {new Date(employee.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  );
}
