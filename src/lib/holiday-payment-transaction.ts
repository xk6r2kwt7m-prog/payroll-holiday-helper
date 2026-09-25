import type { Json, Tables } from "@/integrations/supabase/types";
export const HOLIDAY_PAYMENT_RPC = "mutate_holiday_payment_atomic" as const;
type Operation = "create" | "update" | "delete" | "settle";
type Values = Record<string, unknown>;
export interface HolidayPaymentResult {
  payment_id: string;
  employee_id: string | null;
  payment?: Tables<"holiday_payments">;
  deleted?: boolean;
  settled?: boolean;
  idempotent_replay: boolean;
}
export interface HolidayPaymentArgs {
  _tenant_id: string;
  _request_id: string;
  _operation: Operation;
  _payment_id: string;
  _values: Json;
}
export function holidayPaymentError(error: { code?: string; message?: string }): Error {
  if (error.code === "PGRST202" || error.code === "42883") {
    return new Error("Holiday payment safeguards are not installed yet. Nothing was submitted through a fallback. Ask an administrator to complete the reviewed database update.");
  }
  return new Error(error.message || "The payment could not be confirmed. Retry the same details to check the original request safely.");
}

/** Retain request/payment IDs after a lost response. Identical concurrent calls
 * share one promise. A confirmed success clears the receipt for a new action.
 * Lifetime is this mounted editor; server receipts remain durable. */
export function createHolidayPaymentRunner(
  rpc: (args: HolidayPaymentArgs) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>,
  uuid: () => string = () => crypto.randomUUID(),
) {
  const requests = new Map<string, { args: HolidayPaymentArgs; pending?: Promise<HolidayPaymentResult> }>();
  return (tenantId: string, operation: Operation, values: Values, paymentId?: string): Promise<HolidayPaymentResult> => {
    if (!tenantId) return Promise.reject(new Error("Select a workspace first."));
    const normalised = { ...values };
    if (typeof normalised.hours === "number" && typeof normalised.rate === "number") {
      const hours = normalised.hours, rate = normalised.rate;
      if (![hours, rate].every(Number.isFinite) || hours < 0 || (hours === 0 && operation !== "settle") || rate <= 0) {
        return Promise.reject(new Error("Enter positive hours and rate."));
      }
      normalised.total = Math.round(Math.round(hours * 100) * Math.round(rate * 100) / 100) / 100;
    }
    const ordered = Object.fromEntries(Object.entries(normalised).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)));
    const key = JSON.stringify([tenantId, operation, paymentId, ordered]);
    let request = requests.get(key);
    if (!request) {
      if (operation !== "create" && operation !== "settle" && !paymentId) return Promise.reject(new Error("Payment ID is required."));
      request = { args: { _tenant_id: tenantId, _request_id: uuid(), _operation: operation,
        _payment_id: paymentId || uuid(), _values: ordered as Json } };
      requests.set(key, request);
    }
    if (request.pending) return request.pending;
    const current = request;
    current.pending = (async () => {
      try {
        const { data, error } = await rpc(current.args);
        if (error) throw holidayPaymentError(error);
        const result = data as HolidayPaymentResult | null;
        if (!result || result.payment_id !== current.args._payment_id ||
            (operation === "delete" ? !result.deleted : operation === "settle" ? !result.settled : !result.payment)) {
          throw new Error("The server response could not confirm this payment. Retry the same details.");
        }
        requests.delete(key);
        return result;
      } finally { current.pending = undefined; }
    })();
    return current.pending;
  };
}
