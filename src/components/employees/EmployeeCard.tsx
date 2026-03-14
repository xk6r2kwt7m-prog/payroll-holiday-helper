import { Edit2, Trash2, Eye, MoreHorizontal, MapPin, Clock } from "lucide-react";
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
import { formatCurrency } from "@/hooks/useHolidays";
import { useEmployeeBranches, type BranchType } from "@/hooks/useBranches";
import type { Employee } from "@/hooks/useEmployees";
import { cn } from "@/lib/utils";
import { SensitiveField } from "@/components/ui/sensitive-field";

const statusStyles: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  leaver: "bg-destructive/10 text-destructive border-destructive/20",
  starter: "bg-primary/10 text-primary border-primary/20",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  leaver: "Leaver",
  starter: "Starter",
};

const departmentStyles: Record<string, string> = {
  FOH: "bg-accent/10 text-accent",
  BOH: "bg-primary/10 text-primary",
  CPU: "bg-warning/10 text-warning",
};

const departmentEmoji: Record<string, string> = {
  FOH: "🍽️",
  BOH: "👨‍🍳",
  CPU: "🏭",
};

interface EmployeeCardProps {
  employee: Employee;
  isAdmin: boolean;
  canViewSensitive?: boolean;
  onDelete: (employee: Employee) => void;
  onViewDetails: (employee: Employee) => void;
  index: number;
}

export function EmployeeCard({ employee, isAdmin, canViewSensitive = false, onDelete, onViewDetails, index }: EmployeeCardProps) {
  const { data: branches = [] } = useEmployeeBranches(employee.id);
  const isNewStarter = employee.status === "starter" || (employee.status as string) === "onboarding";
  const { data: readiness } = useEmployeeReadiness(isNewStarter ? employee.id : undefined);

  return (
    <div
      className={cn(
        "group rounded-xl bg-card p-3.5 shadow-sm transition-all duration-200",
        "hover:shadow-md sm:hover:-translate-y-0.5 hover:border-primary/20 border border-border",
        "animate-fade-in cursor-pointer min-w-0 overflow-hidden"
      )}
      style={{ animationDelay: `${Math.min(index, 6) * 30}ms` }}
      onClick={() => onViewDetails(employee)}
    >
      {/* Row 1: Avatar + Name + Status + Menu */}
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9 ring-1 ring-background shadow-sm shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-sm">
            {employee.forename[0]}{employee.surname[0]}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground text-sm leading-tight truncate">
              {employee.forename} {employee.surname}
            </h3>
            {employee.employee_ref && (
              <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                #{employee.employee_ref}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-medium",
              departmentStyles[employee.department]
            )}>
              {departmentEmoji[employee.department]} {employee.department}
            </span>
            {branches.length > 0 && (
              <>
                <span className="text-border">·</span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 truncate">
                  <MapPin className="h-3 w-3 shrink-0" />
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
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetails(employee); }}>
                <Eye className="h-4 w-4 mr-2" /> View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(employee); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Row 2: Compact protected pay — only for authorized */}
      {canViewSensitive && (
        <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-border">
          <div className="flex-1">
            <SensitiveField
              fieldKey={`card-${employee.id}-hourly_rate`}
              value={<span className="text-xs font-semibold text-foreground">{formatCurrency(Number(employee.hourly_rate))}/hr</span>}
              category="compensation"
              employeeId={employee.id}
              mask="Rate •••"
              size="sm"
              inline
            />
          </div>
          <div className="flex-1">
            <SensitiveField
              fieldKey={`card-${employee.id}-service_charge`}
              value={<span className="text-xs font-semibold text-foreground">SC {formatCurrency(Number(employee.service_charge || 0))}</span>}
              category="compensation"
              employeeId={employee.id}
              mask="SC •••"
              size="sm"
              inline
            />
          </div>
          {employee.ni_number && (
            <SensitiveField
              fieldKey={`card-${employee.id}-ni`}
              value={<span className="font-mono text-[10px]">{employee.ni_number}</span>}
              category="personal_id"
              employeeId={employee.id}
              mask="NI •••"
              size="sm"
              inline
            />
          )}
        </div>
      )}

      {/* Row 3: Admin quick actions */}
      {isAdmin && (
        <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-border">
          <EmployeeFormDialog
            employee={employee}
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-8"
                onClick={(e) => e.stopPropagation()}
              >
                <Edit2 className="h-3 w-3 mr-1" /> Edit
              </Button>
            }
          />
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onViewDetails(employee); }}
            className="text-xs h-8 px-2.5"
          >
            <Eye className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
