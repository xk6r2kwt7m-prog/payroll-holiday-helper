import { useState, useEffect, useMemo } from "react";
import { Search, Users, UserPlus, Filter, CheckSquare, Square, Archive, ArrowUpDown } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEmployees, useDeleteEmployee, type Employee } from "@/hooks/useEmployees";
import { EmployeeFormDialog } from "@/components/employees/EmployeeFormDialog";
import { InviteEmployeeDialog } from "@/components/employees/InviteEmployeeDialog";
import { EmployeeCard } from "@/components/employees/EmployeeCard";
import { EmployeeDetailSheet } from "@/components/employees/EmployeeDetailSheet";
import { BulkActionsBar } from "@/components/employees/BulkActionsBar";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Department = "FOH" | "BOH" | "CPU";
type StatusFilter = "active" | "starter" | "leaver" | "archived";
type SortOption = "alpha" | "newest" | "recent-leavers" | "department";

const Employees = () => {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<Department | "all">(
    (searchParams.get("dept") as Department) || "all"
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [sortBy, setSortBy] = useState<SortOption>("alpha");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const STATUS_CONFIG: Record<StatusFilter, { label: string; emoji: string; style: string }> = {
    active: { label: t("employees.status_active"), emoji: "✅", style: "bg-success/10 text-success border-success/30" },
    starter: { label: t("employees.status_starters"), emoji: "🆕", style: "bg-primary/10 text-primary border-primary/30" },
    leaver: { label: t("employees.status_leavers"), emoji: "👋", style: "bg-destructive/10 text-destructive border-destructive/30" },
    archived: { label: t("employees.status_archived"), emoji: "📦", style: "bg-muted text-muted-foreground border-border" },
  };

  const DEPT_CONFIG: Record<string, { label: string; emoji: string }> = {
    all: { label: t("common.all"), emoji: "" },
    FOH: { label: "FOH", emoji: "🍽️" },
    BOH: { label: "BOH", emoji: "👨‍🍳" },
    CPU: { label: "CPU", emoji: "🏭" },
  };

  const SORT_OPTIONS: Record<SortOption, string> = {
    alpha: t("employees.sort_alpha"),
    newest: t("employees.sort_newest"),
    "recent-leavers": t("employees.sort_leavers"),
    department: t("employees.sort_department"),
  };

  const includeArchived = statusFilter === "archived";
  const { data: employees = [], isLoading, error } = useEmployees(includeArchived);
  const deleteEmployee = useDeleteEmployee();
  const { isAdmin } = useAuth();
  const canViewSensitive = isAdmin;

  useEffect(() => {
    const dept = searchParams.get("dept") as Department;
    if (dept && ["FOH", "BOH", "CPU"].includes(dept)) {
      setDepartmentFilter(dept);
    }
  }, [searchParams]);

  const counts = useMemo(() => ({
    active: employees.filter(e => e.status === "active" && !e.archived_at).length,
    starter: employees.filter(e => e.status === "starter" && !e.archived_at).length,
    leaver: employees.filter(e => e.status === "leaver" && !e.archived_at).length,
    archived: employees.filter(e => !!e.archived_at).length,
  }), [employees]);

  const filteredEmployees = useMemo(() => {
    let result = employees.filter((emp) => {
      const matchesSearch = !searchQuery ||
        emp.forename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.surname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employee_ref?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDepartment = departmentFilter === "all" || emp.department === departmentFilter;

      let matchesStatus: boolean;
      if (statusFilter === "archived") {
        matchesStatus = !!emp.archived_at;
      } else {
        matchesStatus = emp.status === statusFilter && !emp.archived_at;
      }

      return matchesSearch && matchesDepartment && matchesStatus;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case "alpha":
          return `${a.forename} ${a.surname}`.localeCompare(`${b.forename} ${b.surname}`);
        case "newest":
          return (b.start_date || "").localeCompare(a.start_date || "");
        case "recent-leavers":
          return (b.end_date || b.updated_at).localeCompare(a.end_date || a.updated_at);
        case "department":
          return a.department.localeCompare(b.department) || `${a.forename}`.localeCompare(`${b.forename}`);
        default:
          return 0;
      }
    });

    return result;
  }, [employees, searchQuery, departmentFilter, statusFilter, sortBy]);

  const selectedEmployees = employees.filter(e => selectedIds.has(e.id));
  const allFilteredSelected = filteredEmployees.length > 0 && filteredEmployees.every(e => selectedIds.has(e.id));

  const handleDelete = async (employee: Employee) => {
    if (confirm(t("employees.confirm_delete", { name: `${employee.forename} ${employee.surname}` }))) {
      try {
        await deleteEmployee.mutateAsync(employee.id);
        toast.success(t("employees.deleted_success", { name: `${employee.forename} ${employee.surname}` }));
      } catch {
        toast.error(t("employees.failed_delete"));
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
      setSelectedIds(new Set(filteredEmployees.map(e => e.id)));
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
            <p className="text-destructive mb-2">{t("employees.failed_to_load")}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>{t("common.try_again")}</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
              {t("employees.people")}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && filteredEmployees.length > 0 && (
              <Button
                variant={isSelectionMode ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => isSelectionMode ? clearSelection() : setIsSelectionMode(true)}
              >
                {isSelectionMode ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              </Button>
            )}
            {isAdmin && <EmployeeFormDialog />}
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {(Object.keys(STATUS_CONFIG) as StatusFilter[]).map((status) => {
            if (status === "archived" && !isAdmin) return null;
            const count = counts[status];
            const config = STATUS_CONFIG[status];
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap shrink-0",
                  isActive ? config.style + " shadow-sm" : "bg-card text-muted-foreground border-border hover:border-primary/20"
                )}
              >
                <span>{config.emoji}</span>
                <span>{config.label}</span>
                <span className={cn(
                  "ml-0.5 tabular-nums font-bold",
                  isActive ? "" : "text-muted-foreground/60"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Leaver/Archived mode banner */}
        {(statusFilter === "leaver" || statusFilter === "archived") && (
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs",
            statusFilter === "leaver" ? "bg-destructive/5 text-destructive border border-destructive/10" : "bg-muted text-muted-foreground border border-border"
          )}>
            <span>{statusFilter === "leaver" ? "👋" : "📦"}</span>
            <span>{statusFilter === "leaver" ? t("employees.viewing_leavers") : t("employees.viewing_archived")}</span>
            <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs px-2" onClick={() => setStatusFilter("active")}>
              {t("common.back_to_active")}
            </Button>
          </div>
        )}

        {/* Search + Dept + Sort row */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("employees.search_placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>

          <div className="flex items-center gap-2 justify-between">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
              {Object.entries(DEPT_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => handleDepartmentChange(key as Department | "all")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                    departmentFilter === key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {config.emoji} {config.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isSelectionMode && (
                <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="text-xs h-7 px-2">
                  {allFilteredSelected ? t("common.deselect") : t("common.select_all")}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground">
                    <ArrowUpDown className="h-3 w-3 mr-1" />
                    {SORT_OPTIONS[sortBy]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {Object.entries(SORT_OPTIONS).map(([key, label]) => (
                    <DropdownMenuItem key={key} onClick={() => setSortBy(key as SortOption)}>
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Results count */}
        {(searchQuery || departmentFilter !== "all") && (
          <p className="text-xs text-muted-foreground">
            {filteredEmployees.length === 1
              ? t("common.results", { count: filteredEmployees.length })
              : t("common.results_plural", { count: filteredEmployees.length })}
          </p>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-xl bg-card p-4 shadow-sm animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1">
                    <div className="h-4 w-28 bg-muted rounded mb-1.5" />
                    <div className="h-3 w-16 bg-muted rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && employees.length === 0 && (
          <div className="rounded-xl bg-card shadow-sm p-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-4">
              <UserPlus className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-card-foreground mb-2">{t("employees.no_employees_yet")}</h3>
            <p className="text-muted-foreground mb-6 text-sm max-w-md mx-auto">
              {t("employees.add_first_employee")}
            </p>
            {isAdmin && <EmployeeFormDialog />}
          </div>
        )}

        {/* No results */}
        {!isLoading && employees.length > 0 && filteredEmployees.length === 0 && (
          <div className="rounded-xl bg-card shadow-sm p-8 text-center">
            <Filter className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">{t("employees.no_match_filters")}</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                handleDepartmentChange("all");
                setStatusFilter("active");
              }}
              className="mt-2"
            >
              {t("common.clear_filters")}
            </Button>
          </div>
        )}

        {/* Employee Grid */}
        {!isLoading && filteredEmployees.length > 0 && (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

        <EmployeeDetailSheet
          employee={selectedEmployee}
          open={detailSheetOpen}
          onOpenChange={setDetailSheetOpen}
          isAdmin={isAdmin}
          canViewSensitive={canViewSensitive}
        />

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
