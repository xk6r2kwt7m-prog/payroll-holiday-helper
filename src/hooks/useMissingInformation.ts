import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { isRightToWorkCleared, type RtwDocument } from "@/lib/right-to-work-status";
import { computeInfoCoverage, type CoverageOnboarding } from "@/lib/info-request-coverage";

export type MissingItemKey = "right_to_work" | "bank" | "ni_number" | "dob" | "address" | "emergency";

export const MISSING_ITEM_LABELS: Record<MissingItemKey, string> = {
  right_to_work: "Right to work",
  bank: "Bank details",
  ni_number: "National Insurance number",
  dob: "Date of birth",
  address: "Address",
  emergency: "Emergency contact",
};

export interface LatestInfoRequest {
  status: string;
  sent_at: string;
  submitted_at: string | null;
  opened_at: string | null;
  cancelled_at: string | null;
  revoked_at: string | null;
  token_expires_at: string;
}

export interface MissingInformationRow {
  employee_id: string;
  name: string;
  forename: string;
  surname: string;
  email: string | null;
  status: string;
  missing: MissingItemKey[];
  latestRequest: LatestInfoRequest | null;
  /** Missing items that already have a pending staff_detail_changes decision. */
  pendingDecision: MissingItemKey[];
}

const RTW_TYPES = ["passport", "visa", "biometric_residence_permit", "right_to_work"];

/** staff_detail_changes field_name values that cover each missing item. */
const FIELD_TO_ITEM: Record<string, MissingItemKey> = {
  bank_account_no: "bank",
  sort_code: "bank",
  ni_number: "ni_number",
  date_of_birth: "dob",
  dob: "dob",
  address: "address",
  home_address: "address",
  full_address: "address",
  address_line1: "address",
  emergency_contact_name: "emergency",
  emergency_contact_phone: "emergency",
  emergency_contact: "emergency",
};

/**
 * What each current employee (active, starter, onboarding; test records
 * excluded) is still missing. Sensitive values are never loaded: bank and NI
 * come from the has_* flags, and only non-sensitive onboarding keys are read.
 */
export function useMissingInformation() {
  const { tenantId } = useTenant();
  return useQuery<MissingInformationRow[]>({
    queryKey: ["missing_information", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data: emps, error: empErr } = await supabase
        .from("employees")
        .select("id, forename, surname, preferred_name, email, status, date_of_birth, has_ni_number, has_bank_details")
        .eq("tenant_id", tenantId!)
        .in("status", ["active", "starter", "onboarding"])
        .or("is_test_record.is.null,is_test_record.eq.false")
        .is("archived_at", null);
      if (empErr) throw empErr;
      const employees = (emps ?? []) as any[];
      const ids = employees.map((e) => e.id as string);
      if (ids.length === 0) return [];

      const [ob, docs, reqs, changes] = await Promise.all([
        supabase
          .from("employee_onboarding_data" as any)
          .select(
            "employee_id, rtw_status, " +
              "dob:personal_info->>dob, date_of_birth:personal_info->>date_of_birth, " +
              "address:personal_info->>address, home_address:personal_info->>home_address, " +
              "full_address:personal_info->>full_address, address_line1:personal_info->>address_line1, " +
              "ec_name:emergency_contact->>name, ec_contact_name:emergency_contact->>contact_name, " +
              "ec_phone:emergency_contact->>phone, ec_contact_number:emergency_contact->>contact_number",
          )
          .in("employee_id", ids),
        supabase
          .from("employee_documents")
          .select("employee_id, document_type, document_status")
          .in("employee_id", ids)
          .in("document_type", RTW_TYPES as any),
        supabase
          .from("employee_info_requests")
          .select("employee_id, status, sent_at, submitted_at, opened_at, cancelled_at, revoked_at, token_expires_at, created_at")
          .eq("tenant_id", tenantId!)
          .in("employee_id", ids)
          .order("created_at", { ascending: false }),
        supabase
          .from("staff_detail_changes" as any)
          .select("employee_id, field_name")
          .eq("tenant_id", tenantId!)
          .eq("state", "pending")
          .eq("needs_review", true)
          .in("employee_id", ids),
      ]);
      if (ob.error) throw ob.error;
      if (docs.error) throw docs.error;
      if (reqs.error) throw reqs.error;
      if (changes.error) throw changes.error;

      const obById = new Map<string, any>();
      for (const r of (ob.data ?? []) as any[]) obById.set(r.employee_id, r);
      const docsById = new Map<string, RtwDocument[]>();
      for (const d of (docs.data ?? []) as any[]) {
        const list = docsById.get(d.employee_id) ?? [];
        list.push(d);
        docsById.set(d.employee_id, list);
      }
      const reqById = new Map<string, LatestInfoRequest>();
      for (const r of (reqs.data ?? []) as any[]) {
        if (!reqById.has(r.employee_id)) reqById.set(r.employee_id, r);
      }
      const pendingById = new Map<string, Set<MissingItemKey>>();
      for (const c of (changes.data ?? []) as any[]) {
        const item = FIELD_TO_ITEM[c.field_name as string];
        if (!item) continue;
        const set = pendingById.get(c.employee_id) ?? new Set<MissingItemKey>();
        set.add(item);
        pendingById.set(c.employee_id, set);
      }

      return employees
        .map((e) => {
          const o = obById.get(e.id);
          const onboarding: CoverageOnboarding | null = o
            ? {
                personal_info: {
                  dob: o.dob,
                  date_of_birth: o.date_of_birth,
                  address: o.address,
                  home_address: o.home_address,
                  full_address: o.full_address,
                  address_line1: o.address_line1,
                },
                emergency_contact: {
                  name: o.ec_name,
                  contact_name: o.ec_contact_name,
                  phone: o.ec_phone,
                  contact_number: o.ec_contact_number,
                },
              }
            : null;
          const cov = computeInfoCoverage(
            {
              forename: e.forename,
              surname: e.surname,
              email: e.email,
              date_of_birth: e.date_of_birth,
              has_ni_number: e.has_ni_number,
              has_bank_details: e.has_bank_details,
            },
            onboarding,
          );
          const missing: MissingItemKey[] = [];
          if (isRightToWorkCleared(o ? { rtw_status: o.rtw_status } : null, docsById.get(e.id) ?? []) !== "cleared")
            missing.push("right_to_work");
          if (!cov.bank) missing.push("bank");
          if (!cov.ni_number) missing.push("ni_number");
          if (!cov.dob) missing.push("dob");
          if (!cov.address) missing.push("address");
          if (!cov.emergency) missing.push("emergency");
          return {
            employee_id: e.id,
            name: `${e.preferred_name || e.forename} ${e.surname}`.trim(),
            forename: e.forename,
            surname: e.surname,
            email: e.email ?? null,
            status: e.status,
            missing,
            latestRequest: reqById.get(e.id) ?? null,
            pendingDecision: missing.filter((m) => pendingById.get(e.id)?.has(m)),
          } as MissingInformationRow;
        })
        .filter((r) => r.missing.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}
