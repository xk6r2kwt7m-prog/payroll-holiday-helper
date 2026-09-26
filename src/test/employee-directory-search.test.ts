import { expect, it } from 'vitest';
import { matchesEmployeeSearch } from '@/lib/employee-directory-search';
const employee = { forename: 'Ana María', surname: 'Silva', department: 'FOH', employee_ref: 'TEAM-042' };
it('matches full names and combinations of name and department', () => {
  expect(matchesEmployeeSearch(employee, 'Ana María Silva')).toBe(true);
  expect(matchesEmployeeSearch(employee, 'Silva FOH')).toBe(true);
});
it('ignores extra spaces, accents and case', () => {
  expect(matchesEmployeeSearch(employee, '  MARIA   silva  ')).toBe(true);
});
it('matches a reference and requires every search token', () => {
  expect(matchesEmployeeSearch(employee, '042')).toBe(true);
  expect(matchesEmployeeSearch(employee, 'Ana BOH')).toBe(false);
});
it('handles empty search and missing reference', () => {
  expect(matchesEmployeeSearch({...employee, employee_ref:null}, '   ')).toBe(true);
});
it('does not search protected information attached to a record', () => {
  expect(matchesEmployeeSearch({...employee, ...{ni_number:'private-value'}}, 'private-value')).toBe(false);
});
