import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Link2, Unlink, AlertTriangle, Loader2, CheckCircle2, User, Users } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { cn } from "@/lib/utils";

interface EmployeeResult {
  id: string;
  forename: string;
  surname: string;
  email: string | null;
  user_id: string | null;
  status: string;
}

interface AuthUserResult {
  id: string;
  email: string;
}

export function EmployeeUserLinking() {
  const { tenantId } = useTenant();
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [employees, setEmployees] = useState<EmployeeResult[]>([]);
  const [authUsers, setAuthUsers] = useState<AuthUserResult[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeResult | null>(null);
  const [selectedUser, setSelectedUser] = useState<AuthUserResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);

  const searchEmployees = async () => {
    if (!employeeSearch.trim() || !tenantId) return;
    setSearching(true);
    try {
      const term = `%${employeeSearch.trim()}%`;
      const { data, error } = await supabase
        .from("employees")
        .select("id, forename, surname, email, user_id, status")
        .eq("tenant_id", tenantId)
        .or(`forename.ilike.${term},surname.ilike.${term},email.ilike.${term}`)
        .limit(20);
      if (error) throw error;
      setEmployees(data || []);
    } catch (err: any) {
      toast.error("Search failed: " + (err.message || "Unknown error"));
    } finally {
      setSearching(false);
    }
  };

  const searchAuthUsers = async () => {
    if (!userSearch.trim()) return;
    setSearching(true);
    try {
      // Use profiles table since we can't query auth.users directly
      const term = `%${userSearch.trim()}%`;
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .ilike("full_name", term)
        .limit(20);

      if (error) throw error;

      // Also try matching against employee emails to find auth accounts
      const { data: empData } = await supabase
        .from("employees")
        .select("user_id, email")
        .eq("tenant_id", tenantId!)
        .ilike("email", term)
        .not("user_id", "is", null)
        .limit(10);

      const results: AuthUserResult[] = [];
      const seen = new Set<string>();

      // From profiles
      (data || []).forEach(p => {
        if (p.user_id && !seen.has(p.user_id)) {
          seen.add(p.user_id);
          results.push({ id: p.user_id, email: p.full_name || p.user_id });
        }
      });

      // From employee records with known user_ids
      (empData || []).forEach(e => {
        if (e.user_id && !seen.has(e.user_id)) {
          seen.add(e.user_id);
          results.push({ id: e.user_id, email: e.email || e.user_id });
        }
      });

      // If the search looks like a UUID, also try direct lookup
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(userSearch.trim())) {
        const uid = userSearch.trim();
        if (!seen.has(uid)) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .eq("user_id", uid)
            .maybeSingle();
          if (prof) {
            results.push({ id: prof.user_id, email: prof.full_name || uid });
          }
        }
      }

      setAuthUsers(results);
      if (results.length === 0) {
        toast.info("No matching auth users found. Try searching by name or user ID.");
      }
    } catch (err: any) {
      toast.error("User search failed: " + (err.message || "Unknown error"));
    } finally {
      setSearching(false);
    }
  };

  const handleLink = async () => {
    if (!selectedEmployee || !selectedUser) return;

    if (selectedEmployee.user_id) {
      const confirmed = window.confirm(
        `⚠️ This employee is already linked to another user account (${selectedEmployee.user_id.slice(0, 8)}…).\n\nOverwriting this will disconnect the existing link.\n\nContinue?`
      );
      if (!confirmed) return;
    }

    setLinking(true);
    try {
      const { error } = await supabase
        .from("employees")
        .update({ user_id: selectedUser.id })
        .eq("id", selectedEmployee.id);

      if (error) throw error;

      toast.success(`Linked ${selectedEmployee.forename} ${selectedEmployee.surname} to user account.`);

      // Refresh employee list
      setSelectedEmployee({ ...selectedEmployee, user_id: selectedUser.id });
      setEmployees(prev =>
        prev.map(e => e.id === selectedEmployee.id ? { ...e, user_id: selectedUser.id } : e)
      );
    } catch (err: any) {
      toast.error("Linking failed: " + (err.message || "Unknown error"));
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (emp: EmployeeResult) => {
    const confirmed = window.confirm(
      `Remove the user account link from ${emp.forename} ${emp.surname}?\n\nThey will lose access to onboarding and self-service until re-linked.`
    );
    if (!confirmed) return;

    setLinking(true);
    try {
      const { error } = await supabase
        .from("employees")
        .update({ user_id: null })
        .eq("id", emp.id);

      if (error) throw error;

      toast.success(`Unlinked ${emp.forename} ${emp.surname} from user account.`);
      setEmployees(prev =>
        prev.map(e => e.id === emp.id ? { ...e, user_id: null } : e)
      );
      if (selectedEmployee?.id === emp.id) {
        setSelectedEmployee({ ...emp, user_id: null });
      }
    } catch (err: any) {
      toast.error("Unlink failed: " + (err.message || "Unknown error"));
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Employee Search */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Step 1: Find Employee
        </Label>
        <div className="flex gap-2">
          <Input
            placeholder="Search by name or email…"
            value={employeeSearch}
            onChange={e => setEmployeeSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && searchEmployees()}
            className="h-9"
          />
          <Button size="sm" variant="outline" onClick={searchEmployees} disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {employees.length > 0 && (
          <div className="border border-border rounded-lg divide-y divide-border/50 max-h-48 overflow-y-auto">
            {employees.map(emp => (
              <button
                key={emp.id}
                onClick={() => setSelectedEmployee(emp)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted/30 transition-colors text-sm",
                  selectedEmployee?.id === emp.id && "bg-primary/5 border-l-2 border-l-primary"
                )}
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {emp.forename} {emp.surname}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {emp.email || "No email"} · {emp.status}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {emp.user_id ? (
                    <>
                      <Badge variant="outline" className="text-[10px] h-5 bg-success/10 text-success border-success/30">
                        <CheckCircle2 className="h-3 w-3 mr-0.5" /> Linked
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleUnlink(emp); }}
                        title="Unlink user"
                      >
                        <Unlink className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <Badge variant="outline" className="text-[10px] h-5 bg-warning/10 text-warning border-warning/30">
                      Not linked
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* User Search */}
      {selectedEmployee && !selectedEmployee.user_id && (
        <div className="space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Step 2: Find User Account
          </Label>
          <p className="text-xs text-muted-foreground">
            Search by name or paste a user ID to find the auth account to link.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Search by name or user ID…"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && searchAuthUsers()}
              className="h-9"
            />
            <Button size="sm" variant="outline" onClick={searchAuthUsers} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {authUsers.length > 0 && (
            <div className="border border-border rounded-lg divide-y divide-border/50 max-h-36 overflow-y-auto">
              {authUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors text-sm",
                    selectedUser?.id === u.id && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                >
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{u.email}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{u.id.slice(0, 12)}…</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Link action */}
      {selectedEmployee && selectedUser && !selectedEmployee.user_id && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Link2 className="h-4 w-4 text-primary" />
            Ready to link
          </div>
          <p className="text-xs text-muted-foreground">
            <strong>{selectedEmployee.forename} {selectedEmployee.surname}</strong> → <strong>{selectedUser.email}</strong>
          </p>
          <Button size="sm" onClick={handleLink} disabled={linking} className="gap-2">
            {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Confirm Link
          </Button>
        </div>
      )}

      {/* Overwrite warning */}
      {selectedEmployee && selectedEmployee.user_id && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-warning">
            <AlertTriangle className="h-4 w-4" />
            Already linked
          </div>
          <p className="text-xs text-muted-foreground">
            {selectedEmployee.forename} {selectedEmployee.surname} is linked to user <span className="font-mono text-foreground">{selectedEmployee.user_id.slice(0, 12)}…</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Use the unlink button above to disconnect, then re-link to a different account.
          </p>
        </div>
      )}
    </div>
  );
}
