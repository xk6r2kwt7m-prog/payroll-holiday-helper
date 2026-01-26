import { useState } from "react";
import { Search, Edit2, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEmployees, useDeleteEmployee, type Employee } from "@/hooks/useEmployees";
import { formatCurrency, UK_HOLIDAY_LAW, calculateHolidayAccrual } from "@/hooks/useHolidays";
import { EmployeeFormDialog } from "@/components/employees/EmployeeFormDialog";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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

type Department = "FOH" | "BOH" | "CPU";

const Employees = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<Department | "all">("all");
  
  const { data: employees = [], isLoading, error } = useEmployees();
  const deleteEmployee = useDeleteEmployee();
  const { isAdmin } = useAuth();

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

  const handleDelete = async (employee: Employee) => {
    if (confirm(`Are you sure you want to delete ${employee.forename} ${employee.surname}?`)) {
      try {
        await deleteEmployee.mutateAsync(employee.id);
        toast.success("Employee deleted");
      } catch {
        toast.error("Failed to delete employee");
      }
    }
  };

  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Failed to load employees. Please try again.</p>
        </div>
      </AppLayout>
    );
  }

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
          {isAdmin && <EmployeeFormDialog />}
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

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-xl bg-card p-5 shadow-card animate-pulse">
                <div className="h-12 w-12 rounded-full bg-muted mb-4" />
                <div className="h-4 w-32 bg-muted mb-2" />
                <div className="h-3 w-24 bg-muted" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && employees.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No employees yet. Add your first employee to get started.</p>
            {isAdmin && <EmployeeFormDialog />}
          </div>
        )}

        {/* Employee Grid */}
        {!isLoading && filteredEmployees.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredEmployees.map((employee, index) => (
              <div
                key={employee.id}
                className="rounded-xl bg-card p-5 shadow-card transition-all duration-200 hover:shadow-elevated animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {employee.forename[0]}{employee.surname[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex gap-2 flex-wrap justify-end">
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
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(Number(employee.hourly_rate))}/hr + {formatCurrency(Number(employee.service_charge))} S.C.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Rate</p>
                    <p className="text-sm font-medium text-card-foreground">{formatCurrency(Number(employee.hourly_rate))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">S.C.</p>
                    <p className="text-sm font-medium text-card-foreground">{formatCurrency(Number(employee.service_charge))}</p>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                    <EmployeeFormDialog
                      employee={employee}
                      trigger={
                        <Button variant="outline" size="sm" className="flex-1">
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      }
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleDelete(employee)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Employees;
