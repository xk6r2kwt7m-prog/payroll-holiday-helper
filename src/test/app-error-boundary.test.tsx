import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
afterEach(() => {cleanup();vi.restoreAllMocks();});
it('renders the app unchanged when healthy',()=>{
  render(<AppErrorBoundary><p>Payroll ready</p></AppErrorBoundary>);
  expect(screen.getByText('Payroll ready')).toBeVisible();expect(screen.queryByRole('alert')).toBeNull();
});
it('offers recovery without exposing private error details or claiming a save',()=>{
  vi.spyOn(console,'error').mockImplementation(()=>{});
  function Broken(): never {throw new Error('private employee information');}
  render(<AppErrorBoundary><Broken/></AppErrorBoundary>);
  expect(screen.getByRole('alert')).toHaveTextContent('Check the saved record');
  expect(screen.queryByText(/private employee information/)).toBeNull();
  expect(screen.getByRole('button',{name:'Reload app'})).toBeVisible();
});
