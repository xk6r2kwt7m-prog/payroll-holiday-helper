import { Users, DollarSign, Calendar, Clock } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmployeeTable } from "@/components/dashboard/EmployeeTable";
import { HolidayRequests } from "@/components/dashboard/HolidayRequests";
import { UpcomingPayroll } from "@/components/dashboard/UpcomingPayroll";

const Index = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-slide-in-left">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your payroll and team.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Employees"
            value={48}
            subtitle="5 on leave today"
            icon={<Users className="h-5 w-5" />}
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Monthly Payroll"
            value="$352,500"
            subtitle="Next payment in 5 days"
            icon={<DollarSign className="h-5 w-5" />}
            variant="primary"
          />
          <StatCard
            title="Pending Requests"
            value={8}
            subtitle="3 require urgent action"
            icon={<Calendar className="h-5 w-5" />}
            variant="accent"
          />
          <StatCard
            title="Hours Tracked"
            value="1,842"
            subtitle="This month"
            icon={<Clock className="h-5 w-5" />}
            trend={{ value: 8, isPositive: true }}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Employee Table - Spans 2 columns */}
          <div className="lg:col-span-2">
            <EmployeeTable />
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            <UpcomingPayroll />
            <HolidayRequests />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
