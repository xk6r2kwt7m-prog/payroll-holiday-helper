import { useState } from "react";
import { Search, Plus, Filter } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  salary: number;
  startDate: string;
  status: "active" | "on-leave" | "pending";
  holidayBalance: number;
}

const employees: Employee[] = [
  { id: "1", name: "Sarah Johnson", email: "sarah@company.com", role: "Senior Developer", department: "Engineering", salary: 95000, startDate: "Jan 15, 2022", status: "active", holidayBalance: 18 },
  { id: "2", name: "Michael Chen", email: "michael@company.com", role: "Product Manager", department: "Product", salary: 105000, startDate: "Mar 8, 2021", status: "active", holidayBalance: 22 },
  { id: "3", name: "Emily Davis", email: "emily@company.com", role: "UX Designer", department: "Design", salary: 85000, startDate: "Jun 20, 2023", status: "on-leave", holidayBalance: 12 },
  { id: "4", name: "James Wilson", email: "james@company.com", role: "Data Analyst", department: "Analytics", salary: 78000, startDate: "Sep 5, 2022", status: "active", holidayBalance: 15 },
  { id: "5", name: "Lisa Anderson", email: "lisa@company.com", role: "HR Manager", department: "Human Resources", salary: 88000, startDate: "Nov 12, 2020", status: "active", holidayBalance: 20 },
  { id: "6", name: "David Brown", email: "david@company.com", role: "Backend Developer", department: "Engineering", salary: 92000, startDate: "Feb 28, 2023", status: "active", holidayBalance: 14 },
  { id: "7", name: "Jennifer Taylor", email: "jennifer@company.com", role: "Marketing Lead", department: "Marketing", salary: 82000, startDate: "Apr 10, 2022", status: "pending", holidayBalance: 16 },
  { id: "8", name: "Robert Martinez", email: "robert@company.com", role: "DevOps Engineer", department: "Engineering", salary: 98000, startDate: "Jul 1, 2021", status: "active", holidayBalance: 21 },
];

const statusStyles = {
  active: "bg-success/10 text-success border-success/20",
  "on-leave": "bg-warning/10 text-warning border-warning/20",
  pending: "bg-muted text-muted-foreground border-border",
};

const statusLabels = {
  active: "Active",
  "on-leave": "On Leave",
  pending: "Pending",
};

const Employees = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-slide-in-left">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Employees</h1>
            <p className="text-muted-foreground">
              Manage your team members and their information
            </p>
          </div>
          <Button className="gradient-primary">
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>

        {/* Search and Filter */}
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
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Employee Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredEmployees.map((employee, index) => (
            <div
              key={employee.id}
              className="rounded-xl bg-card p-5 shadow-card transition-all duration-200 hover:shadow-elevated animate-fade-in cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {employee.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <Badge variant="outline" className={statusStyles[employee.status]}>
                  {statusLabels[employee.status]}
                </Badge>
              </div>
              <div className="space-y-1 mb-4">
                <h3 className="font-semibold text-card-foreground">{employee.name}</h3>
                <p className="text-sm text-muted-foreground">{employee.role}</p>
                <p className="text-xs text-muted-foreground">{employee.email}</p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Department</p>
                  <p className="text-sm font-medium text-card-foreground">{employee.department}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Holiday Balance</p>
                  <p className="text-sm font-medium text-primary">{employee.holidayBalance} days</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Employees;
