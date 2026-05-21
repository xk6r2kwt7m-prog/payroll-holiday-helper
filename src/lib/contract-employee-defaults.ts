/**
 * Pure helper that maps an employee profile (plus optional onboarding and
 * active employment terms) into default values for the New Employment
 * Contract form.
 *
 * Rules:
 * - Pure function. No I/O, no React, no Supabase imports.
 * - Returns ONLY fields we can confidently derive. Missing source data ->
 *   field is left undefined so the form keeps its current value.
 * - Never throws on missing data; safely tolerates partial inputs.
 * - Does NOT mutate the inputs.
 *
 * Callers are responsible for:
 * - Not overwriting fields the user has already manually edited.
 * - Resetting "user-edited" tracking when a different employee is picked.
 */
import type { ContractVariables, ContractType, EmploymentType } from "@/components/contracts/contractTemplates";
import { getDefaultJobTitle } from "@/components/contracts/contractTemplates";

export interface ContractDefaultsEmployee {
  forename?: string | null;
  surname?: string | null;
  preferred_name?: string | null;
  department?: string | null;
  start_date?: string | null;
  hourly_rate?: number | null;
  service_charge?: number | null;
}

export interface ContractDefaultsOnboarding {
  personal_info?: Record<string, any> | null;
}

export interface ContractDefaultsActiveTerms {
  role_title?: string | null;
  employment_type?: string | null;
  work_location?: string | null;
  contracted_hours?: number | null;
  base_hourly_rate?: number | null;
  hourly_rate?: number | null;
  guaranteed_service_charge_rate?: number | null;
  estimated_service_charge_rate?: number | null;
  tronc_scheme_name?: string | null;
  service_charge_policy_note?: string | null;
  notice_period_weeks?: number | null;
  department?: string | null;
  effective_from?: string | null;
  reporting_manager_name?: string | null;
  reporting_manager_title?: string | null;
}

export interface ContractDefaultsInput {
  employee?: ContractDefaultsEmployee | null;
  onboarding?: ContractDefaultsOnboarding | null;
  activeTerms?: ContractDefaultsActiveTerms | null;
}

export interface MappedContractDefaults {
  variables: Partial<ContractVariables>;
  contractType: ContractType;
}

const VALID_EMPLOYMENT_TYPES: EmploymentType[] = ["full_time", "part_time", "variable_hours"];

export function deriveContractTypeFromDepartment(dept?: string | null): ContractType {
  const d = (dept || "").trim().toLowerCase();
  if (!d) return "foh";
  if (d.includes("kitchen") || d === "boh" || d === "cpu") return "kitchen";
  if (d.includes("manage")) return "management";
  if (d.includes("supervis")) return "supervisor";
  if (d === "foh" || d.includes("front")) return "foh";
  return "foh";
}

function noticeWeeksToText(weeks?: number | null): string | undefined {
  if (weeks == null) return undefined;
  if (weeks === 1) return "one week";
  if (weeks === 2) return "two weeks";
  if (weeks === 4) return "1 month";
  if (weeks === 8) return "2 months";
  return undefined;
}

function readAddress(personal?: Record<string, any> | null): string | undefined {
  if (!personal) return undefined;
  const direct = personal.address || personal.home_address || personal.full_address;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  // Compose from parts if address-as-string is missing.
  const parts = [
    personal.address_line_1,
    personal.address_line_2,
    personal.city,
    personal.postcode || personal.post_code,
  ]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

function safeNumber(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function rateString(v: unknown): string | undefined {
  const n = safeNumber(v);
  return n === undefined ? undefined : n.toString();
}

/**
 * Pure mapper. Returns only the fields we can fill from sources; everything
 * else is left undefined so the caller can keep prior form state.
 */
export function mapEmployeeToContractDefaults(input: ContractDefaultsInput): MappedContractDefaults {
  const emp = input.employee ?? null;
  const ob = input.onboarding ?? null;
  const terms = input.activeTerms ?? null;

  const contractType = deriveContractTypeFromDepartment(terms?.department ?? emp?.department);

  const fullName = emp
    ? [emp.forename, emp.surname].map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean).join(" ")
    : "";

  // Pay: prefer active terms base rate, fall back to employee hourly rate.
  const baseRate = rateString(terms?.base_hourly_rate ?? terms?.hourly_rate ?? emp?.hourly_rate);
  const guaranteedSc = rateString(terms?.guaranteed_service_charge_rate);
  const estimatedSc = rateString(terms?.estimated_service_charge_rate ?? emp?.service_charge);

  // Employment type — only accept known enum values.
  const rawEt = (terms?.employment_type || "").trim();
  const employmentType: EmploymentType | undefined = VALID_EMPLOYMENT_TYPES.includes(rawEt as EmploymentType)
    ? (rawEt as EmploymentType)
    : undefined;

  // Job title: prefer stored role_title, else default for derived dept.
  const jobTitle =
    (terms?.role_title && terms.role_title.trim()) ||
    (emp?.department ? getDefaultJobTitle(contractType) : undefined);

  const weeklyHours =
    terms?.contracted_hours != null && Number.isFinite(Number(terms.contracted_hours))
      ? String(terms.contracted_hours)
      : undefined;

  const noticePeriod = noticeWeeksToText(terms?.notice_period_weeks);

  const homeAddress = readAddress(ob?.personal_info);

  const effectiveDate =
    (typeof emp?.start_date === "string" && emp.start_date) ||
    (typeof terms?.effective_from === "string" && terms.effective_from) ||
    undefined;

  const variables: Partial<ContractVariables> = {
    employeeName: fullName || undefined,
    homeAddress,
    jobTitle: jobTitle || undefined,
    effectiveDate: effectiveDate || undefined,
    baseHourlyRate: baseRate,
    hourlyRate: baseRate, // legacy mirror
    guaranteedServiceChargeRate: guaranteedSc,
    estimatedServiceChargeRate: estimatedSc,
    troncSchemeName: terms?.tronc_scheme_name?.trim() || undefined,
    serviceChargePolicyNote: terms?.service_charge_policy_note?.trim() || undefined,
    weeklyHours,
    noticePeriod,
    workLocation: terms?.work_location?.trim() || undefined,
    employmentType,
  };

  // Strip undefined keys so callers can iterate cleanly.
  for (const k of Object.keys(variables) as (keyof ContractVariables)[]) {
    if (variables[k] === undefined) delete variables[k];
  }

  return { variables, contractType };
}
