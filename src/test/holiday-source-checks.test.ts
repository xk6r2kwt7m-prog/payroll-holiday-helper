import { describe, expect, it } from 'vitest';
import { holidaySourcesDisagree } from '@/lib/financial-rules/holiday-source-checks';
import { summariseHolidayYear } from '@/lib/holiday-year-summary';
const payment = {id:'p',hours:8,total:100};
const debit = {entry_type:'holiday_taken',hours:-8,amount:-100,source_table:'holiday_payments',source_id:'p'};
const entry = {id:'e',holiday_accrued_hours:10,payroll_periods:{status:'approved'}};
const credit = {entry_type:'accrual',hours:10,source_table:'payroll_entries',source_id:'e'};
describe('independent holiday evidence checks',()=>{
  it('accepts matching evidence without modifying inputs',()=>{
    const original=JSON.stringify([debit,payment,credit,entry]);
    expect(holidaySourcesDisagree([debit,credit],[payment],[entry])).toBe(false);
    expect(JSON.stringify([debit,payment,credit,entry])).toBe(original);
  });
  it.each([{hours:-7},{amount:-99},{amount:null},{amount:100}])('flags a debit disagreement %j',change=>{
    expect(holidaySourcesDisagree([{...debit,...change}],[payment],[])).toBe(true);
  });
  it('flags duplicate debit evidence',()=>expect(holidaySourcesDisagree([debit,debit],[payment],[])).toBe(true));
  it('flags missing debit evidence',()=>expect(holidaySourcesDisagree([],[payment],[])).toBe(true));
  it('flags stale accrual after payroll edits while preserving ledger balance',()=>{
    const summary=summariseHolidayYear(2026,[credit],[],[{...entry,holiday_accrued_hours:12}]);
    expect(summary.requiresReview).toBe(true);expect(summary.availableHours).toBe(10);
  });
  it('flags duplicate accrual sources',()=>expect(holidaySourcesDisagree([credit,credit],[],[entry])).toBe(true));
  it.each([null,'unexpected',''])('does not count unknown payroll status %j as pending',status=>{
    const summary=summariseHolidayYear(2026,[],[],[{...entry,payroll_periods:{status}}]);
    expect(summary.pendingAccruedHours).toBe(0);expect(summary.requiresReview).toBe(true);
  });
  it('allows numeric strings and harmless floating point noise',()=>{
    expect(holidaySourcesDisagree([{...debit,hours:'-8',amount:-100.00000001}],[payment],[])).toBe(false);
  });
});
