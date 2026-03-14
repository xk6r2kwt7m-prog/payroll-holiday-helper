import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Calendar, FileText, GraduationCap } from "lucide-react";
import { AttendanceReport } from "@/components/reports/AttendanceReport";
import { HolidayBalanceReport } from "@/components/reports/HolidayBalanceReport";
import { DocumentExpiryReport } from "@/components/reports/DocumentExpiryReport";
import { TrainingComplianceReport } from "@/components/reports/TrainingComplianceReport";

export default function Reports() {
  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>

        <Tabs defaultValue="attendance" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
            <TabsTrigger value="attendance" className="gap-1.5 text-xs sm:text-sm">
              <Clock className="h-3.5 w-3.5" /> Attendance
            </TabsTrigger>
            <TabsTrigger value="holidays" className="gap-1.5 text-xs sm:text-sm">
              <Calendar className="h-3.5 w-3.5" /> Holiday Balances
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5 text-xs sm:text-sm">
              <FileText className="h-3.5 w-3.5" /> Document Expiry
            </TabsTrigger>
            <TabsTrigger value="training" className="gap-1.5 text-xs sm:text-sm">
              <GraduationCap className="h-3.5 w-3.5" /> Training
            </TabsTrigger>
          </TabsList>

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
