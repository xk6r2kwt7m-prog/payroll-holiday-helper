import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { employees, formatCurrency, type PayrollEntry, type Department, type EmployeeStatus } from "@/data/payrollData";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusStyles = {
  active: "bg-success/10 text-success border-success/20",
  leaver: "bg-destructive/10 text-destructive border-destructive/20",
  starter: "bg-primary/10 text-primary border-primary/20",
};

const statusLabels = {
  active: "Active",
  leaver: "Leaver",
  starter: "Starter",
};

const departmentStyles = {
  FOH: "bg-accent/10 text-accent",
  BOH: "bg-primary/10 text-primary",
  CPU: "bg-warning/10 text-warning",
};

const Employees = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<Department | "all">("all");

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.forename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.surname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = departmentFilter === "all" || emp.department === departmentFilter;
    
    return matchesSearch && matchesDepartment;
  });

  const activeCount = employees.filter(e => e.status === "active").length;
  const leaverCount = employees.filter(e => e.status === "leaver").length;
  const starterCount = employees.filter(e => e.status === "starter").length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-slide-in-left">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Employees</h1>
            <p className="text-muted-foreground">
              {employees.length} total · {activeCount} active · {leaverCount} leavers · {starterCount} starters
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row animate-fade-in">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={departmentFilter} onValueChange={(v) => setDepartmentFilter(v as Department | "all")}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="FOH">FOH</TabsTrigger>
              <TabsTrigger value="BOH">BOH</TabsTrigger>
              <TabsTrigger value="CPU">CPU</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Employee Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredEmployees.map((employee, index) => (
            <div
              key={employee.employeeId}
              className="rounded-xl bg-card p-5 shadow-card transition-all duration-200 hover:shadow-elevated animate-fade-in cursor-pointer"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {employee.forename[0]}{employee.surname[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${departmentStyles[employee.department]}`}>
                    {employee.department}
                  </span>
                  <Badge variant="outline" className={statusStyles[employee.status]}>
                    {statusLabels[employee.status]}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1 mb-4">
                <h3 className="font-semibold text-card-foreground">{employee.forename} {employee.surname}</h3>
                <p className="text-sm text-muted-foreground">{formatCurrency(employee.hourlyRate)}/hr + {formatCurrency(employee.serviceCharge)} S.C.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Hours</p>
                  <p className="text-sm font-medium text-card-foreground">{employee.timesheetHours.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Pay</p>
                  <p className="text-sm font-semibold text-primary">{formatCurrency(employee.totalPay)}</p>
                </div>
                {(employee.performanceBonus > 0 || employee.specialBonus > 0) && (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">Perf. Bonus</p>
                      <p className="text-sm font-medium text-success">{formatCurrency(employee.performanceBonus)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Sp. Bonus</p>
                      <p className="text-sm font-medium text-accent">{formatCurrency(employee.specialBonus)}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Employees;
