import { Edit2, Trash2, Eye, Calendar, CreditCard, MoreHorizontal, MapPin } from "lucide-react";
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
import { formatCurrency } from "@/hooks/useHolidays";
import { useEmployeeBranches, BRANCH_EMOJI, type BranchType } from "@/hooks/useBranches";
import type { Employee } from "@/hooks/useEmployees";
import { cn } from "@/lib/utils";

const statusStyles = {
  active: "bg-success/10 text-success border-success/20",
  leaver: "bg-destructive/10 text-destructive border-destructive/20",
  starter: "bg-primary/10 text-primary border-primary/20",
};

const statusLabels = {
  active: "Active",
  leaver: "Leaver",
  starter: "Starter",
};

const departmentStyles = {
  FOH: "bg-accent/10 text-accent",
  BOH: "bg-primary/10 text-primary",
  CPU: "bg-warning/10 text-warning",
};

const departmentEmoji = {
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
  const hasStartDate = !!employee.start_date;
  const hasEndDate = !!employee.end_date;
  const hasBankDetails = !!(employee.bank_account_no && employee.sort_code);

  return (
    <div
      className={cn(
        "group rounded-xl bg-card p-5 shadow-sm transition-all duration-200",
        "hover:shadow-md sm:hover:-translate-y-0.5 hover:border-primary/20 border border-border",
        "animate-fade-in"
      )}
      style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-base">
            {employee.forename[0]}{employee.surname[0]}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("text-[11px] font-medium", statusStyles[employee.status])}>
            {statusLabels[employee.status]}
          </Badge>
          
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onViewDetails(employee)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(employee)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Employee
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Name & Department */}
      <div className="space-y-1.5 mb-4">
        <h3 className="font-bold text-foreground text-lg leading-tight truncate">
          {employee.forename} {employee.surname}
        </h3>
        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
            departmentStyles[employee.department]
          )}>
            <span>{departmentEmoji[employee.department]}</span>
            {employee.department}
          </span>
          {employee.employee_ref && (
            <span className="text-xs text-muted-foreground font-mono">
              #{employee.employee_ref}
            </span>
          )}
        </div>
      </div>

      {/* Pay Info — Admin only */}
      {canViewSensitive && (
        <div className="grid grid-cols-2 gap-4 py-3 border-t border-border">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Hourly Rate</p>
            <p className="text-sm font-bold text-foreground">
              {formatCurrency(Number(employee.hourly_rate))}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Service Charge</p>
            <p className="text-sm font-bold text-foreground">
              {formatCurrency(Number(employee.service_charge || 0))}
            </p>
          </div>
        </div>
      )}

      {/* Branches */}
      {branches.length > 0 && (
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          {branches.map((b) => (
            <span
              key={b.id}
              className={cn(
                "text-xs px-1.5 py-0.5 rounded-md bg-muted",
                b.is_primary && "bg-primary/10 text-primary font-medium"
              )}
              title={b.is_primary ? "Primary branch" : undefined}
            >
              {BRANCH_EMOJI[b.branch]} {b.branch}
            </span>
          ))}
        </div>
      )}

      {/* Quick Info Icons */}
      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
        {hasStartDate && (
          <div className="flex items-center gap-1" title={`Started: ${new Date(employee.start_date!).toLocaleDateString()}`}>
            <Calendar className="h-3.5 w-3.5" />
            <span>{new Date(employee.start_date!).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}</span>
          </div>
        )}
        {canViewSensitive && hasBankDetails && (
          <div className="flex items-center gap-1" title="Bank details on file">
            <CreditCard className="h-3.5 w-3.5 text-success" />
          </div>
        )}
        {canViewSensitive && employee.ni_number && (
          <div className="flex items-center gap-1 font-mono text-[10px]" title="NI Number">
            {employee.ni_number}
          </div>
        )}
      </div>

      {/* Admin Actions */}
      {isAdmin && (
        <div className="flex gap-2 mt-4 pt-3 border-t border-border">
          <EmployeeFormDialog
            employee={employee}
            trigger={
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs"
              >
                <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
            }
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(employee)}
            className="text-xs"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
