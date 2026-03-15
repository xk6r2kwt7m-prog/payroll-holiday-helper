import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PrivacyShieldProvider } from "@/hooks/usePrivacyShield";
import { TenantProvider } from "@/hooks/useTenant";
import { I18nProvider } from "@/hooks/useI18n";
import { ImpersonationProvider } from "@/hooks/useImpersonation";
import { ImpersonationBanner } from "@/components/platform/ImpersonationBanner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Employees from "./pages/Employees";
import Payroll from "./pages/Payroll";
import PayrollCalendar from "./pages/PayrollCalendar";
import Holidays from "./pages/Holidays";
import StaffLeave from "./pages/StaffLeave";
import Settings from "./pages/Settings";
import Locations from "./pages/Locations";
import Contracts from "./pages/Contracts";
import Schedule from "./pages/Schedule";
import Timesheets from "./pages/Timesheets";
import ScheduleReport from "./pages/ScheduleReport";
import ScheduleAnalytics from "./pages/ScheduleAnalytics";
import PayrollAnalytics from "./pages/PayrollAnalytics";
import HolidayAudit from "./pages/HolidayAudit";
import AbsenceTracker from "./pages/AbsenceTracker";
import Onboarding from "./pages/Onboarding";
import StaffPortal from "./pages/StaffPortal";
import TrainingRecords from "./pages/TrainingRecords";
import Announcements from "./pages/Announcements";
import Disciplinary from "./pages/Disciplinary";
import PayrollComparison from "./pages/PayrollComparison";
import PayrollOverpayments from "./pages/PayrollOverpayments";
import PayrollAudit from "./pages/PayrollAudit";
import Auth from "./pages/Auth";
import CompanyOnboarding from "./pages/CompanyOnboarding";
import SignContract from "./pages/SignContract";
import PlatformAdmin from "./pages/PlatformAdmin";
import LocationDashboard from "./pages/LocationDashboard";
import SelectWorkspace from "./pages/SelectWorkspace";
import ResetPassword from "./pages/ResetPassword";
import TalentPool from "./pages/TalentPool";
import { TALENT_POOL_ROUTE } from "@/lib/routes";
import Vacancies from "./pages/Vacancies";
import Workforce from "./pages/Workforce";
import LabourCostPreview from "./pages/LabourCostPreview";
import ShiftMarketplace from "./pages/ShiftMarketplace";
import EmployeeOnboarding from "./pages/EmployeeOnboarding";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import CookiePolicy from "./pages/CookiePolicy";
import FohServiceTraining from "./pages/FohServiceTraining";
import FohAllergyTraining from "./pages/FohAllergyTraining";
import FohUpsellingTraining from "./pages/FohUpsellingTraining";
import FohPrintableTraining from "./pages/FohPrintableTraining";
import { CommandPalette } from "@/components/CommandPalette";
import { CookieConsent } from "@/components/CookieConsent";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>
          <I18nProvider>
          <ImpersonationProvider>
          <PrivacyShieldProvider>
          <ImpersonationBanner />
          <CommandPalette />
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfUse />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            <Route path="/onboard" element={<CompanyOnboarding />} />
            <Route path="/select-workspace" element={<SelectWorkspace />} />
            <Route path="/sign/:token" element={<SignContract />} />

            {/* Dashboard — all authenticated users */}
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />

            {/* Staff portal — staff+ */}
            <Route path="/staff" element={<ProtectedRoute requiredRole="staff"><StaffPortal /></ProtectedRoute>} />

            {/* Employee self-service onboarding */}
            <Route path="/employee-onboarding" element={<ProtectedRoute requiredRole="staff"><EmployeeOnboarding /></ProtectedRoute>} />

            {/* Schedule module — permission-gated */}
            <Route path="/schedule" element={<ProtectedRoute requiredRole="staff" requiredModule="scheduling" moduleName="Scheduling" requiredPermission="view_schedules"><Schedule /></ProtectedRoute>} />
            <Route path="/schedule/report" element={<ProtectedRoute requiredRole="manager" requiredModule="scheduling" moduleName="Scheduling" requiredPermission="view_schedules"><ScheduleReport /></ProtectedRoute>} />
            <Route path="/schedule/analytics" element={<ProtectedRoute requiredRole="manager" requiredModule="scheduling" moduleName="Scheduling" requiredPermission="view_schedules"><ScheduleAnalytics /></ProtectedRoute>} />
            <Route path="/schedule/labour-cost" element={<ProtectedRoute requiredRole="manager" requiredModule="scheduling" moduleName="Scheduling" requiredPermission="view_schedules"><LabourCostPreview /></ProtectedRoute>} />
            <Route path="/shift-marketplace" element={<ProtectedRoute requiredRole="staff" requiredModule="scheduling" moduleName="Scheduling"><ShiftMarketplace /></ProtectedRoute>} />

            {/* Timesheets — permission-gated */}
            <Route path="/timesheets" element={<ProtectedRoute requiredRole="supervisor" requiredModule="scheduling" moduleName="Scheduling" requiredPermission="view_timesheets"><Timesheets /></ProtectedRoute>} />

            {/* Employees — permission-gated */}
            <Route path="/employees" element={<ProtectedRoute requiredRole="supervisor" requiredPermission="view_employees"><Employees /></ProtectedRoute>} />

            {/* Payroll module — permission-gated */}
            <Route path="/payroll" element={<ProtectedRoute requiredRole="admin" requiredModule="payroll" moduleName="Payroll" requiredPermission="view_pay_data"><Payroll /></ProtectedRoute>} />
            <Route path="/payroll/calendar" element={<ProtectedRoute requiredRole="admin" requiredModule="payroll" moduleName="Payroll" requiredPermission="view_pay_data"><PayrollCalendar /></ProtectedRoute>} />
            <Route path="/payroll/analytics" element={<ProtectedRoute requiredRole="admin" requiredModule="payroll" moduleName="Payroll" requiredPermission="view_pay_data"><PayrollAnalytics /></ProtectedRoute>} />
            <Route path="/payroll/comparison" element={<ProtectedRoute requiredRole="admin" requiredModule="payroll" moduleName="Payroll" requiredPermission="view_pay_data"><PayrollComparison /></ProtectedRoute>} />
            <Route path="/payroll/overpayments" element={<ProtectedRoute requiredRole="admin" requiredModule="payroll" moduleName="Payroll" requiredPermission="view_pay_data"><PayrollOverpayments /></ProtectedRoute>} />
            <Route path="/payroll/audit" element={<ProtectedRoute requiredRole="admin" requiredModule="payroll" moduleName="Payroll" requiredPermission="view_pay_data"><PayrollAudit /></ProtectedRoute>} />

            {/* Holidays — permission-gated */}
            <Route path="/holidays" element={<ProtectedRoute requiredRole="staff" requiredPermission="view_holidays"><StaffLeave /></ProtectedRoute>} />
            <Route path="/holidays/manage" element={<ProtectedRoute requiredRole="manager" requiredPermission="approve_holidays"><Holidays /></ProtectedRoute>} />
            <Route path="/holidays/audit" element={<ProtectedRoute requiredRole="admin"><HolidayAudit /></ProtectedRoute>} />

            {/* Absences — manager+ */}
            <Route path="/absences" element={<ProtectedRoute requiredRole="manager"><AbsenceTracker /></ProtectedRoute>} />

            {/* Workforce — manager+ */}
            <Route path="/workforce" element={<ProtectedRoute requiredRole="manager"><Workforce /></ProtectedRoute>} />

            {/* Onboarding — permission-gated */}
            <Route path="/onboarding" element={<ProtectedRoute requiredRole="manager" requiredPermission="manage_lifecycle"><Onboarding /></ProtectedRoute>} />

            {/* Training — permission-gated */}
            <Route path="/training" element={<ProtectedRoute requiredRole="staff" requiredModule="training" moduleName="Training" requiredPermission="view_training"><TrainingRecords /></ProtectedRoute>} />

            {/* Announcements — staff+ */}
            <Route path="/announcements" element={<ProtectedRoute requiredRole="staff"><Announcements /></ProtectedRoute>} />

            {/* Reports — manager+ */}
            <Route path="/reports" element={<ProtectedRoute requiredRole="manager"><Reports /></ProtectedRoute>} />

            {/* Admin-only sections — permission-gated */}
            <Route path="/disciplinary" element={<ProtectedRoute requiredRole="admin" requiredPermission="manage_lifecycle"><Disciplinary /></ProtectedRoute>} />
            <Route path="/contracts" element={<ProtectedRoute requiredRole="admin" requiredModule="documents" moduleName="Documents" requiredPermission="manage_documents"><Contracts /></ProtectedRoute>} />
            <Route path="/locations" element={<ProtectedRoute requiredRole="admin"><Locations /></ProtectedRoute>} />
            <Route path="/locations/:branch" element={<ProtectedRoute requiredRole="admin"><LocationDashboard /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute requiredRole="admin" requiredPermission="access_admin_centre"><Settings /></ProtectedRoute>} />
            <Route path={TALENT_POOL_ROUTE} element={<ProtectedRoute requiredRole="staff"><TalentPool /></ProtectedRoute>} />
            <Route path="/vacancies" element={<ProtectedRoute requiredRole="admin"><Vacancies /></ProtectedRoute>} />

            {/* FOH Training — staff+ */}
            <Route path="/foh/service" element={<ProtectedRoute requiredRole="staff"><FohServiceTraining /></ProtectedRoute>} />
            <Route path="/foh/allergy" element={<ProtectedRoute requiredRole="staff"><FohAllergyTraining /></ProtectedRoute>} />
            <Route path="/foh/upselling" element={<ProtectedRoute requiredRole="staff"><FohUpsellingTraining /></ProtectedRoute>} />
            <Route path="/foh/print" element={<ProtectedRoute requiredRole="staff"><FohPrintableTraining /></ProtectedRoute>} />

            {/* Platform admin — platform owner only */}
            <Route path="/platform-admin" element={<ProtectedRoute platformAdminOnly><PlatformAdmin /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </PrivacyShieldProvider>
          </ImpersonationProvider>
          </I18nProvider>
        </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
