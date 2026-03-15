import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useSandboxTenants, useCreateSandbox, useDeleteSandbox, useResetSandbox, type SandboxConfig } from "@/hooks/useSandbox";
import { useImpersonation } from "@/hooks/useImpersonation";
import { QATestChecklist } from "./QATestChecklist";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus, Trash2, RotateCcw, Eye, Users, Building2,
  Loader2, FlaskConical, UserCog, ChevronDown, ChevronUp,
  Clipboard, StickyNote,
} from "lucide-react";
import type { AppRole } from "@/lib/roles";

const PRESETS = [
  { value: "empty", label: "Empty Tenant", desc: "No data, blank slate" },
  { value: "small_restaurant", label: "Small Restaurant", desc: "5 employees, 1 location" },
  { value: "multi_branch", label: "Multi-Branch Group", desc: "8 employees, 3 locations" },
];

const SETUP_STATES = [
  { value: "new_signup", label: "Brand New Signup" },
  { value: "half_configured", label: "Half Configured" },
  { value: "fully_configured", label: "Fully Configured" },
];

export function SandboxTestingConsole() {
  const { data: sandboxes, isLoading } = useSandboxTenants();
  const createSandbox = useCreateSandbox();
  const deleteSandbox = useDeleteSandbox();
  const resetSandbox = useResetSandbox();
  const impersonation = useImpersonation();

  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [showChecklist, setShowChecklist] = useState(false);

  // Create form state
  const [config, setConfig] = useState<Partial<SandboxConfig>>({
    tenantName: "Sandbox Restaurant",
    country: "GB",
    timezone: "Europe/London",
    workStyle: "restaurant",
    teamSize: "small",
    locationCount: 1,
    payrollFrequency: "monthly",
    serviceChargeEnabled: false,
    setupState: "fully_configured",
    preset: "small_restaurant",
    seedTalentProfiles: false,
    seedVacancies: false,
    seedPayrollPeriods: false,
    seedArchivedLeaver: false,
  });

  const handleCreate = async () => {
    await createSandbox.mutateAsync(config);
    setShowCreate(false);
  };

  const handleImpersonate = async (tenantId: string, tenantName: string, role: AppRole, label: string) => {
    await impersonation.startImpersonation(tenantId, tenantName, { role, label });
    toast.success(`Now viewing as: ${label}`);
  };

  const handleSaveNotes = async (sandboxId: string) => {
    const notes = notesMap[sandboxId];
    if (notes === undefined) return;
    await supabase.from("sandbox_tenants").update({ testing_notes: notes }).eq("id", sandboxId);
    toast.success("Notes saved");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Sandbox Testing Console
          </h2>
          <p className="text-sm text-muted-foreground">Create sandbox tenants, impersonate roles, and validate flows</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowChecklist(!showChecklist)} className="gap-2 text-sm">
            <Clipboard className="h-4 w-4" />
            {showChecklist ? "Hide Checklist" : "QA Checklist"}
          </Button>
          <Button onClick={() => setShowCreate(!showCreate)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Sandbox
          </Button>
        </div>
      </div>

      {/* QA Checklist */}
      {showChecklist && <QATestChecklist />}

      {/* Create form */}
      {showCreate && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">New Sandbox Tenant</CardTitle>
            <CardDescription>Configure a test environment with optional sample data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tenant Name</Label>
                <Input
                  value={config.tenantName || ""}
                  onChange={e => setConfig(p => ({ ...p, tenantName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Preset</Label>
                <Select value={config.preset} onValueChange={v => setConfig(p => ({ ...p, preset: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRESETS.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label} — {p.desc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Setup State</Label>
                <Select value={config.setupState} onValueChange={v => setConfig(p => ({ ...p, setupState: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SETUP_STATES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={config.country} onValueChange={v => setConfig(p => ({ ...p, country: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GB">United Kingdom</SelectItem>
                    <SelectItem value="PT">Portugal</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="FR">France</SelectItem>
                    <SelectItem value="DE">Germany</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Locations</Label>
                <Select value={String(config.locationCount)} onValueChange={v => setConfig(p => ({ ...p, locationCount: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Location</SelectItem>
                    <SelectItem value="2">2 Locations</SelectItem>
                    <SelectItem value="3">3 Locations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payroll Frequency</Label>
                <Select value={config.payrollFrequency} onValueChange={v => setConfig(p => ({ ...p, payrollFrequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="4-weekly">4-Weekly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Seeding options */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Sample Data Seeding</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={config.serviceChargeEnabled}
                    onCheckedChange={v => setConfig(p => ({ ...p, serviceChargeEnabled: v }))}
                  />
                  <Label className="text-sm">Service Charge</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={config.seedTalentProfiles}
                    onCheckedChange={v => setConfig(p => ({ ...p, seedTalentProfiles: v }))}
                  />
                  <Label className="text-sm">Talent Profiles</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={config.seedVacancies}
                    onCheckedChange={v => setConfig(p => ({ ...p, seedVacancies: v }))}
                  />
                  <Label className="text-sm">Sample Vacancies</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={config.seedPayrollPeriods}
                    onCheckedChange={v => setConfig(p => ({ ...p, seedPayrollPeriods: v }))}
                  />
                  <Label className="text-sm">Payroll Periods</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={config.seedArchivedLeaver}
                    onCheckedChange={v => setConfig(p => ({ ...p, seedArchivedLeaver: v }))}
                  />
                  <Label className="text-sm">Archived Leaver</Label>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreate} disabled={createSandbox.isPending} className="gap-2">
                {createSandbox.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Sandbox
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sandbox list */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !sandboxes?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No sandbox tenants yet. Create one to start testing.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sandboxes.map((sb: any) => {
            const tenant = sb.tenants;
            const isExpanded = expandedId === sb.id;
            const testUsers = (sb.test_users || []) as Array<{ label: string; role: string }>;

            return (
              <Card key={sb.id} className="overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : sb.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-lg">🧪</div>
                    <div>
                      <div className="font-medium text-foreground">{tenant?.name || "Unknown"}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] h-4">{sb.preset_name}</Badge>
                        <Badge variant="secondary" className="text-[10px] h-4">{sb.setup_state}</Badge>
                        <span className="text-muted-foreground">{tenant?.country}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {impersonation.active && impersonation.sandboxTenantId === tenant?.id && (
                      <Badge className="bg-amber-500 text-amber-950">Active</Badge>
                    )}
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border px-4 pb-4 space-y-4">
                    {/* Quick role switcher */}
                    <div className="pt-4">
                      <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                        <UserCog className="h-4 w-4" /> Impersonate Role
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {testUsers.map((u, i) => (
                          <Button
                            key={i}
                            size="sm"
                            variant={
                              impersonation.active &&
                              impersonation.sandboxTenantId === tenant?.id &&
                              impersonation.impersonatedUserLabel === u.label
                                ? "default"
                                : "outline"
                            }
                            className="gap-1.5 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImpersonate(tenant?.id, tenant?.name, u.role as AppRole, u.label);
                            }}
                          >
                            <Eye className="h-3 w-3" /> {u.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Info grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground">Service Charge</span>
                        <p className="font-medium">{tenant?.service_charge_enabled ? "Enabled" : "Disabled"}</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground">Modules</span>
                        <p className="font-medium">
                          {Object.entries(tenant?.enabled_modules || {}).filter(([, v]) => v).map(([k]) => k).join(", ")}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground">Created</span>
                        <p className="font-medium">{new Date(sb.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground">Status</span>
                        <p className="font-medium capitalize">{tenant?.status}</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Testing notes */}
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1.5">
                        <StickyNote className="h-3 w-3" /> Testing Notes
                      </Label>
                      <Textarea
                        placeholder="Record UX issues, bugs, or observations..."
                        value={notesMap[sb.id] ?? sb.testing_notes ?? ""}
                        onChange={e => setNotesMap(prev => ({ ...prev, [sb.id]: e.target.value }))}
                        rows={3}
                        className="text-xs"
                      />
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handleSaveNotes(sb.id)}>
                        <Clipboard className="h-3 w-3" /> Save Notes
                      </Button>
                    </div>

                    <Separator />

                    {/* Danger zone */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        onClick={() => resetSandbox.mutate(tenant?.id)}
                        disabled={resetSandbox.isPending}
                      >
                        <RotateCcw className="h-3 w-3" /> Reset Data
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive" className="gap-1 text-xs">
                            <Trash2 className="h-3 w-3" /> Delete Sandbox
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete sandbox?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the sandbox tenant and all its data. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                if (impersonation.sandboxTenantId === tenant?.id) impersonation.stopImpersonation();
                                deleteSandbox.mutate(tenant?.id);
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
