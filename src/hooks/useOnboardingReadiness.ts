import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import type { Employee } from "@/hooks/useEmployees";

export type ReadinessStatus = "ready" | "pending" | "pending_verification" | "blocked";

export interface OnboardingRequirement {
  id: string;
  requirement_key: string;
  requirement_label: string;
  requirement_type: string;
  is_critical: boolean;
  is_required: boolean;
  display_order: number;
}

export interface RequirementCheck {
  key: string;
  label: string;
  is_critical: boolean;
  is_required: boolean;
  status: "complete" | "pending_verification" | "missing";
}

export interface EmployeeReadiness {
  employeeId: string;
  employeeName: string;
  status: ReadinessStatus;
  score: number;
  checks: RequirementCheck[];
  missingCritical: string[];
  missingRequired: string[];
  pendingVerification: string[];
}

export function useTenantOnboardingRequirements() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["tenant_onboarding_requirements", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("tenant_onboarding_requirements" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("display_order");
      if (error) throw error;
      return (data || []) as unknown as OnboardingRequirement[];
    },
    enabled: !!tenantId,
  });
}

function checkRequirement(
  key: string,
  employee: Employee,
  onboardingData: any,
  documents: any[],
  contractSignatures: any[],
  availability: any[],
  trainingRecords: any[]
): "complete" | "pending_verification" | "missing" {
  switch (key) {
    case "personal_information":
      return (employee.nationality || onboardingData?.personal_info?.nationality)
        ? "complete" : "missing";

    case "bank_details":
      return (employee.bank_account_no || onboardingData?.bank_details?.account_number)
        ? "complete" : "missing";

    case "right_to_work": {
      const rtwDocs = documents.filter((d: any) =>
        ["passport", "visa", "biometric_residence_permit", "right_to_work"].includes(d.document_type)
      );
      if (rtwDocs.length === 0) return "missing";
      const verified = rtwDocs.some((d: any) => d.document_status === "verified");
      if (verified) return "complete";
      return "pending_verification";
    }

    case "contract_signed":
      return contractSignatures.length > 0 ? "complete" : "missing";

    case "emergency_contact":
      return onboardingData?.emergency_contact?.name ? "complete" : "missing";

    case "availability":
      return availability.length > 0 ? "complete" : "missing";

    case "training_records":
      return trainingRecords.length > 0 ? "complete" : "missing";

    default:
      return "missing";
  }
}

interface LibraryItemForReadiness {
  id: string;
  title: string;
  category: string;
  target_departments: string[];
  requires_acknowledgement: boolean;
  requires_completion: boolean;
}

function buildTrainingAssignmentChecks(
  employee: Employee,
  libraryItems: LibraryItemForReadiness[],
  assignments: any[]
): RequirementCheck[] {
  // Filter library items that apply to this employee's department
  const applicable = libraryItems.filter(item => {
    if (!item.target_departments || item.target_departments.length === 0) return true;
    return item.target_departments.includes(employee.department);
  });

  return applicable.map(item => {
    const assignment = assignments.find((a: any) => a.document_id === item.id);

    let status: "complete" | "missing" = "missing";
    if (assignment) {
      const ackOk = !item.requires_acknowledgement || !!assignment.acknowledged_at;
      const completionOk = !item.requires_completion || !!assignment.completed_at;
      if (ackOk && completionOk) {
        status = "complete";
      }
    }

    // Compliance-category items are critical; others are required
    const isCritical = item.category === "compliance";

    return {
      key: `training_lib_${item.id}`,
      label: item.title,
      is_critical: isCritical,
      is_required: true,
      status,
    };
  });
}

function computeReadiness(
  employeeId: string,
  employeeName: string,
  checks: RequirementCheck[]
): EmployeeReadiness {
  const requiredChecks = checks.filter(c => c.is_required);
  const completedRequired = requiredChecks.filter(c => c.status === "complete").length;
  const score = requiredChecks.length > 0 ? Math.round((completedRequired / requiredChecks.length) * 100) : 100;

  const missingCritical = checks.filter(c => c.is_critical && c.status === "missing").map(c => c.label);
  const missingRequired = checks.filter(c => c.is_required && c.status === "missing").map(c => c.label);
  const pendingVerification = checks.filter(c => c.status === "pending_verification").map(c => c.label);

  let status: ReadinessStatus = "ready";
  if (missingCritical.length > 0) status = "blocked";
  else if (pendingVerification.length > 0) status = "pending_verification";
  else if (missingRequired.length > 0) status = "pending";

  return { employeeId, employeeName, status, score, checks, missingCritical, missingRequired, pendingVerification };
}

export function useEmployeeReadiness(employeeId?: string) {
  const { tenantId } = useTenant();
  const { data: requirements = [] } = useTenantOnboardingRequirements();

  return useQuery({
    queryKey: ["employee_readiness", employeeId, tenantId, requirements.length],
    queryFn: async () => {
      if (!employeeId || !tenantId) return null;

      const [empRes, onbRes, docsRes, sigRes, availRes, trainRes, libRes, assignRes] = await Promise.all([
        supabase.from("employees").select("*").eq("id", employeeId).single(),
        supabase.from("employee_onboarding_data" as any).select("*").eq("employee_id", employeeId).maybeSingle(),
        supabase.from("employee_documents").select("*").eq("employee_id", employeeId),
        supabase.from("contract_signatures").select("*").eq("employee_id", employeeId),
        supabase.from("employee_availability").select("*").eq("employee_id", employeeId),
        supabase.from("training_records" as any).select("*").eq("employee_id", employeeId),
        // Fetch library items that count toward readiness
        supabase.from("training_library" as any)
          .select("id, title, category, target_departments, requires_acknowledgement, requires_completion")
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .eq("counts_toward_readiness", true),
        // Fetch this employee's training assignments
        supabase.from("training_assignments" as any)
          .select("document_id, status, acknowledged_at, completed_at")
          .eq("employee_id", employeeId)
          .not("status", "eq", "cancelled"),
      ]);

      const employee = empRes.data as Employee;
      if (!employee) return null;

      const onboarding = onbRes.data;
      const docs = docsRes.data || [];
      const sigs = sigRes.data || [];
      const avail = availRes.data || [];
      const training = trainRes.data || [];
      const libraryItems = (libRes.data || []) as unknown as LibraryItemForReadiness[];
      const assignments = assignRes.data || [];

      // Standard requirement checks
      const standardChecks: RequirementCheck[] = requirements.map(req => ({
        key: req.requirement_key,
        label: req.requirement_label,
        is_critical: req.is_critical,
        is_required: req.is_required,
        status: checkRequirement(req.requirement_key, employee, onboarding, docs, sigs, avail, training),
      }));

      // Training library readiness checks
      const trainingChecks = buildTrainingAssignmentChecks(employee, libraryItems, assignments);

      const allChecks = [...standardChecks, ...trainingChecks];

      return computeReadiness(employeeId, `${employee.forename} ${employee.surname}`, allChecks);
    },
    enabled: !!employeeId && !!tenantId && requirements.length > 0,
  });
}

export function useTeamReadiness(employees: Employee[]) {
  const { tenantId } = useTenant();
  const { data: requirements = [] } = useTenantOnboardingRequirements();

  const nonActiveIds = employees
    .filter(e => e.status === "starter" || (e.status as string) === "onboarding")
    .map(e => e.id);

  return useQuery({
    queryKey: ["team_readiness", tenantId, nonActiveIds.join(","), requirements.length],
    queryFn: async () => {
      if (!tenantId || nonActiveIds.length === 0) return [];

      const [docsRes, sigRes, onbRes, availRes, libRes, assignRes] = await Promise.all([
        supabase.from("employee_documents").select("*").eq("tenant_id", tenantId).in("employee_id", nonActiveIds),
        supabase.from("contract_signatures").select("*").eq("tenant_id", tenantId).in("employee_id", nonActiveIds),
        supabase.from("employee_onboarding_data" as any).select("*").eq("tenant_id", tenantId).in("employee_id", nonActiveIds),
        supabase.from("employee_availability").select("*").eq("tenant_id", tenantId).in("employee_id", nonActiveIds),
        // Library items counting toward readiness
        supabase.from("training_library" as any)
          .select("id, title, category, target_departments, requires_acknowledgement, requires_completion")
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .eq("counts_toward_readiness", true),
        // All assignments for these employees
        supabase.from("training_assignments" as any)
          .select("document_id, employee_id, status, acknowledged_at, completed_at")
          .eq("tenant_id", tenantId)
          .in("employee_id", nonActiveIds)
          .not("status", "eq", "cancelled"),
      ]);

      const docs = docsRes.data || [];
      const sigs = sigRes.data || [];
      const onbData = onbRes.data || [];
      const avail = availRes.data || [];
      const libraryItems = (libRes.data || []) as unknown as LibraryItemForReadiness[];
      const allAssignments = assignRes.data || [];

      return nonActiveIds.map(empId => {
        const employee = employees.find(e => e.id === empId)!;
        const empDocs = docs.filter((d: any) => d.employee_id === empId);
        const empSigs = sigs.filter((s: any) => s.employee_id === empId);
        const empOnb = (onbData as any[]).find((o: any) => o.employee_id === empId);
        const empAvail = avail.filter((a: any) => a.employee_id === empId);
        const empAssignments = (allAssignments as any[]).filter((a: any) => a.employee_id === empId);

        // Standard checks
        const standardChecks: RequirementCheck[] = requirements.map(req => ({
          key: req.requirement_key,
          label: req.requirement_label,
          is_critical: req.is_critical,
          is_required: req.is_required,
          status: checkRequirement(req.requirement_key, employee, empOnb, empDocs, empSigs, empAvail, []),
        }));

        // Training library readiness checks
        const trainingChecks = buildTrainingAssignmentChecks(employee, libraryItems, empAssignments);

        const allChecks = [...standardChecks, ...trainingChecks];

        return computeReadiness(empId, `${employee.forename} ${employee.surname}`, allChecks);
      });
    },
    enabled: !!tenantId && nonActiveIds.length > 0 && requirements.length > 0,
  });
}
