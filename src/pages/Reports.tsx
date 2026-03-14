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
      <div className="space-y-5 max-w-6xl">
        <div>
          <h1 className="text-xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Generate, filter, and export operational data</p>
        </div>

        <Tabs defaultValue="payroll-summary" className="w-full">
          <div className="bg-card border border-border rounded-lg p-1 mb-5">
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap bg-transparent h-auto gap-0.5">
              <TabsTrigger value="payroll-summary" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md px-3 py-2">
                <DollarSign className="h-3.5 w-3.5" /> Payroll
              </TabsTrigger>
              <TabsTrigger value="employee-payroll" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md px-3 py-2">
                <Users className="h-3.5 w-3.5" /> Pay Export
              </TabsTrigger>
              <TabsTrigger value="holiday-pay" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md px-3 py-2">
                <Palmtree className="h-3.5 w-3.5" /> Holiday Pay
              </TabsTrigger>
              <TabsTrigger value="labour-cost" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md px-3 py-2">
                <TrendingUp className="h-3.5 w-3.5" /> Labour Cost
              </TabsTrigger>
              <TabsTrigger value="attendance" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md px-3 py-2">
                <Clock className="h-3.5 w-3.5" /> Attendance
              </TabsTrigger>
              <TabsTrigger value="holidays" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md px-3 py-2">
                <Calendar className="h-3.5 w-3.5" /> Holiday Balances
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md px-3 py-2">
                <FileText className="h-3.5 w-3.5" /> Documents
              </TabsTrigger>
              <TabsTrigger value="training" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md px-3 py-2">
                <GraduationCap className="h-3.5 w-3.5" /> Training
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="payroll-summary" className="mt-0">
            <PayrollSummaryReport />
          </TabsContent>
          <TabsContent value="employee-payroll" className="mt-0">
            <EmployeePayrollExport />
          </TabsContent>
          <TabsContent value="holiday-pay" className="mt-0">
            <HolidayPayReport />
          </TabsContent>
          <TabsContent value="labour-cost" className="mt-0">
            <LabourCostReport />
          </TabsContent>
          <TabsContent value="attendance" className="mt-0">
            <AttendanceReport />
          </TabsContent>
          <TabsContent value="holidays" className="mt-0">
            <HolidayBalanceReport />
          </TabsContent>
          <TabsContent value="documents" className="mt-0">
            <DocumentExpiryReport />
          </TabsContent>
          <TabsContent value="training" className="mt-0">
            <TrainingComplianceReport />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
