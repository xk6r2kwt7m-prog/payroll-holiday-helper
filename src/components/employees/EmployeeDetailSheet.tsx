import { X, User, Building, CreditCard, FileText, Calendar, Phone, Globe, Edit2, FolderOpen, StickyNote } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EmployeeFormDialog } from "./EmployeeFormDialog";
import { EmployeeDocumentList } from "./EmployeeDocumentList";
import { EmployeeNotesSection } from "./EmployeeNotesSection";
import { formatCurrency } from "@/hooks/useHolidays";
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

interface EmployeeDetailSheetProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  canViewSensitive?: boolean;
}

function InfoRow({ label, value, icon: Icon, mono }: { 
  label: string; 
  value?: string | null; 
  icon?: typeof User;
  mono?: boolean;
}) {
  if (!value) return null;
  
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-sm text-card-foreground", mono && "font-mono")}>{value}</p>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { 
  title: string; 
  icon: typeof User; 
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-card-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      <div className="rounded-lg bg-muted/50 p-4">
        {children}
      </div>
    </div>
  );
}

export function EmployeeDetailSheet({ employee, open, onOpenChange, isAdmin, canViewSensitive = false }: EmployeeDetailSheetProps) {
  if (!employee) return null;

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const tenure = employee.start_date 
    ? Math.floor((Date.now() - new Date(employee.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-4 pb-6">
          {/* Header with avatar */}
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 ring-4 ring-background shadow-lg">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold text-xl">
                {employee.forename[0]}{employee.surname[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl">
                {employee.forename} {employee.surname}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className={statusStyles[employee.status]}>
                  {statusLabels[employee.status]}
                </Badge>
                <Badge variant="secondary">
                  {employee.department}
                </Badge>
              </div>
              {employee.employee_ref && (
                <p className="text-sm text-muted-foreground mt-1 font-mono">
                  #{employee.employee_ref}
                </p>
              )}
            </div>
          </div>

          {/* Quick stats — sensitive ones only for admin */}
          {canViewSensitive ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-center">
                <p className="text-lg font-bold text-primary">{formatCurrency(Number(employee.hourly_rate))}</p>
                <p className="text-xs text-muted-foreground">Hourly Rate</p>
              </div>
              <div className="rounded-lg bg-accent/5 border border-accent/20 p-3 text-center">
                <p className="text-lg font-bold text-accent">{formatCurrency(Number(employee.service_charge || 0))}</p>
                <p className="text-xs text-muted-foreground">Service Charge</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-lg font-bold text-card-foreground">
                  {tenure !== null ? (tenure < 1 ? '<1' : tenure) : '—'}
                </p>
                <p className="text-xs text-muted-foreground">Months</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-lg font-bold text-card-foreground">
                  {tenure !== null ? (tenure < 1 ? '<1' : tenure) : '—'}
                </p>
                <p className="text-xs text-muted-foreground">Months of Service</p>
              </div>
            </div>
          )}
        </SheetHeader>

        <div className="space-y-6 pb-6">
          {/* Personal Information */}
          <Section title="Personal Information" icon={User}>
            <div className="space-y-1">
              <InfoRow label="Full Name" value={`${employee.forename} ${employee.surname}`} />
              <InfoRow label="Nationality" value={employee.nationality} icon={Globe} />
              {canViewSensitive && <InfoRow label="Passport Number" value={employee.passport_no} mono />}
              {canViewSensitive && <InfoRow label="National Insurance" value={employee.ni_number} mono />}
            </div>
          </Section>

          {/* Employment Details */}
          <Section title="Employment" icon={Building}>
            <div className="space-y-1">
              <InfoRow label="Department" value={employee.department} />
              <InfoRow label="Status" value={statusLabels[employee.status]} />
              <InfoRow 
                label="Start Date" 
                value={formatDate(employee.start_date)} 
                icon={Calendar} 
              />
              {employee.end_date && (
                <InfoRow 
                  label="End Date" 
                  value={formatDate(employee.end_date)} 
                  icon={Calendar} 
                />
              )}
            </div>
          </Section>

          {/* Banking Details — Admin only */}
          {canViewSensitive && (employee.sort_code || employee.bank_account_no) && (
            <Section title="Banking Details" icon={CreditCard}>
              <div className="space-y-1">
                <InfoRow label="Sort Code" value={employee.sort_code} mono />
                <InfoRow label="Account Number" value={employee.bank_account_no} mono />
              </div>
            </Section>
          )}

          {/* Notes */}
          {employee.notes && (
            <Section title="Notes" icon={FileText}>
              <p className="text-sm text-card-foreground whitespace-pre-wrap">
                {employee.notes}
              </p>
            </Section>
          )}

          {/* Admin Notes */}
          {isAdmin && (
            <Section title="Notes & Reminders" icon={StickyNote}>
              <EmployeeNotesSection
                employeeId={employee.id}
                isAdmin={isAdmin}
              />
            </Section>
          )}

          {/* Documents */}
          <Section title="Documents" icon={FolderOpen}>
            <EmployeeDocumentList
              employeeId={employee.id}
              employeeName={`${employee.forename} ${employee.surname}`}
              isAdmin={isAdmin}
            />
          </Section>

          {/* Timestamps */}
          <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
            <p>Created: {new Date(employee.created_at).toLocaleString()}</p>
            <p>Last updated: {new Date(employee.updated_at).toLocaleString()}</p>
          </div>
        </div>

        {/* Actions */}
        {isAdmin && (
          <div className="sticky bottom-0 bg-background border-t border-border p-4 -mx-6 -mb-6">
            <EmployeeFormDialog
              employee={employee}
              trigger={
                <Button className="w-full gradient-primary">
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Employee
                </Button>
              }
              onSuccess={() => onOpenChange(false)}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
