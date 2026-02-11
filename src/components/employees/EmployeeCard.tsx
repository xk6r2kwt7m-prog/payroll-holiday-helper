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
  onDelete: (employee: Employee) => void;
  onViewDetails: (employee: Employee) => void;
  index: number;
}

export function EmployeeCard({ employee, isAdmin, onDelete, onViewDetails, index }: EmployeeCardProps) {
  const { data: branches = [] } = useEmployeeBranches(employee.id);
  const hasStartDate = !!employee.start_date;
  const hasEndDate = !!employee.end_date;
  const hasBankDetails = !!(employee.bank_account_no && employee.sort_code);

  return (
    <div
      className={cn(
        "group rounded-xl bg-card p-4 sm:p-5 shadow-card transition-all duration-200",
        "hover:shadow-elevated sm:hover:-translate-y-1 hover:border-primary/20 border border-transparent",
        "animate-fade-in active:scale-[0.98] sm:active:scale-100"
      )}
      style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <Avatar className="h-11 w-11 sm:h-14 sm:w-14 ring-2 ring-background shadow-md transition-transform group-hover:scale-105">
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-lg">
            {employee.forename[0]}{employee.surname[0]}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
            departmentStyles[employee.department]
          )}>
            <span>{departmentEmoji[employee.department]}</span>
            {employee.department}
          </span>
          
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

      {/* Name & Status */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-card-foreground text-lg truncate">
            {employee.forename} {employee.surname}
          </h3>
          <Badge variant="outline" className={cn("text-xs", statusStyles[employee.status])}>
            {statusLabels[employee.status]}
          </Badge>
        </div>
        
        {employee.employee_ref && (
          <p className="text-xs text-muted-foreground font-mono">
            #{employee.employee_ref}
          </p>
        )}
      </div>

      {/* Pay Info */}
      <div className="grid grid-cols-2 gap-3 py-3 border-t border-b border-border">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Hourly Rate</p>
          <p className="text-sm font-semibold text-card-foreground">
            {formatCurrency(Number(employee.hourly_rate))}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Service Charge</p>
          <p className="text-sm font-semibold text-card-foreground">
            {formatCurrency(Number(employee.service_charge || 0))}
          </p>
        </div>
      </div>

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
        {hasBankDetails && (
          <div className="flex items-center gap-1" title="Bank details on file">
            <CreditCard className="h-3.5 w-3.5 text-success" />
          </div>
        )}
        {employee.ni_number && (
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
                className="flex-1 transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary"
              >
                <Edit2 className="h-4 w-4 mr-1.5" />
                Edit
              </Button>
            }
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(employee)}
            className="transition-all hover:bg-accent hover:text-accent-foreground hover:border-accent"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
