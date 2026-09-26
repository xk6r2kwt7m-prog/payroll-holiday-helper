import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
const mocks = vi.hoisted(() => ({ getSession: vi.fn(), onAuthStateChange: vi.fn(), from: vi.fn(), signOut: vi.fn(), toast: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: mocks, from: mocks.from } }));
vi.mock('sonner', () => ({toast: {error: mocks.toast}}));
vi.mock('@/lib/getCanonicalUrl', () => ({ getCanonicalOrigin: () => 'https://example.test' }));
const deferred = () => { let resolve!: (v: any) => void; let reject!: (e: Error) => void; const promise = new Promise<any>((a,b) => {resolve=a;reject=b;}); return {promise,resolve,reject}; };
const session = (id: string) => ({ user: { id } });
let event: (event: string, session: any) => void;
let bootstrap: ReturnType<typeof deferred>;
let roles: Map<string, ReturnType<typeof deferred>>;
let client: QueryClient;
function mount() {
  return renderHook(() => useAuth(), {wrapper: ({children}: {children: ReactNode}) => <QueryClientProvider client={client}><AuthProvider>{children}</AuthProvider></QueryClientProvider>});
}
beforeEach(() => {
  vi.clearAllMocks(); roles=new Map(); bootstrap=deferred(); client=new QueryClient({defaultOptions:{queries:{retry:false}}});
  mocks.getSession.mockReturnValue(bootstrap.promise);
  mocks.onAuthStateChange.mockImplementation(cb => {event=cb;return {data:{subscription:{unsubscribe:vi.fn()}}};});
  mocks.from.mockImplementation(() => ({select: () => ({eq: (_: string,id: string) => ({maybeSingle: () => {const d=deferred();roles.set(id,d);return d.promise;}})})}));
});
afterEach(() => {cleanup();client.clear();});
describe('auth session ordering', () => {
  it('keeps loading until the role lookup finishes', async () => {
    const {result}=mount();await act(async()=>bootstrap.resolve({data:{session:session('a')}}));
    await waitFor(()=>expect(roles.has('a')).toBe(true));expect(result.current.loading).toBe(true);
    await act(async()=>roles.get('a')!.resolve({data:{role:'admin'}}));expect(result.current.isAdmin).toBe(true);expect(result.current.loading).toBe(false);
  });
  it('does not restore an admin role after logout', async () => {
    const {result}=mount();act(()=>event('SIGNED_IN',session('a')));await waitFor(()=>expect(roles.has('a')).toBe(true));
    client.setQueryData(['private'],{name:'previous account'});act(()=>event('SIGNED_OUT',null));
    await act(async()=>roles.get('a')!.resolve({data:{role:'admin'}}));
    expect(result.current.user).toBeNull();expect(result.current.role).toBeNull();expect(client.getQueryData(['private'])).toBeUndefined();
  });
  it('ignores old role results after account switching', async () => {
    const {result}=mount();act(()=>event('SIGNED_IN',session('a')));await waitFor(()=>expect(roles.has('a')).toBe(true));
    act(()=>event('SIGNED_IN',session('b')));await waitFor(()=>expect(roles.has('b')).toBe(true));
    await act(async()=>roles.get('b')!.resolve({data:{role:'staff'}}));
    await act(async()=>roles.get('a')!.resolve({data:{role:'admin'}}));
    expect(result.current.user?.id).toBe('b');expect(result.current.role).toBe('staff');expect(result.current.isAdmin).toBe(false);
  });
  it('ignores bootstrap data overtaken by a session event', async () => {
    const {result}=mount();act(()=>event('SIGNED_OUT',null));await act(async()=>bootstrap.resolve({data:{session:session('old')}}));
    expect(result.current.user).toBeNull();expect(mocks.from).not.toHaveBeenCalled();
  });
  it('finishes safely when bootstrap fails',async()=>{
    const {result}=mount();await act(async()=>bootstrap.reject(new Error('offline')));
    expect(result.current.loading).toBe(false);expect(result.current.role).toBeNull();
  });
  it.each([{error:new Error('denied')},{data:{role:'unexpected'}}])('does not grant a role on invalid lookup: %j',async(response)=>{
    const {result}=mount();act(()=>event('SIGNED_IN',session('a')));await waitFor(()=>expect(roles.has('a')).toBe(true));
    await act(async()=>roles.get('a')!.resolve(response));expect(result.current.role).toBeNull();expect(result.current.loading).toBe(false);
    expect(result.current.roleStatus).toBe('failed');
  });
  it('a missing role row is resolved, not failed',async()=>{
    const {result}=mount();act(()=>event('SIGNED_IN',session('a')));await waitFor(()=>expect(roles.has('a')).toBe(true));
    await act(async()=>roles.get('a')!.resolve({data:null,error:null}));expect(result.current.role).toBeNull();expect(result.current.roleStatus).toBe('resolved');
  });
  it('reports a failed sign-out instead of pretending the session ended',async()=>{
    const {result}=mount();const error=new Error('sign-out failed');mocks.signOut.mockResolvedValue({error});
    await result.current.signOut();expect(mocks.toast).toHaveBeenCalledWith('Could not sign out. Please try again.');
  });
});
