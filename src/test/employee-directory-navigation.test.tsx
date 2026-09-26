import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Employees from '@/pages/Employees';
vi.mock('@/hooks/useEmployees', () => ({
  useEmployees: () => ({data:[
    {id:'1',forename:'Ana',surname:'Silva',department:'FOH',status:'active',employee_ref:'A1'},
    {id:'2',forename:'Ben',surname:'Jones',department:'BOH',status:'active',employee_ref:'B2'},
    {id:'3',forename:'Cara',surname:'Lee',department:'FOH',status:'onboarding',employee_ref:'C3'},
  ],isLoading:false,error:null}),
  useDeleteEmployee:()=>({}), useArchiveEmployee:()=>({}), useRestoreEmployee:()=>({}), useUpdateEmployee:()=>({}),
}));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({isAdmin:true})}));
vi.mock('@/hooks/useI18n',()=>({useI18n:()=>({t:(key:string)=>key})}));
vi.mock('@/hooks/useRolePermissions',()=>({usePermission:()=>true}));
vi.mock('@/components/layout/AppLayout',()=>({AppLayout:({children}:any)=><>{children}</>}));
vi.mock('@/components/people/PeopleDashboard',()=>({PeopleDashboard:({onViewDirectory}:any)=><button onClick={()=>onViewDirectory('Ana Silva')}>Find employee</button>}));
vi.mock('@/components/employees/EmployeeCard',()=>({EmployeeCard:({employee,onViewDetails}:any)=><button onClick={()=>onViewDetails(employee)}>{employee.forename} {employee.surname}</button>}));
vi.mock('@/components/employees/EmployeeDetailSheet',()=>({EmployeeDetailSheet:({open}:any)=>open?<p>Profile opened</p>:null}));
vi.mock('@/components/employees/BulkActionsBar',()=>({BulkActionsBar:({selectedEmployees}:any)=><p>Selected: {selectedEmployees.length}</p>}));
vi.mock('@/components/employees/EmployeeFormDialog',()=>({EmployeeFormDialog:()=>null}));
vi.mock('@/components/employees/InviteEmployeeDialog',()=>({InviteEmployeeDialog:()=>null}));
vi.mock('@/components/employees/EmployeeDeleteDialog',()=>({EmployeeDeleteDialog:()=>null}));
vi.mock('@/components/employees/InfoRequestsPanel',()=>({InfoRequestsPanel:()=>null}));
vi.mock('@/components/employees/InvitationsPanel',()=>({InvitationsPanel:()=>null}));
afterEach(cleanup);
const show=(path:string)=>render(<MemoryRouter initialEntries={[path]}><Employees/></MemoryRouter>);
it('opens the directory for department links',()=>{
  show('/employees?dept=BOH');
  expect(screen.getByRole('button',{name:'Ben Jones'})).toBeVisible();
  expect(screen.queryByRole('button',{name:'Ana Silva'})).toBeNull();
});
it('honours onboarding links',()=>{
  show('/employees?status=onboarding');
  expect(screen.getByRole('button',{name:'Cara Lee'})).toBeVisible();
  expect(screen.queryByRole('button',{name:'Ana Silva'})).toBeNull();
});
it('carries an overview search into the directory',()=>{
  show('/employees'); fireEvent.click(screen.getByRole('button',{name:'Find employee'}));
  expect(screen.getByRole('button',{name:'Ana Silva'})).toBeVisible();
  expect(screen.queryByRole('button',{name:'Ben Jones'})).toBeNull();
});
it('selects a card without also opening its profile and clears hidden selections',()=>{
  show('/employees?view=directory');
  fireEvent.click(screen.getByRole('button',{name:'Select employees'}));
  fireEvent.click(screen.getByRole('button',{name:'Ana Silva'}));
  expect(screen.getByText('Selected: 1')).toBeVisible();
  expect(screen.queryByText('Profile opened')).toBeNull();
  fireEvent.change(screen.getByRole('textbox',{name:/Search employees/}),{target:{value:'Ben'}});
  expect(screen.getByText('Selected: 0')).toBeVisible();
});
it('opens a profile normally outside selection mode',()=>{
  show('/employees?view=directory'); fireEvent.click(screen.getByRole('button',{name:'Ana Silva'}));
  expect(screen.getByText('Profile opened')).toBeVisible();
});
