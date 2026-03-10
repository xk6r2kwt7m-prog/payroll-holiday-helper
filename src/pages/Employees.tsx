import { useState, useEffect } from "react";
import { Search, Users, UserPlus, Filter, CheckSquare, Square, Archive } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useEmployees, useDeleteEmployee, type Employee } from "@/hooks/useEmployees";
import { EmployeeFormDialog } from "@/components/employees/EmployeeFormDialog";
import { EmployeeCard } from "@/components/employees/EmployeeCard";
import { EmployeeDetailSheet } from "@/components/employees/EmployeeDetailSheet";
import { BulkActionsBar } from "@/components/employees/BulkActionsBar";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Department = "FOH" | "BOH" | "CPU";
type StatusFilter = "all" | "active" | "starter" | "leaver";

const Employees = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<Department | "all">(
    (searchParams.get("dept") as Department) || "all"
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  const { data: employees = [], isLoading, error } = useEmployees(showArchived);
  const deleteEmployee = useDeleteEmployee();
  const { isAdmin, role } = useAuth();
  const canViewSensitive = isAdmin;

  // Update filter from URL params
  useEffect(() => {
    const dept = searchParams.get("dept") as Department;
    if (dept && ["FOH", "BOH", "CPU"].includes(dept)) {
      setDepartmentFilter(dept);
    }
  }, [searchParams]);

  const activeEmployees = showArchived ? employees : employees.filter(e => !e.archived_at);
  
  const filteredEmployees = activeEmployees.filter((emp) => {
    const matchesSearch =
      emp.forename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.surname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.ni_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_ref?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = departmentFilter === "all" || emp.department === departmentFilter;
    const matchesStatus = statusFilter === "all" || emp.status === statusFilter;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const activeCount = employees.filter(e => e.status === "active").length;
  const leaverCount = employees.filter(e => e.status === "leaver").length;
  const starterCount = employees.filter(e => e.status === "starter").length;

  const selectedEmployees = employees.filter(e => selectedIds.has(e.id));
  const allFilteredSelected = filteredEmployees.length > 0 && filteredEmployees.every(e => selectedIds.has(e.id));

  const handleDelete = async (employee: Employee) => {
    if (confirm(`Are you sure you want to delete ${employee.forename} ${employee.surname}? This action cannot be undone.`)) {
      try {
        await deleteEmployee.mutateAsync(employee.id);
        toast.success(`${employee.forename} ${employee.surname} has been removed`);
      } catch {
        toast.error("Failed to delete employee");
      }
    }
  };

  const handleViewDetails = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDetailSheetOpen(true);
  };

  const toggleSelection = (employeeId: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(employeeId)) {
      newSelection.delete(employeeId);
    } else {
      newSelection.add(employeeId);
    }
    setSelectedIds(newSelection);
    setIsSelectionMode(newSelection.size > 0);
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } else {
      const newSelection = new Set(filteredEmployees.map(e => e.id));
      setSelectedIds(newSelection);
      setIsSelectionMode(true);
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const handleDepartmentChange = (dept: Department | "all") => {
    setDepartmentFilter(dept);
    if (dept === "all") {
      searchParams.delete("dept");
    } else {
      searchParams.set("dept", dept);
    }
    setSearchParams(searchParams);
  };

  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive mb-2">Failed to load employees</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-slide-in-left">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              Employees
            </h1>
            <p className="text-muted-foreground mt-1">
              {employees.length} total • {activeCount} active • {starterCount} starters • {leaverCount} leavers
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant={showArchived ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowArchived(!showArchived)}
              >
                <Archive className="h-4 w-4 mr-2" />
                {showArchived ? "Hide Archived" : "Show Archived"}
              </Button>
            )}
            {isAdmin && filteredEmployees.length > 0 && (
              <Button
                variant={isSelectionMode ? "secondary" : "outline"}
                size="sm"
                onClick={() => {
                  if (isSelectionMode) {
                    clearSelection();
                  } else {
                    setIsSelectionMode(true);
                  }
                }}
              >
                {isSelectionMode ? (
                  <>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    {selectedIds.size} selected
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Select
                  </>
                )}
              </Button>
            )}
            {isAdmin && <EmployeeFormDialog />}
          </div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-3 animate-fade-in">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, department, NI number, or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 transition-all focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3">
              <Tabs value={departmentFilter} onValueChange={(v) => handleDepartmentChange(v as Department | "all")}>
                <TabsList className="h-9">
                  <TabsTrigger value="all" className="text-xs">All Depts</TabsTrigger>
                  <TabsTrigger value="FOH" className="text-xs">🍽️ FOH</TabsTrigger>
                  <TabsTrigger value="BOH" className="text-xs">👨‍🍳 BOH</TabsTrigger>
                  <TabsTrigger value="CPU" className="text-xs">🏭 CPU</TabsTrigger>
                </TabsList>
              </Tabs>

              <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <TabsList className="h-9">
                  <TabsTrigger value="all" className="text-xs">All Status</TabsTrigger>
                  <TabsTrigger value="active" className="text-xs">✅ Active</TabsTrigger>
                  <TabsTrigger value="starter" className="text-xs">🆕 Starters</TabsTrigger>
                  <TabsTrigger value="leaver" className="text-xs">👋 Leavers</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Select All */}
            {isSelectionMode && filteredEmployees.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectAll}
                className="text-xs"
              >
                {allFilteredSelected ? "Deselect All" : `Select All (${filteredEmployees.length})`}
              </Button>
            )}
          </div>
        </div>

        {/* Results Count */}
        {searchQuery || departmentFilter !== "all" || statusFilter !== "all" ? (
          <p className="text-sm text-muted-foreground animate-fade-in">
            Showing {filteredEmployees.length} of {employees.length} employees
          </p>
        ) : null}

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-xl bg-card p-5 shadow-card animate-pulse">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-14 w-14 rounded-full bg-muted" />
                  <div className="h-6 w-16 rounded-full bg-muted" />
                </div>
                <div className="h-5 w-32 bg-muted rounded mb-2" />
                <div className="h-4 w-24 bg-muted rounded mb-4" />
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                  <div className="h-10 bg-muted rounded" />
                  <div className="h-10 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && employees.length === 0 && (
          <div className="rounded-xl bg-card shadow-card p-12 text-center animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-4">
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-card-foreground mb-2">No employees yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Add your first employee to start managing your team. You can import from payroll or add manually.
            </p>
            {isAdmin && <EmployeeFormDialog />}
          </div>
        )}

        {/* No Results */}
        {!isLoading && employees.length > 0 && filteredEmployees.length === 0 && (
          <div className="rounded-xl bg-card shadow-card p-8 text-center animate-fade-in">
            <Filter className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No employees match your filters</p>
            <Button 
              variant="link" 
              onClick={() => {
                setSearchQuery("");
                handleDepartmentChange("all");
                setStatusFilter("all");
              }}
              className="mt-2"
            >
              Clear filters
            </Button>
          </div>
        )}

        {/* Employee Grid */}
        {!isLoading && filteredEmployees.length > 0 && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredEmployees.map((employee, index) => (
              <div key={employee.id} className="relative">
                {isSelectionMode && (
                  <div className="absolute top-3 left-3 z-10">
                    <Checkbox
                      checked={selectedIds.has(employee.id)}
                      onCheckedChange={() => toggleSelection(employee.id)}
                      className="h-5 w-5 bg-background border-2"
                    />
                  </div>
                )}
                <div 
                  className={selectedIds.has(employee.id) ? "ring-2 ring-primary rounded-xl" : ""}
                  onClick={isSelectionMode ? () => toggleSelection(employee.id) : undefined}
                >
                <EmployeeCard
                    employee={employee}
                    isAdmin={isAdmin && !isSelectionMode}
                    canViewSensitive={canViewSensitive}
                    onDelete={handleDelete}
                    onViewDetails={handleViewDetails}
                    index={index}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail Sheet */}
        <EmployeeDetailSheet
          employee={selectedEmployee}
          open={detailSheetOpen}
          onOpenChange={setDetailSheetOpen}
          isAdmin={isAdmin}
          canViewSensitive={canViewSensitive}
        />

        {/* Bulk Actions Bar */}
        {isAdmin && (
          <BulkActionsBar
            selectedEmployees={selectedEmployees}
            onClearSelection={clearSelection}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default Employees;
