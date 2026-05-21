/**
 * Phase 5I — Pure orchestration helper that prepares everything needed to
 * open a draft Employment Contract for a freshly created employee.
 *
 * Strictly read-only:
 * - No React hooks
 * - No Supabase / network I/O
 * - No mutation of inputs
 * - Never creates / signs / locks / issues a contract — that is the
 *   responsibility of the existing ContractFormDialog workflow.
 *
 * It composes the existing helpers so the New Contract dialog behaves the
 * same regardless of whether it was opened from the Contracts page or
 * straight after employee creation.
 */
import {
  mapEmployeeToContractDefaults,
  type ContractDefaultsEmployee,
  type ContractDefaultsOnboarding,
  type ContractDefaultsActiveTerms,
  type MappedContractDefaults,
} from "@/lib/contract-employee-defaults";
import {
  resolveContractFieldSources,
  getMissingContractFields,
  type ContractFieldSource,
  type MissingContractField,
} from "@/lib/contract-form-review";
import type { ContractVariables } from "@/components/contracts/contractTemplates";

export interface TenantContractSettings {
  company_name?: string | null;
  address?: string | null;
}

export interface BuildContractDraftInput {
  employee: ContractDefaultsEmployee & { id?: string | null };
  onboarding?: ContractDefaultsOnboarding | null;
  activeTerms?: ContractDefaultsActiveTerms | null;
  tenantSettings?: TenantContractSettings | null;
}

export interface ContractDraftReadiness {
  /** Mapped contract variables ready to seed the contract form. */
  variables: Partial<ContractVariables>;
  /** Derived contract type from department / active terms. */
  contractType: MappedContractDefaults["contractType"];
  /** Field -> source map (employee_profile / onboarding / active_terms / derived / missing). */
  sources: Partial<Record<keyof ContractVariables, ContractFieldSource>>;
  /** Critical contract fields that are still missing. */
  missing: MissingContractField[];
  /** True when no critical contract field is missing. */
  ready: boolean;
  /** Resolved company name to use on the contract (falls back to empty string). */
  companyLegalName: string;
  /** Resolved company address used on the contract (falls back to empty string). */
  companyAddress: string;
}

/**
 * Build a draft-ready contract package from a newly created (or any
 * existing) employee, plus optional onboarding / active terms / tenant
 * settings. Does not persist anything.
 */
export function buildContractDraftFromNewEmployee(
  input: BuildContractDraftInput,
): ContractDraftReadiness {
  const defaults = mapEmployeeToContractDefaults({
    employee: input.employee,
    onboarding: input.onboarding ?? null,
    activeTerms: input.activeTerms ?? null,
  });

  const sources = resolveContractFieldSources({
    input: {
      employee: input.employee,
      onboarding: input.onboarding ?? null,
      activeTerms: input.activeTerms ?? null,
    },
    variables: defaults.variables,
    userEdited: new Set(),
  });

  const missing = getMissingContractFields(defaults.variables);

  const companyLegalName =
    (input.tenantSettings?.company_name && input.tenantSettings.company_name.trim()) || "";
  const companyAddress =
    (input.tenantSettings?.address && input.tenantSettings.address.trim()) || "";

  return {
    variables: defaults.variables,
    contractType: defaults.contractType,
    sources,
    missing,
    ready: missing.length === 0,
    companyLegalName,
    companyAddress,
  };
}
