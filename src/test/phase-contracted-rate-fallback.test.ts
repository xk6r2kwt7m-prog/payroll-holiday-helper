import { describe, it, expect } from "vitest";
import { resolveEffectiveRate, type ContractedRate } from "@/hooks/useContractedRates";

const contracted = new Map<string, ContractedRate>([
  ["lotanna", { hourly_rate: 12.5, service_charge: 1 }],
]);

describe("contracted rate fallback for timesheet import", () => {
  it("keeps the rate already on the staff record", () => {
    const r = resolveEffectiveRate({ id: "lotanna", hourly_rate: 14, service_charge: 0.5 }, contracted);
    expect(r).toEqual({ hourly_rate: 14, service_charge: 0.5, fromContract: false });
  });

  it("falls back to the contracted rate when the record is blank", () => {
    const r = resolveEffectiveRate({ id: "lotanna", hourly_rate: 0, service_charge: 0 }, contracted);
    expect(r).toEqual({ hourly_rate: 12.5, service_charge: 1, fromContract: true });
  });

  it("stays at zero when no contract rate exists, so the gap stays visible", () => {
    const r = resolveEffectiveRate({ id: "nobody", hourly_rate: null, service_charge: null }, contracted);
    expect(r.hourly_rate).toBe(0);
    expect(r.fromContract).toBe(false);
  });
});
