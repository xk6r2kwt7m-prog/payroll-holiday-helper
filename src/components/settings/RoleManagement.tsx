import { useState } from "react";
import { Shield, Users, Loader2, ChevronDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmployees } from "@/hooks/useEmployees";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { AppRole } from "@/hooks/useAuth";

const ROLES: { value: AppRole; label: string; description: string; color: string }[] = [
  { value: "admin", label: "Admin", description: "Full access to all data and settings", color: "bg-primary/10 text-primary" },
  { value: "manager", label: "Manager", description: "Manage schedules, timesheets, holidays. No pay data", color: "bg-accent/10 text-accent" },
  { value: "supervisor", label: "Supervisor", description: "View schedules, timesheets, flag issues. No pay data", color: "bg-warning/10 text-warning" },
  { value: "staff", label: "Staff", description: "View own shifts, clock in/out, request holidays", color: "bg-muted text-muted-foreground" },
];

interface UserRoleRow {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export function RoleManagement() {
  const queryClient = useQueryClient();
  const { data: employees = [] } = useEmployees();
  
  // Get all user roles
  const { data: userRoles = [], isLoading } = useQuery({
    queryKey: ["user-roles-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*");
      if (error) throw error;
      return data as UserRoleRow[];
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Check if user already has a role
      const existing = userRoles.find(r => r.user_id === userId);
      
      if (existing) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles-all"] });
      toast.success("Role updated successfully");
    },
    onError: () => {
      toast.error("Failed to update role");
    },
  });

  // Get employees who have linked user accounts
  const linkedEmployees = employees.filter(e => e.user_id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Role legend */}
      <div className="grid grid-cols-2 gap-2">
        {ROLES.map(r => (
          <div key={r.value} className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className={r.color}>{r.label}</Badge>
            <span className="text-muted-foreground">{r.description}</span>
          </div>
        ))}
      </div>

      {/* User list with role assignment */}
      <div className="space-y-2">
        {linkedEmployees.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No employees have linked user accounts yet. Employees need a user account to be assigned a role.
          </p>
        ) : (
          linkedEmployees.map(emp => {
            const userRole = userRoles.find(r => r.user_id === emp.user_id);
            const currentRole = (userRole?.role as AppRole) || "staff";
            const roleInfo = ROLES.find(r => r.value === currentRole);

            return (
              <div key={emp.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {emp.forename[0]}{emp.surname[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground truncate">
                    {emp.forename} {emp.surname}
                  </p>
                  <p className="text-xs text-muted-foreground">{emp.department}</p>
                </div>
                <Select
                  value={currentRole}
                  onValueChange={(value) => {
                    if (emp.user_id) {
                      updateRole.mutate({ userId: emp.user_id, role: value as AppRole });
                    }
                  }}
                >
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r.value} value={r.value}>
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className={`${r.color} text-xs px-1.5 py-0`}>{r.label}</Badge>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
