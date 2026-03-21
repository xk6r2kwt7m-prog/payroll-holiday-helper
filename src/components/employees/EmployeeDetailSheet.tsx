import { User, Building, CreditCard, FileText, Calendar, Globe, Edit2, FolderOpen, StickyNote, FilePlus, ClipboardCheck, Mail, Cake } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmployeeFormDialog } from "./EmployeeFormDialog";
import { EmployeeDocumentList } from "./EmployeeDocumentList";
import { EmployeeNotesSection } from "./EmployeeNotesSection";
import { OnboardingChecklist } from "./OnboardingChecklist";
import { GenerateReferenceLetterDialog } from "@/components/letters/GenerateReferenceLetterDialog";
import { CreateDocumentRequestDialog } from "@/components/documents/CreateDocumentRequestDialog";
import { formatCurrency } from "@/hooks/useHolidays";
import type { Employee } from "@/hooks/useEmployees";
import { cn } from "@/lib/utils";
import { checkPayRisk, type PayRiskResult } from "@/lib/age-band";
import { SensitiveField, SensitiveSection } from "@/components/ui/sensitive-field";

const statusStyles: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  leaver: "bg-destructive/10 text-destructive border-destructive/20",
  starter: "bg-primary/10 text-primary border-primary/20",
  onboarding: "bg-accent/10 text-accent border-accent/20",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  leaver: "Leaver",
  starter: "Starter",
  onboarding: "Onboarding",
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

function SensitiveInfoRow({ label, value, fieldKey, category, employeeId, icon: Icon, mono }: { 
  label: string; 
  value?: string | null; 
  fieldKey: string;
  category: "compensation" | "personal_id" | "private_hr" | "payroll_summary";
  employeeId: string;
  icon?: typeof User;
  mono?: boolean;
}) {
  if (!value) return null;
  
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <SensitiveField
          fieldKey={fieldKey}
          value={<span className={cn("text-sm text-card-foreground", mono && "font-mono")}>{value}</span>}
          category={category}
          employeeId={employeeId}
          size="sm"
          inline
        />
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

  const dob = (employee as any).date_of_birth;
  const payRisk: PayRiskResult | null = dob ? checkPayRisk(dob, employee.hourly_rate) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="employee-detail-sheet">
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

          {/* Quick stats — compensation masked */}
          {canViewSensitive ? (
            <SensitiveSection
              sectionKey={`detail-${employee.id}-pay-stats`}
              category="compensation"
              employeeId={employee.id}
              title="Compensation Overview"
            >
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
            </SensitiveSection>
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
              <InfoRow label="Email" value={employee.email} icon={Mail} />
              {!employee.email && (
                <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-warning/10 border border-warning/20 text-xs text-warning">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  No email — cannot receive notifications
                </div>
              )}
              {canViewSensitive && (employee as any).date_of_birth && (
                <SensitiveInfoRow
                  label="Date of Birth"
                  value={formatDate((employee as any).date_of_birth)}
                  fieldKey={`detail-${employee.id}-dob`}
                  category="personal_id"
                  employeeId={employee.id}
                  icon={Cake}
                />
              )}
              <InfoRow label="Nationality" value={employee.nationality} icon={Globe} />
              {canViewSensitive && (
                <SensitiveInfoRow
                  label="Passport Number"
                  value={employee.passport_no}
                  fieldKey={`detail-${employee.id}-passport`}
                  category="personal_id"
                  employeeId={employee.id}
                  mono
                />
              )}
              {canViewSensitive && (
                <SensitiveInfoRow
                  label="National Insurance"
                  value={employee.ni_number}
                  fieldKey={`detail-${employee.id}-ni`}
                  category="personal_id"
                  employeeId={employee.id}
                  mono
                />
              )}
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

          {/* Banking Details — Admin only, privacy shielded */}
          {canViewSensitive && (employee.sort_code || employee.bank_account_no) && (
            <SensitiveSection
              sectionKey={`detail-${employee.id}-bank`}
              category="personal_id"
              employeeId={employee.id}
              title="Banking Details"
            >
              <Section title="Banking Details" icon={CreditCard}>
                <div className="space-y-1">
                  <InfoRow label="Sort Code" value={employee.sort_code} mono />
                  <InfoRow label="Account Number" value={employee.bank_account_no} mono />
                </div>
              </Section>
            </SensitiveSection>
          )}

          {/* Notes */}
          {employee.notes && (
            <Section title="Notes" icon={FileText}>
              <p className="text-sm text-card-foreground whitespace-pre-wrap">
                {employee.notes}
              </p>
            </Section>
          )}

          {/* Admin Notes — privacy shielded */}
          {isAdmin && (
            <SensitiveSection
              sectionKey={`detail-${employee.id}-hr-notes`}
              category="private_hr"
              employeeId={employee.id}
              title="Notes & Reminders"
            >
              <Section title="Notes & Reminders" icon={StickyNote}>
                <EmployeeNotesSection
                  employeeId={employee.id}
                  isAdmin={isAdmin}
                />
              </Section>
            </SensitiveSection>
          )}

          {/* Onboarding Readiness */}
          {(employee.status === "starter" || (employee.status as string) === "onboarding") && (
            <Section title="Onboarding Readiness" icon={ClipboardCheck}>
              <OnboardingChecklist employeeId={employee.id} />
            </Section>
          )}

          {/* Documents */}
          <Section title="Documents" icon={FolderOpen}>
            {isAdmin && (
              <div className="mb-3">
                <CreateDocumentRequestDialog
                  preselectedEmployeeId={employee.id}
                  preselectedEmployeeName={`${employee.forename} ${employee.surname}`}
                  trigger={
                    <Button size="sm" variant="outline" className="gap-2 w-full">
                      <FilePlus className="h-4 w-4" />
                      Request Document
                    </Button>
                  }
                />
              </div>
            )}
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
          <div className="sticky bottom-0 bg-background border-t border-border p-4 -mx-6 -mb-6 space-y-2">
            <GenerateReferenceLetterDialog
              employeeId={employee.id}
              employeeName={`${employee.forename} ${employee.surname}`}
              defaultJobTitle=""
              defaultStartDate={employee.start_date || ""}
              defaultEndDate={employee.end_date || ""}
            />
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
