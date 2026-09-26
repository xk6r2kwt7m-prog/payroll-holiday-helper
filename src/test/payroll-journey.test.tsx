import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PayrollJourney } from '@/components/payroll/PayrollJourney';
afterEach(cleanup);
const base = { status: 'draft', entryCount: 3, blockerCount: 0, canPrepare: true, onPrepare: vi.fn() };
it('opens preparation without submitting or approving', () => {
  const onPrepare = vi.fn();
  render(<PayrollJourney {...base} entryCount={0} onPrepare={onPrepare} />);
  const link = screen.getByRole('link', {name: /1. Prepare/});
  expect(link).toHaveAttribute('aria-current','step');
  fireEvent.click(link);
  expect(onPrepare).toHaveBeenCalledOnce();
  expect(screen.queryByRole('button')).toBeNull();
});
it('keeps an unavailable read ahead of an approved status', () => {
  render(<PayrollJourney {...base} status="approved" dataBlock="Could not load" />);
  expect(screen.getByRole('status')).toHaveTextContent('unavailable or still loading');
  expect(screen.getByRole('link', {name:/2. Review/})).toHaveAttribute('aria-current','step');
  expect(screen.queryByText('This period is approved.', {exact:false})).toBeNull();
});
it('routes pending periods with blockers to review', () => {
  render(<PayrollJourney {...base} status="pending" blockerCount={2} />);
  expect(screen.getByRole('link', {name:/2. Review/})).toHaveAttribute('aria-current','step');
});
it('points to approval without claiming the checklist is complete', () => {
  render(<PayrollJourney {...base} status="pending" />);
  expect(screen.getByRole('link', {name:/3. Approval/})).toHaveAttribute('href','#payroll-approval');
  expect(screen.getByRole('status')).toHaveTextContent('existing checks decide');
});
it('does not infer that an approved payroll has been sent', () => {
  render(<PayrollJourney {...base} status="approved" />);
  expect(screen.getByRole('link', {name:/4. Share/})).toHaveAttribute('aria-current','step');
  expect(screen.getByRole('status')).toHaveTextContent('before sharing');
});
it('handles unknown statuses without claiming readiness', () => {
  render(<PayrollJourney {...base} status="unexpected" />);
  expect(screen.getByRole('status')).toHaveTextContent('unfamiliar status');
});
it('does not link read-only users to unavailable preparation controls', () => {
  render(<PayrollJourney {...base} canPrepare={false} />);
  expect(screen.queryByRole('link', {name:/1. Prepare/})).toBeNull();
});
