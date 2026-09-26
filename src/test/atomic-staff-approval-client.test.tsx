import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDecideStaffDetailChange, useVerifyBankChange } from "@/hooks/useStaffDetailChanges";
const state=vi.hoisted(()=>({ rpc:vi.fn(), from:vi.fn() }));
vi.mock("@/integrations/supabase/client",()=>({supabase:state}));
vi.mock("@/hooks/useTenant",()=>({useTenant:()=>({tenantId:"tenant"})}));
vi.mock("@/hooks/useAuth",()=>({useAuth:()=>({user:{id:"reviewer"}})}));
vi.mock("@tanstack/react-query",()=>({useMutation:(options:any)=>options,useQueryClient:()=>({invalidateQueries:vi.fn()})}));
beforeEach(()=>{vi.clearAllMocks();state.rpc.mockResolvedValue({data:{},error:null});});
describe("atomic staff approval client",()=>{
 it("passes a submission id to the server without writing the employee in the browser",async()=>{
  const {result}=renderHook(()=>useDecideStaffDetailChange());
  await (result.current as any).mutationFn({change:{id:"change",field_name:"forename",new_value:"Untrusted client value"},accept:true,deciderName:"Manager"});
  expect(state.rpc).toHaveBeenCalledWith("decide_staff_detail_atomic",{_change_id:"change",_accept:true,_reviewer:"Manager",_notes:null});
  expect(state.from).not.toHaveBeenCalled();
 });
 it("submits both bank fields as one operation",async()=>{
  const {result}=renderHook(()=>useVerifyBankChange());
  await (result.current as any).mutationFn({changes:[{id:"account",field_name:"bank_account_no"},{id:"sort",field_name:"sort_code"}],verifierName:"Admin"});
  expect(state.rpc).toHaveBeenCalledWith("confirm_staff_bank_atomic",{_change_ids:["account","sort"],_reviewer:"Admin",_notes:null});
  expect(state.from).not.toHaveBeenCalled();
 });
 it("does not fall back to partial writes if the migration is missing",async()=>{
  state.rpc.mockResolvedValue({error:{code:"PGRST202",message:"missing RPC"}});
  const {result}=renderHook(()=>useDecideStaffDetailChange());
  await expect((result.current as any).mutationFn({change:{id:"change"},accept:true,deciderName:"Manager"})).rejects.toThrow("Nothing was changed");
  expect(state.from).not.toHaveBeenCalled();
 });
});
