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
import Workforce from "./pages/Workforce";
import LabourCostPreview from "./pages/LabourCostPreview";
import NotFound from "./pages/NotFound";
import { CommandPalette } from "@/components/CommandPalette";

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
            <Route path="/onboard" element={<CompanyOnboarding />} />
            <Route path="/select-workspace" element={<SelectWorkspace />} />
            <Route path="/sign/:token" element={<SignContract />} />

            {/* Dashboard — all authenticated users */}
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />

            {/* Staff portal — staff+ */}
            <Route path="/staff" element={<ProtectedRoute requiredRole="staff"><StaffPortal /></ProtectedRoute>} />

            {/* Schedule module — staff can view own, manager+ can manage */}
            <Route path="/schedule" element={<ProtectedRoute requiredRole="staff" requiredModule="scheduling" moduleName="Scheduling"><Schedule /></ProtectedRoute>} />
            <Route path="/schedule/report" element={<ProtectedRoute requiredRole="manager" requiredModule="scheduling" moduleName="Scheduling"><ScheduleReport /></ProtectedRoute>} />
            <Route path="/schedule/analytics" element={<ProtectedRoute requiredRole="manager" requiredModule="scheduling" moduleName="Scheduling"><ScheduleAnalytics /></ProtectedRoute>} />
            <Route path="/schedule/labour-cost" element={<ProtectedRoute requiredRole="manager" requiredModule="scheduling" moduleName="Scheduling"><LabourCostPreview /></ProtectedRoute>} />

            {/* Timesheets — supervisor+ */}
            <Route path="/timesheets" element={<ProtectedRoute requiredRole="supervisor" requiredModule="scheduling" moduleName="Scheduling"><Timesheets /></ProtectedRoute>} />

            {/* Employees — supervisor+ can view */}
            <Route path="/employees" element={<ProtectedRoute requiredRole="supervisor"><Employees /></ProtectedRoute>} />

            {/* Payroll module — admin only */}
            <Route path="/payroll" element={<ProtectedRoute requiredRole="admin" requiredModule="payroll" moduleName="Payroll"><Payroll /></ProtectedRoute>} />
            <Route path="/payroll/calendar" element={<ProtectedRoute requiredRole="admin" requiredModule="payroll" moduleName="Payroll"><PayrollCalendar /></ProtectedRoute>} />
            <Route path="/payroll/analytics" element={<ProtectedRoute requiredRole="admin" requiredModule="payroll" moduleName="Payroll"><PayrollAnalytics /></ProtectedRoute>} />
            <Route path="/payroll/comparison" element={<ProtectedRoute requiredRole="admin" requiredModule="payroll" moduleName="Payroll"><PayrollComparison /></ProtectedRoute>} />
            <Route path="/payroll/overpayments" element={<ProtectedRoute requiredRole="admin" requiredModule="payroll" moduleName="Payroll"><PayrollOverpayments /></ProtectedRoute>} />
            <Route path="/payroll/audit" element={<ProtectedRoute requiredRole="admin" requiredModule="payroll" moduleName="Payroll"><PayrollAudit /></ProtectedRoute>} />

            {/* Holidays — staff can see own, admin for audit */}
            <Route path="/holidays" element={<ProtectedRoute requiredRole="staff"><Holidays /></ProtectedRoute>} />
            <Route path="/holidays/audit" element={<ProtectedRoute requiredRole="admin"><HolidayAudit /></ProtectedRoute>} />

            {/* Absences — manager+ */}
            <Route path="/absences" element={<ProtectedRoute requiredRole="manager"><AbsenceTracker /></ProtectedRoute>} />

            {/* Workforce — manager+ */}
            <Route path="/workforce" element={<ProtectedRoute requiredRole="manager"><Workforce /></ProtectedRoute>} />

            {/* Onboarding — manager+ */}
            <Route path="/onboarding" element={<ProtectedRoute requiredRole="manager"><Onboarding /></ProtectedRoute>} />

            {/* Training — staff+ */}
            <Route path="/training" element={<ProtectedRoute requiredRole="staff" requiredModule="training" moduleName="Training"><TrainingRecords /></ProtectedRoute>} />

            {/* Announcements — staff+ */}
            <Route path="/announcements" element={<ProtectedRoute requiredRole="staff"><Announcements /></ProtectedRoute>} />

            {/* Admin-only sections */}
            <Route path="/disciplinary" element={<ProtectedRoute requiredRole="admin"><Disciplinary /></ProtectedRoute>} />
            <Route path="/contracts" element={<ProtectedRoute requiredRole="admin" requiredModule="documents" moduleName="Documents"><Contracts /></ProtectedRoute>} />
            <Route path="/locations" element={<ProtectedRoute requiredRole="admin"><Locations /></ProtectedRoute>} />
            <Route path="/locations/:branch" element={<ProtectedRoute requiredRole="admin"><LocationDashboard /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute requiredRole="admin"><Settings /></ProtectedRoute>} />
            <Route path="/talent-pool" element={<ProtectedRoute requiredRole="staff"><TalentPool /></ProtectedRoute>} />

            {/* Platform admin — platform owner only */}
            <Route path="/platform-admin" element={<ProtectedRoute platformAdminOnly><PlatformAdmin /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </PrivacyShieldProvider>
          </I18nProvider>
        </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
