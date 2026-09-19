import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import {
  expandRequestedFields,
  type InfoItemKey,
  type InfoRequestKind,
} from "@/lib/info-request-items";

/** Legacy section keys are still accepted so nothing already sent breaks. */
export type InfoSection = "personal" | "emergency" | "bank" | "rtw";

export interface EmployeeInfoRequest {
  id: string;
  employee_id: string;
  requested_fields: string[];
  recipient_email: string | null;
  requested_by_name: string | null;
  status: string;
  request_kind: string;
  preset: string | null;
  sent_at: string;
  opened_at: string | null;
  submitted_at: string | null;
  token_expires_at: string;
  rtw_uploaded_count: number;
  reminder_count: number;
  last_reminder_at: string | null;
  cancelled_at: string | null;
  employees?: { forename: string | null; surname: string | null; email: string | null; status: string | null } | null;
}

export type InfoRequestState = "completed" | "opened" | "waiting" | "expired" | "cancelled" | "prepared";

export const INFO_REQUEST_STATE_LABELS: Record<InfoRequestState, string> = {
  completed: "Completed",
  prepared: "Not sent",
  opened: "Opened, not finished",
  waiting: "Waiting",
  expired: "Expired",
  cancelled: "Cancelled",
};

/** Truthful state — never claims progress the record does not show. */
export function infoRequestState(r: EmployeeInfoRequest): InfoRequestState {
  if (r.submitted_at) return "completed";
  if (r.status === "revoked" || r.cancelled_at) return "cancelled";
  if (r.status === "prepared") return "prepared";
  if (new Date(r.token_expires_at).getTime() < Date.now()) return "expired";
  if (r.opened_at) return "opened";
  return "waiting";
}

export const infoRequestPersonName = (r: EmployeeInfoRequest): string => {
  const name = `${r.employees?.forename ?? ""} ${r.employees?.surname ?? ""}`.trim();
  return name || r.recipient_email || "Unknown staff member";
};

export const infoRequestItems = (r: EmployeeInfoRequest): InfoItemKey[] =>
  expandRequestedFields(r.requested_fields);

const SELECT =
  "id, employee_id, requested_fields, recipient_email, requested_by_name, status, request_kind, preset, sent_at, opened_at, submitted_at, token_expires_at, rtw_uploaded_count, reminder_count, last_reminder_at, cancelled_at, employees(forename, surname, email, status)";

export function useInfoRequests(employeeId?: string, kind?: InfoRequestKind) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["employee_info_requests", tenantId, employeeId, kind],
    queryFn: async () => {
      if (!tenantId) return [] as EmployeeInfoRequest[];
      let q = supabase
        .from("employee_info_requests")
        .select(SELECT)
        .eq("tenant_id", tenantId)
        .order("sent_at", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      if (kind) q = q.eq("request_kind", kind);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as EmployeeInfoRequest[];
    },
    enabled: !!tenantId,
  });
}

export function useSendInfoRequest() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (input: {
      employeeIds: string[];
      /** Item keys (legacy section keys still accepted). */
      sections: string[];
      requestKind?: InfoRequestKind;
      preset?: string | null;
      recipientOverride?: string | null;
      testSend?: boolean;
      expiryDays?: number;
      /** Links the request to a contract, so signing follows on in the same session. */
      contractDocumentId?: string | null;
      /** Creates the request and its link but sends nothing — it stays "Not sent". */
      prepareOnly?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke("send-info-request", {
        body: { tenant_id: tenantId, requestKind: input.requestKind ?? "existing_staff_update", ...input },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as {
        sent: number;
        prepared?: number;
        results: { employee_id: string; sent: boolean; prepared?: boolean; error?: string }[];
      };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["employee_info_requests"] });
      if ((data.prepared ?? 0) > 0) {
        toast.success(
          `Request prepared for ${data.prepared} staff member${data.prepared! > 1 ? "s" : ""} — nothing sent yet`,
        );
      }
      const failed = data.results.filter((r) => !r.sent && !r.prepared);
      if (data.sent > 0) toast.success(`Request sent to ${data.sent} staff member${data.sent > 1 ? "s" : ""}`);
      if (failed.length > 0) toast.error(`${failed.length} could not be sent: ${failed[0].error ?? "unknown reason"}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/**
 * Sends the same link again as a reminder. The token is untouched, so anything
 * already part-filled is still there when they open it.
 */
export function useRemindInfoRequest() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (request: EmployeeInfoRequest) => {
      const state = infoRequestState(request);
      if (state !== "waiting" && state !== "opened") {
        throw new Error(
          state === "completed"
            ? "They have already completed this — no reminder needed"
            : `This link is ${INFO_REQUEST_STATE_LABELS[state].toLowerCase()} — send a new link instead`,
        );
      }
      const { data, error } = await supabase.functions.invoke("send-info-request", {
        body: { tenant_id: tenantId, action: "remind", requestId: request.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { sent: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee_info_requests"] });
      toast.success("Reminder sent — same link, nothing they typed is lost");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/**
 * Cancels an outstanding details link so it can no longer be opened.
 * Does not touch anything the staff member has already submitted.
 */
export function useRevokeInfoRequest() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("employee_info_requests")
        .update({
          status: "revoked",
          cancelled_at: new Date().toISOString(),
          token_expires_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("tenant_id", tenantId!)
        .is("submitted_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee_info_requests"] });
      toast.success("Link cancelled — it can no longer be opened");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export interface ExpiringDocument {
  id: string;
  employee_id: string;
  document_name: string | null;
  document_type: string;
  expires_at: string;
  days_left: number;
  employee_name: string;
}

/**
 * Documents with an expiry date — visas, permits, passports, share codes —
 * so a lapse can be chased before it happens. Read-only: nothing is changed
 * and nobody is marked as checked automatically.
 */
export function useExpiringDocuments(withinDays = 90) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["expiring_employee_documents", tenantId, withinDays],
    queryFn: async () => {
      if (!tenantId) return [] as ExpiringDocument[];
      const limit = new Date(Date.now() + withinDays * 86400000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("employee_documents")
        .select("id, employee_id, document_name, document_type, expires_at, employees(forename, surname, status, archived_at)")
        .eq("tenant_id", tenantId)
        .not("expires_at", "is", null)
        .lte("expires_at", limit)
        .order("expires_at", { ascending: true });
      if (error) throw error;
      const today = Date.now();
      return (data ?? [])
        .filter((d: any) => d.employees && !d.employees.archived_at && d.employees.status !== "leaver")
        .map((d: any) => ({
          id: d.id,
          employee_id: d.employee_id,
          document_name: d.document_name,
          document_type: d.document_type,
          expires_at: d.expires_at,
          days_left: Math.ceil((new Date(d.expires_at).getTime() - today) / 86400000),
          employee_name: `${d.employees.forename ?? ""} ${d.employees.surname ?? ""}`.trim(),
        })) as ExpiringDocument[];
    },
    enabled: !!tenantId,
  });
}

/**
 * Sends a request that was prepared earlier and deliberately left unsent.
 * The same link is used, so nothing about the request changes except that the
 * email now goes out — and only because an administrator asked for it.
 */
export function useSendPreparedInfoRequest() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.functions.invoke("send-info-request", {
        body: { tenant_id: tenantId, action: "send_prepared", requestId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee_info_requests"] });
      toast.success("Request sent");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
