import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { useEmployee } from '@/hooks/useEmployees';
const state=vi.hoisted(()=>({tenantId:null as string|null,from:vi.fn(),filters:[] as [string,unknown][]}));
vi.mock('@/hooks/useTenant',()=>({useTenant:()=>({tenantId:state.tenantId})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:state.from}}));
vi.mock('@/lib/permission-guard',()=>({assertPermission:vi.fn()}));
let client:QueryClient;
beforeEach(()=>{
  client=new QueryClient({defaultOptions:{queries:{retry:false}}});state.tenantId=null;state.filters=[];vi.clearAllMocks();
  state.from.mockImplementation(()=>{const filters:[string,unknown][]=[];const query={select:()=>query,eq:(key:string,value:unknown)=>{filters.push([key,value]);state.filters.push([key,value]);return query;},single:async()=>({data:{id:'person',tenant_id:filters.find(([k])=>k==='tenant_id')?.[1]},error:null})};return query;});
});
afterEach(()=>{cleanup();client.clear();});
const wrapper=({children}:{children:ReactNode})=><QueryClientProvider client={client}>{children}</QueryClientProvider>;
it('does not read a staff record before the workspace is selected',()=>{
  renderHook(()=>useEmployee('person'),{wrapper});expect(state.from).not.toHaveBeenCalled();
});
it('filters the employee request by both person and workspace',async()=>{
  state.tenantId='a';const {result}=renderHook(()=>useEmployee('person'),{wrapper});
  await waitFor(()=>expect(result.current.isSuccess).toBe(true));expect(state.filters).toContainEqual(['id','person']);expect(state.filters).toContainEqual(['tenant_id','a']);
});
it('does not reuse another workspace’s cached staff detail',async()=>{
  state.tenantId='a';const {result,rerender}=renderHook(()=>useEmployee('person'),{wrapper});await waitFor(()=>expect(result.current.data?.tenant_id).toBe('a'));
  state.tenantId='b';rerender();expect(result.current.data?.tenant_id).not.toBe('a');await waitFor(()=>expect(result.current.data?.tenant_id).toBe('b'));
});
