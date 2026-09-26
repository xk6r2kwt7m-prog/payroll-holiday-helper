import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import {
  evaluateContractAutoDraft,
  type ContractAutoDraftResult,
} from "@/lib/contract-auto-draft";
import { isBankField, useStaffDetailChanges, useRightToWorkReview } from "@/hooks/useStaffDetailChanges";

/**
 * Once everything a manager must approve has been approved, the contract can be
 * prepared straight from the approved details.
 *
 * This hook only works out whether that point has been reached, and what is
 * still outstanding if not. It never sends, signs or issues anything — the
 * contract is produced as a draft for review, exactly as it is today.
 */
export function useContractAutoDraft(employeeId?: string): ContractAutoDraftResult & {
  loading: boolean;
  error: boolean;
  retry: () => void;
  /** Where to go to prepare the draft, pre-filled with this person's details. */
  prepareHref: string;
} {
  const { tenantId } = useTenant();
  const changesQuery = useStaffDetailChanges(employeeId);
  const changes = changesQuery.data ?? [];
  const rtwQuery = useRightToWorkReview(employeeId);
  const rtw = rtwQuery.data;

  const recordQuery = useQuery({
    queryKey: ["contract_auto_draft_record", tenantId, employeeId],
    enabled: !!tenantId && !!employeeId,
    queryFn: async () => {
      const [employeeResult, onboardingResult, documentsResult, bankResult] = await Promise.all([
        supabase
          .from("employees")
          .select("forename, surname, date_of_birth, start_date, hourly_rate, department")
          .eq("tenant_id", tenantId!)
          .eq("id", employeeId!)
          .maybeSingle(),
        supabase
          .from("employee_onboarding_data")
          .select("personal_info")
          .eq("tenant_id", tenantId!)
          .eq("employee_id", employeeId!)
          .maybeSingle(),
        supabase
          .from("employee_documents")
          .select("id")
          .eq("tenant_id", tenantId!)
          .eq("employee_id", employeeId!)
          .eq("document_type", "contract")
          .limit(1),
        supabase.from("bank_detail_verifications").select("change_id")
          .eq("tenant_id", tenantId!).eq("employee_id", employeeId!)
          .eq("confirmed_directly", true),
      ]);
      for (const result of [employeeResult, onboardingResult, documentsResult, bankResult]) {
        if (result.error) throw result.error;
      }
      if (!employeeResult.data) throw new Error("Employee record could not be found");
      return { emp: employeeResult.data, onb: onboardingResult.data,
        hasContract: (documentsResult.data ?? []).length > 0,
        verifiedBankChanges: (bankResult.data ?? []).map(row => row.change_id),
      };
    },
  });

  const record = recordQuery.data;
  const missingContractFields = useMemo(() => {
    const emp = record?.emp as Record<string, unknown> | null | undefined;
    if (!emp) return [] as string[];
    const info = (record?.onb?.personal_info ?? {}) as Record<string, unknown>;
    const address =
      (info.home_address as string) ||
      (info.address_line1 as string) ||
      (info.address as string) ||
      "";
    const out: string[] = [];
    if (!String(emp.forename ?? "").trim() || !String(emp.surname ?? "").trim()) out.push("Legal name");
    if (!String(address).trim()) out.push("Home address");
    if (!String(emp.start_date ?? "").trim()) out.push("Start date");
    if (!Number.isFinite(Number(emp.hourly_rate)) || Number(emp.hourly_rate) <= 0) out.push("Hourly rate");
    if (!String(emp.department ?? "").trim()) out.push("Role or department");
    return out;
  }, [record]);

  const bankAwaitingDirectConfirmation = changes.some(
    (c) => isBankField(c.field_name) && c.state !== "rejected" && c.needs_review
      && !record?.verifiedBankChanges.includes(c.id),
  );

  const result = evaluateContractAutoDraft({
    changes: changes.map((c) => ({
      field_name: c.field_name,
      field_label: c.field_label,
      state: c.state,
      needs_review: c.needs_review,
    })),
    rtwStatus: rtw?.rtw_status ?? null,
    rtwExpiresOn: rtw?.rtw_expires_on ?? null,
    bankAwaitingDirectConfirmation,
    missingContractFields,
    hasContract: record?.hasContract ?? false,
  });

  const queries = [changesQuery, rtwQuery, recordQuery];
  const loading = queries.some(query => query.isLoading || query.isFetching);
  const unavailable = !tenantId || !employeeId || queries.some(query => query.isError) || !record;
  return {
    ...result,
    ready: !loading && !unavailable && result.ready,
    outstanding: loading ? ["Checking staff details and approvals…"]
      : unavailable ? ["Staff checks could not be loaded. Retry before preparing the contract."]
      : result.outstanding,
    loading,
    error: unavailable && !loading,
    retry: () => { queries.forEach(query => { void query.refetch(); }); },
    prepareHref: employeeId ? `/contracts?employee=${employeeId}` : "/contracts",
  };
}
