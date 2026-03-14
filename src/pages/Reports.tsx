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
  const tabTriggerClass =
    "gap-1.5 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:border-border/60 rounded-md px-3 py-2 text-muted-foreground data-[state=active]:text-foreground transition-colors";

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">Reports</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Generate, filter, and export operational data</p>
        </div>

        <Tabs defaultValue="payroll-summary" className="w-full">
          <div className="rounded-lg border border-border/60 bg-muted/40 p-1 mb-6">
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap bg-transparent h-auto gap-0.5">
              <TabsTrigger value="payroll-summary" className={tabTriggerClass}>
                <DollarSign className="h-3.5 w-3.5" /> Payroll
              </TabsTrigger>
              <TabsTrigger value="employee-payroll" className={tabTriggerClass}>
                <Users className="h-3.5 w-3.5" /> Pay Export
              </TabsTrigger>
              <TabsTrigger value="holiday-pay" className={tabTriggerClass}>
                <Palmtree className="h-3.5 w-3.5" /> Holiday Pay
              </TabsTrigger>
              <TabsTrigger value="labour-cost" className={tabTriggerClass}>
                <TrendingUp className="h-3.5 w-3.5" /> Labour Cost
              </TabsTrigger>
              <TabsTrigger value="attendance" className={tabTriggerClass}>
                <Clock className="h-3.5 w-3.5" /> Attendance
              </TabsTrigger>
              <TabsTrigger value="holidays" className={tabTriggerClass}>
                <Calendar className="h-3.5 w-3.5" /> Holiday Balances
              </TabsTrigger>
              <TabsTrigger value="documents" className={tabTriggerClass}>
                <FileText className="h-3.5 w-3.5" /> Documents
              </TabsTrigger>
              <TabsTrigger value="training" className={tabTriggerClass}>
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
