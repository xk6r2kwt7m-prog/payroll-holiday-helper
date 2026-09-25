import { describe, it, expect } from 'vitest';
import { niProblems, withoutConfirmations } from '../../supabase/functions/staff-details-portal/validation';
import { computeInfoCoverage, withPendingCoverage, allMissingItems } from '@/lib/info-request-coverage';
import { isRightToWorkCleared } from '@/lib/right-to-work-status';
import { buildPortalSteps } from '@/pages/StaffDetailsPortal';
describe('staff review integrity', () => {
 it('requires matching NI entries but accepts normalised formatting', () => {
  expect(niProblems({ni_number:'AB123456C'}, 'ab 12 34 56 c')).toEqual([]);
  expect(niProblems({ni_number:'AB123456C'}, 'AB123456D')).not.toEqual([]);
  expect(niProblems({ni_number:'AB123456C'})).not.toEqual([]);
  expect(niProblems({ni_number:'BG123456C'}, 'BG123456C')).not.toEqual([]);
 });
 it('allows pending applications without inventing numbers', () => {
  expect(niProblems({no_ni_number:'yes', ni_status:'application_pending'})).toEqual([]);
 });
 it('strips confirmation values even when posted directly', () => {
  expect(withoutConfirmations({personal:{ni_number:'AB123456C',confirm_ni_number:'AB123456C'},bank:{confirm_sort_code:'123456'},bad:{x:'secret'}})).toEqual({personal:{ni_number:'AB123456C'},bank:{}});
 });
 it('pending bank/NI and DOB never satisfy accepted coverage', () => {
  const c=computeInfoCoverage({}, {personal_info:{ni_number:'AB123456C',date_of_birth:'2000-01-01'},bank_details:{sort_code:'123456',account_number:'12345678'}});
  expect(c.bank).toBe(false);expect(c.ni_number).toBe(false);expect(c.dob).toBe(false);
  const p=withPendingCoverage(c,['bank_account_no'],true);
  expect(p.bank).toBe(false);
  expect(allMissingItems(p)).not.toContain('bank');expect(allMissingItems(p)).not.toContain('ni_number');
 });
 it('ECS pending overrides old approval and never clears work', () => {
  expect(isRightToWorkCleared({rtw_status:'approved'},[],[{result:'ecs_pending'}])).toBe('pending');
 });
 it('ECS help route can submit without uploading unavailable documents', () => {
  const steps=buildPortalSteps(['share_code'],undefined,'ecs_pending');
  expect(steps.some(s=>s.upload)).toBe(false);expect(steps.some(s=>s.id==='ecs')).toBe(true);
 });
 it('student route requests study dates and restrictions', () => {
  expect(buildPortalSteps(['share_code'],undefined,'student').find(s=>s.id==='student')?.fields.map(f=>f.key)).toEqual(['study_provider','study_dates','work_restrictions']);
 });
});
