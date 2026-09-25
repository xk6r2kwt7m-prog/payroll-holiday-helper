import { describe, expect, it, vi } from "vitest";
import { createHolidayPaymentRunner } from "@/lib/holiday-payment-transaction";
const values = { hours: 4, rate: 12.71, holiday_taken_date: "2026-09-03" };
const success = (args: any) => ({ data: { payment_id: args._payment_id, payment: { id: args._payment_id }, idempotent_replay: false }, error: null });
describe("holiday transaction client", () => {
  it("sends one RPC and an exactly rounded money total", async () => {
    const rpc = vi.fn(async args => success(args));
    await createHolidayPaymentRunner(rpc)("tenant", "create", { ...values, hours: 12.07 });
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc.mock.calls[0][0]._values.total).toBe(153.41);
  });
  it("retains both IDs after a lost response", async () => {
    const rpc = vi.fn().mockRejectedValueOnce(new Error("Connection lost")).mockImplementation(async args => success(args));
    const run = createHolidayPaymentRunner(rpc);
    await expect(run("tenant", "create", values)).rejects.toThrow("Connection lost");
    await run("tenant", "create", values);
    expect(rpc.mock.calls[1][0]).toEqual(rpc.mock.calls[0][0]);
  });
  it("coalesces double-clicks while a request is pending", async () => {
    let resolve!: (value: any) => void;
    const rpc = vi.fn(args => new Promise<any>(r => { resolve = () => r(success(args)); }));
    const run = createHolidayPaymentRunner(rpc);
    const first = run("tenant", "create", values), second = run("tenant", "create", values);
    expect(first).toBe(second); expect(rpc).toHaveBeenCalledOnce();
    resolve(null); await first;
  });
  it("uses a fresh request for a deliberately new payment after success", async () => {
    const rpc = vi.fn(async args => success(args)), run = createHolidayPaymentRunner(rpc);
    await run("tenant", "create", values); await run("tenant", "create", values);
    expect(rpc.mock.calls[0][0]._request_id).not.toBe(rpc.mock.calls[1][0]._request_id);
  });
  it("missing migration fails closed without a browser fallback", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { code: "PGRST202" } }));
    await expect(createHolidayPaymentRunner(rpc)("tenant", "create", values)).rejects.toThrow("safeguards are not installed");
    expect(rpc).toHaveBeenCalledOnce();
  });
  it("does not confirm an unrelated server response", async () => {
    const rpc = vi.fn(async () => ({ data: { payment_id: "other", payment: {} }, error: null }));
    await expect(createHolidayPaymentRunner(rpc)("tenant", "update", values, "payment")).rejects.toThrow("could not confirm");
  });
  it("accepts an atomic zero-balance settlement without a payment row", async () => {
    const rpc = vi.fn(async args => ({ data: { payment_id: args._payment_id, payment: null, settled: true }, error: null }));
    await expect(createHolidayPaymentRunner(rpc)("tenant", "settle", { ...values, hours: 0 })).resolves.toMatchObject({ settled: true });
  });
  it.each([NaN, Infinity, -1, 0])("refuses invalid normal payment hours %s before I/O", async hours => {
    const rpc = vi.fn();
    await expect(createHolidayPaymentRunner(rpc)("tenant", "create", { ...values, hours })).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
});
