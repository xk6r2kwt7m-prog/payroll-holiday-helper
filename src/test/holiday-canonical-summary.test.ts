import { describe, expect, it } from "vitest";
import { summariseHolidayYear } from "@/lib/holiday-year-summary";
import { computeBasis } from "@/lib/holiday-entitlement-basis";
const accrual = { id: "entry", holiday_accrued_hours: 10, payroll_periods: { status: "draft", period_name: "September" } };
describe("canonical holiday arithmetic", () => {
  it("combines opening balance, committed accrual, pending accrual and all deductions", () => {
    expect(summariseHolidayYear(2026,[{entry_type:"carry_over_in",hours:20},{entry_type:"accrual",hours:15},{entry_type:"holiday_taken",hours:-8},{entry_type:"expiry",hours:-2}],[],[accrual])).toMatchObject({availableHours:25,availableIncludingPendingHours:35});
  });
  it("does not duplicate an open period already posted to the ledger", () => {
    expect(summariseHolidayYear(2026,[{entry_type:"accrual",hours:10,source_table:"payroll_entries",source_id:"entry"}],[],[accrual])).toMatchObject({availableIncludingPendingHours:10,pendingAccruedHours:0});
  });
  it("flags approved accrual missing from the ledger rather than inventing a credit", () => {
    expect(summariseHolidayYear(2026,[],[],[{...accrual,payroll_periods:{status:"approved"}}])).toMatchObject({availableHours:0,requiresReview:true});
  });
  it("flags a payment with no ledger debit", () => {
    expect(summariseHolidayYear(2026,[],[{id:"payment",total:100}],[]).requiresReview).toBe(true);
  });
  it("excludes superseded pending payroll periods", () => {
    const corrected = {...accrual,id:"replacement",holiday_accrued_hours:12,payroll_periods:{status:"draft",period_name:"September [Corrected]"}};
    expect(summariseHolidayYear(2026,[],[],[accrual,corrected]).pendingAccruedHours).toBe(12);
  });
  it("preserves signed corrections and never invents carry-over", () => {
    expect(summariseHolidayYear(2026,[{entry_type:"holiday_taken",hours:-8},{entry_type:"correction",hours:8}],[],[])).toMatchObject({availableHours:0,carryOverHours:0});
  });
  it("uses the entitlement year rather than the date a correction was posted", () => {
    const ledger:any[] = [{id:"credit",entry_type:"carry_over_in",hours:20,entry_date:"2026-01-05",leave_year_start:"2025-01-01"}];
    expect(computeBasis({basis:"current_year",leaveYear:2025,ledger,payments:[],payrollEntries:[]}).balance).toBe(20);
    expect(computeBasis({basis:"current_year",leaveYear:2026,ledger,payments:[],payrollEntries:[]}).balance).toBe(0);
  });
});
