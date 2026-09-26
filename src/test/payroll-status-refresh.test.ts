import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useApprovePayrollPeriod, useReopenPayrollPeriod, useSubmitPayrollForReview } from '@/hooks/usePayroll';
const mocks=vi.hoisted(()=>({invalidateQueries:vi.fn()}));
vi.mock('@tanstack/react-query',()=>({useQuery:vi.fn(),useMutation:(options:unknown)=>options,useQueryClient:()=>mocks}));
vi.mock('@/hooks/useTenant',()=>({useTenant:()=>({tenantId:'company'})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
vi.mock('@/lib/permission-guard',()=>({assertPermission:vi.fn()}));
beforeEach(()=>vi.clearAllMocks());
describe('status transition refresh contract',()=>{
  it.each([useApprovePayrollPeriod,useReopenPayrollPeriod,useSubmitPayrollForReview])('%s refreshes payroll and holiday evidence after success or uncertainty',hook=>{
    const options=hook() as unknown as {onSettled:()=>void};options.onSettled();
    for(const key of ['payroll_periods','payroll_entries','holiday_ledger','holiday_pending_accrual','holiday_payments_year_total'])
      expect(mocks.invalidateQueries.mock.calls.some(([arg])=>arg.queryKey[0]===key)).toBe(true);
  });
});
