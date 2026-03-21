import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import type { Employee } from "@/hooks/useEmployees";

// ─── Criticality classification ───────────────────────────────────────
// legal_critical   → blocks work clearance (RTW)
// start_critical   → blocks first-day readiness (contract, induction)
// payroll_critical → blocks payroll processing (bank, DOB for age-band)
// rota_critical    → blocks scheduling (availability, dept training)
// profile_only     → nice-to-have (emergency contact, optional docs)
export type CriticalityTier =
  | "legal_critical"
  | "start_critical"
  | "payroll_critical"
  | "rota_critical"
  | "profile_only";

// ─── Staged readiness status ──────────────────────────────────────────
export type ReadinessStatus =
  | "record_created"
  | "onboarding_in_progress"
  | "awaiting_employee_action"
  | "awaiting_manager_review"
  | "not_cleared_to_work"
  | "not_ready_for_rota"
  | "ready_to_schedule"
  | "fully_onboarded";

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
  criticality: CriticalityTier;
  status: "complete" | "pending_verification" | "missing";
  /** Who needs to act: employee, manager, or system */
  action_owner: "employee" | "manager" | "system";
  /** Human-readable next action */
  next_action?: string;
}

export interface EmployeeReadiness {
  employeeId: string;
  employeeName: string;
  status: ReadinessStatus;
  statusLabel: string;
  statusDescription: string;
  nextAction?: string;
  score: number;
  checks: RequirementCheck[];
  missingCritical: string[];
  missingRequired: string[];
  pendingVerification: string[];
  /** Manager can always continue onboarding regardless of status */
  managerCanProgress: true;
}

// ─── Criticality map ──────────────────────────────────────────────────
const CRITICALITY_MAP: Record<string, CriticalityTier> = {
  right_to_work: "legal_critical",
  contract_signed: "start_critical",
  bank_details: "payroll_critical",
  personal_information: "payroll_critical",
  emergency_contact: "profile_only",
  availability: "rota_critical",
  training_records: "rota_critical",
};

function getCriticality(key: string, category?: string): CriticalityTier {
  if (CRITICALITY_MAP[key]) return CRITICALITY_MAP[key];
  // Training library items — only compliance/induction are gating
  if (key.startsWith("training_lib_")) {
    if (category === "compliance") return "start_critical";
    if (category === "induction") return "start_critical";
    // All other training (e.g. upselling, guest comfort, general) is informational only
    return "profile_only";
  }
  return "profile_only";
}

// ─── Action owner logic ───────────────────────────────────────────────
function getActionOwner(key: string, status: "complete" | "pending_verification" | "missing"): "employee" | "manager" | "system" {
  if (status === "complete") return "system";
  if (status === "pending_verification") return "manager";

  switch (key) {
    case "right_to_work":
    case "personal_information":
    case "bank_details":
    case "emergency_contact":
      return "employee"; // employee fills, or manager can do it
    case "contract_signed":
      return "manager";
    case "availability":
      return "employee";
    case "training_records":
      return "manager"; // manager assigns training
    default:
      if (key.startsWith("training_lib_")) return "employee"; // employee completes training
      return "manager";
  }
}

function getNextAction(key: string, status: "complete" | "pending_verification" | "missing"): string | undefined {
  if (status === "complete") return undefined;
  if (status === "pending_verification") {
    if (key === "right_to_work") return "Review RTW documents";
    return "Review submitted documents";
  }
  switch (key) {
    case "personal_information": return "Complete personal details";
    case "bank_details": return "Add bank details";
    case "right_to_work": return "Upload RTW evidence";
    case "contract_signed": return "Generate and send contract";
    case "emergency_contact": return "Add emergency contact";
    case "availability": return "Set availability";
    case "training_records": return "Assign training";
    default:
      if (key.startsWith("training_lib_")) return "Complete training module";
      return "Complete this item";
  }
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
      if (ackOk && completionOk) status = "complete";
    }

    const criticality = getCriticality(`training_lib_${item.id}`, item.category);

    return {
      key: `training_lib_${item.id}`,
      label: item.title,
      is_critical: item.category === "compliance",
      is_required: true,
      criticality,
      status,
      action_owner: getActionOwner(`training_lib_${item.id}`, status),
      next_action: getNextAction(`training_lib_${item.id}`, status),
    };
  });
}

// ─── Status labels & descriptions ─────────────────────────────────────
const STATUS_META: Record<ReadinessStatus, { label: string; description: string }> = {
  record_created: {
    label: "Record Created",
    description: "Employee record exists. Setup can begin.",
  },
  onboarding_in_progress: {
    label: "Onboarding In Progress",
    description: "Setup is underway — some items are complete, others still pending.",
  },
  awaiting_employee_action: {
    label: "Employee Action Required",
    description: "Waiting for the employee to complete their part of onboarding.",
  },
  awaiting_manager_review: {
    label: "Awaiting Manager Review",
    description: "Documents submitted and need manager review before clearance.",
  },
  not_cleared_to_work: {
    label: "Not Cleared to Work Yet",
    description: "Legal or compliance items are outstanding. Manager can continue setup.",
  },
  not_ready_for_rota: {
    label: "Not Ready for Rota",
    description: "Scheduling prerequisites are missing. Other onboarding can continue.",
  },
  ready_to_schedule: {
    label: "Ready to Schedule",
    description: "All critical items are complete. Employee can be added to the rota.",
  },
  fully_onboarded: {
    label: "Fully Onboarded",
    description: "All onboarding requirements are complete.",
  },
};

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

  // ── Determine staged status ──
  const hasLegalMissing = checks.some(c => c.criticality === "legal_critical" && c.status !== "complete");
  const hasStartMissing = checks.some(c => c.criticality === "start_critical" && c.status !== "complete");
  const hasPayrollMissing = checks.some(c => c.criticality === "payroll_critical" && c.status !== "complete");
  const hasRotaMissing = checks.some(c => c.criticality === "rota_critical" && c.status !== "complete");
  const hasPendingVerification = pendingVerification.length > 0;
  const hasEmployeeActions = checks.some(c => c.action_owner === "employee" && c.status === "missing");
  const allComplete = score === 100 && !hasPendingVerification;

  let status: ReadinessStatus;
  let nextAction: string | undefined;

  if (allComplete) {
    status = "fully_onboarded";
  } else if (score === 0) {
    status = "record_created";
    nextAction = "Begin onboarding setup";
  } else if (hasPendingVerification && !hasEmployeeActions && missingRequired.length === 0) {
    status = "awaiting_manager_review";
    nextAction = pendingVerification[0] ? `Review: ${pendingVerification[0]}` : "Review submitted items";
  } else if (hasLegalMissing) {
    status = "not_cleared_to_work";
    const legalItem = checks.find(c => c.criticality === "legal_critical" && c.status !== "complete");
    nextAction = legalItem?.next_action || "Complete legal requirements";
  } else if (hasStartMissing || hasPayrollMissing) {
    if (hasEmployeeActions) {
      status = "awaiting_employee_action";
      const empItem = checks.find(c => c.action_owner === "employee" && c.status === "missing");
      nextAction = empItem?.next_action || "Employee needs to complete items";
    } else {
      status = "onboarding_in_progress";
      const mgrItem = checks.find(c => c.action_owner === "manager" && c.status !== "complete");
      nextAction = mgrItem?.next_action || "Continue setup";
    }
  } else if (hasRotaMissing) {
    status = "not_ready_for_rota";
    const rotaItem = checks.find(c => c.criticality === "rota_critical" && c.status !== "complete");
    nextAction = rotaItem?.next_action || "Complete rota prerequisites";
  } else {
    status = "ready_to_schedule";
  }

  const meta = STATUS_META[status];

  return {
    employeeId,
    employeeName,
    status,
    statusLabel: meta.label,
    statusDescription: meta.description,
    nextAction,
    score,
    checks,
    missingCritical,
    missingRequired,
    pendingVerification,
    managerCanProgress: true,
  };
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
        supabase.from("training_library" as any)
          .select("id, title, category, target_departments, requires_acknowledgement, requires_completion")
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .eq("counts_toward_readiness", true),
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

      const standardChecks: RequirementCheck[] = requirements.map(req => {
        const status = checkRequirement(req.requirement_key, employee, onboarding, docs, sigs, avail, training);
        const criticality = getCriticality(req.requirement_key);
        return {
          key: req.requirement_key,
          label: req.requirement_label,
          is_critical: req.is_critical,
          is_required: req.is_required,
          criticality,
          status,
          action_owner: getActionOwner(req.requirement_key, status),
          next_action: getNextAction(req.requirement_key, status),
        };
      });

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
        supabase.from("training_library" as any)
          .select("id, title, category, target_departments, requires_acknowledgement, requires_completion")
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .eq("counts_toward_readiness", true),
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

        const standardChecks: RequirementCheck[] = requirements.map(req => {
          const status = checkRequirement(req.requirement_key, employee, empOnb, empDocs, empSigs, empAvail, []);
          const criticality = getCriticality(req.requirement_key);
          return {
            key: req.requirement_key,
            label: req.requirement_label,
            is_critical: req.is_critical,
            is_required: req.is_required,
            criticality,
            status,
            action_owner: getActionOwner(req.requirement_key, status),
            next_action: getNextAction(req.requirement_key, status),
          };
        });

        const trainingChecks = buildTrainingAssignmentChecks(employee, libraryItems, empAssignments);
        const allChecks = [...standardChecks, ...trainingChecks];

        return computeReadiness(empId, `${employee.forename} ${employee.surname}`, allChecks);
      });
    },
    enabled: !!tenantId && nonActiveIds.length > 0 && requirements.length > 0,
  });
}
