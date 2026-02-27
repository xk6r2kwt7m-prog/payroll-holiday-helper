import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
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
import Auth from "./pages/Auth";
import SignContract from "./pages/SignContract";
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
          <CommandPalette />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedRoute>
                  <Employees />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll"
              element={
                <ProtectedRoute>
                  <Payroll />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll/calendar"
              element={
                <ProtectedRoute>
                  <PayrollCalendar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/holidays"
              element={
                <ProtectedRoute>
                  <Holidays />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/locations"
              element={
                <ProtectedRoute>
                  <Locations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contracts"
              element={
                <ProtectedRoute>
                  <Contracts />
                </ProtectedRoute>
              }
            />
            <Route path="/sign/:token" element={<SignContract />} />
            <Route
              path="/schedule"
              element={
                <ProtectedRoute>
                  <Schedule />
                </ProtectedRoute>
              }
            />
            <Route
              path="/timesheets"
              element={
                <ProtectedRoute>
                  <Timesheets />
                </ProtectedRoute>
              }
            />
            <Route path="/staff" element={<ProtectedRoute><StaffPortal /></ProtectedRoute>} />
            <Route path="/training" element={<ProtectedRoute><TrainingRecords /></ProtectedRoute>} />
            <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
            <Route path="/disciplinary" element={<ProtectedRoute><Disciplinary /></ProtectedRoute>} />
            <Route
              path="/schedule/report"
              element={
                <ProtectedRoute>
                  <ScheduleReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/schedule/analytics"
              element={
                <ProtectedRoute>
                  <ScheduleAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll/analytics"
              element={
                <ProtectedRoute>
                  <PayrollAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/holidays/audit"
              element={
                <ProtectedRoute>
                  <HolidayAudit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/absences"
              element={<ProtectedRoute><AbsenceTracker /></ProtectedRoute>}
            />
            <Route
              path="/onboarding"
              element={<ProtectedRoute><Onboarding /></ProtectedRoute>}
            />
            <Route
              path="/payroll/comparison"
              element={<ProtectedRoute><PayrollComparison /></ProtectedRoute>}
            />
            <Route
              path="/payroll/overpayments"
              element={<ProtectedRoute><PayrollOverpayments /></ProtectedRoute>}
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
