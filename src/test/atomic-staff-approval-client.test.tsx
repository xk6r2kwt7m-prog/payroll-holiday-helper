import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDecideStaffDetailChange, useVerifyBankChange, useRecordRightToWorkDecision } from "@/hooks/useStaffDetailChanges";
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

describe("right-to-work transaction client", () => {
 it("uses a stable request id on retry and never writes review/audit separately", async () => {
  const { result } = renderHook(() => useRecordRightToWorkDecision());
  const input = { employeeId: "staff", decision: "verified", checkedByName: "Manager", notes: "Evidence checked", expectedUpdatedAt: "2026-09-26T10:00:00Z" };
  state.rpc.mockResolvedValueOnce({error:{message:"Network unavailable"}});
  await expect((result.current as any).mutationFn(input)).rejects.toThrow();
  await (result.current as any).mutationFn(input);
  expect(state.rpc.mock.calls[0][1]._request_id).toBe(state.rpc.mock.calls[1][1]._request_id);
  expect(state.rpc.mock.calls[1][0]).toBe("record_rtw_decision_atomic");
  expect(state.rpc.mock.calls[1][1]._expires_on).toBeNull();
  expect(state.from).not.toHaveBeenCalled();
 });
 it("refuses reviews with no evidence revision", async () => {
  const { result } = renderHook(() => useRecordRightToWorkDecision());
  await expect((result.current as any).mutationFn({employeeId:"staff",decision:"verified",checkedByName:"Manager",notes:"Checked"})).rejects.toThrow("Reload");
  expect(state.rpc).not.toHaveBeenCalled();
 });
});
