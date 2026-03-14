import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Calendar, FileText, GraduationCap, DollarSign, Users, Palmtree, TrendingUp } from "lucide-react";
import { AttendanceReport } from "@/components/reports/AttendanceReport";
import { HolidayBalanceReport } from "@/components/reports/HolidayBalanceReport";
import { DocumentExpiryReport } from "@/components/reports/DocumentExpiryReport";
import { TrainingComplianceReport } from "@/components/reports/TrainingComplianceReport";
import { PayrollSummaryReport } from "@/components/reports/PayrollSummaryReport";
import { EmployeePayrollExport } from "@/components/reports/EmployeePayrollExport";
import { HolidayPayReport } from "@/components/reports/HolidayPayReport";
import { LabourCostReport } from "@/components/reports/LabourCostReport";

export default function Reports() {
  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>

        <Tabs defaultValue="payroll-summary" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
            <TabsTrigger value="payroll-summary" className="gap-1.5 text-xs sm:text-sm">
              <DollarSign className="h-3.5 w-3.5" /> Payroll
            </TabsTrigger>
            <TabsTrigger value="employee-payroll" className="gap-1.5 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5" /> Pay Export
            </TabsTrigger>
            <TabsTrigger value="holiday-pay" className="gap-1.5 text-xs sm:text-sm">
              <Palmtree className="h-3.5 w-3.5" /> Holiday Pay
            </TabsTrigger>
            <TabsTrigger value="labour-cost" className="gap-1.5 text-xs sm:text-sm">
              <TrendingUp className="h-3.5 w-3.5" /> Labour Cost
            </TabsTrigger>
            <TabsTrigger value="attendance" className="gap-1.5 text-xs sm:text-sm">
              <Clock className="h-3.5 w-3.5" /> Attendance
            </TabsTrigger>
            <TabsTrigger value="holidays" className="gap-1.5 text-xs sm:text-sm">
              <Calendar className="h-3.5 w-3.5" /> Holiday Balances
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5 text-xs sm:text-sm">
              <FileText className="h-3.5 w-3.5" /> Documents
            </TabsTrigger>
            <TabsTrigger value="training" className="gap-1.5 text-xs sm:text-sm">
              <GraduationCap className="h-3.5 w-3.5" /> Training
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payroll-summary" className="mt-4">
            <PayrollSummaryReport />
          </TabsContent>
          <TabsContent value="employee-payroll" className="mt-4">
            <EmployeePayrollExport />
          </TabsContent>
          <TabsContent value="holiday-pay" className="mt-4">
            <HolidayPayReport />
          </TabsContent>
          <TabsContent value="labour-cost" className="mt-4">
            <LabourCostReport />
          </TabsContent>
          <TabsContent value="attendance" className="mt-4">
            <AttendanceReport />
          </TabsContent>
          <TabsContent value="holidays" className="mt-4">
            <HolidayBalanceReport />
          </TabsContent>
          <TabsContent value="documents" className="mt-4">
            <DocumentExpiryReport />
          </TabsContent>
          <TabsContent value="training" className="mt-4">
            <TrainingComplianceReport />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
