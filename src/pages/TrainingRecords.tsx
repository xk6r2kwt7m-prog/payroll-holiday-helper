import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useEmployees } from "@/hooks/useEmployees";
import { useTrainingRecords, useAddTrainingRecord, useDeleteTrainingRecord, CERTIFICATION_TYPES } from "@/hooks/useTrainingRecords";
import { TrainingLibraryManager, TrainingCompletionDashboard } from "@/components/training/TrainingLibraryManager";
import { StaffTrainingView } from "@/components/training/StaffTrainingView";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GraduationCap, Plus, Trash2, AlertTriangle, CheckCircle2, Clock, BookOpen, ClipboardCheck } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { getRoleLevel } from "@/lib/roles";
import { usePermission } from "@/hooks/useRolePermissions";

export default function TrainingRecords() {
  const { role } = useAuth();
  const userLevel = getRoleLevel(role);
  const isManagerOrAbove = userLevel >= getRoleLevel("manager");
  const canManageTraining = usePermission("manage_training");
  const { employeeId } = useCurrentEmployee();

  // Staff view — only show their assigned training
  if (!isManagerOrAbove) {
    return (
      <AppLayout>
        <div className="space-y-6 max-w-lg mx-auto pb-24">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">My Training</h1>
              <p className="text-sm text-muted-foreground">Your assigned training and documents</p>
            </div>
          </div>
          {employeeId ? (
            <StaffTrainingView employeeId={employeeId} />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <GraduationCap className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">No training assigned</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Your manager will assign training materials when needed.
              </p>
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  // Manager/Admin view — full library, tracking, certifications
  return <TrainingAdminView />;
}

function TrainingAdminView() {
  const { data: employees = [] } = useEmployees();
  const { data: records = [] } = useTrainingRecords();
  const addRecord = useAddTrainingRecord();
  const deleteRecord = useDeleteTrainingRecord();
  const canManageTraining = usePermission("manage_training");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    employee_id: "", certification_name: "", certification_type: "food_hygiene",
    provider: "", date_obtained: "", expiry_date: "", notes: "",
  });

  const activeEmployees = employees.filter(e => e.status === "active" || e.status === "starter");

  const expiringRecords = useMemo(() => {
    const now = new Date();
    return records.filter(r => {
      if (!r.expiry_date) return false;
      const days = differenceInDays(parseISO(r.expiry_date), now);
      return days <= 60 && days >= 0;
    }).sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime());
  }, [records]);

  const expiredRecords = useMemo(() => {
    const now = new Date();
    return records.filter(r => r.expiry_date && differenceInDays(parseISO(r.expiry_date), now) < 0);
  }, [records]);

  const handleSubmit = () => {
    if (!form.employee_id || !form.certification_name || !form.date_obtained) return;
    addRecord.mutate({
      employee_id: form.employee_id,
      certification_name: form.certification_name,
      certification_type: form.certification_type,
      provider: form.provider || undefined,
      date_obtained: form.date_obtained,
      expiry_date: form.expiry_date || undefined,
      notes: form.notes || undefined,
    }, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm({ employee_id: "", certification_name: "", certification_type: "food_hygiene", provider: "", date_obtained: "", expiry_date: "", notes: "" });
      },
    });
  };

  const getExpiryBadge = (expiryDate: string | null) => {
    if (!expiryDate) return <Badge variant="outline" className="text-muted-foreground text-xs">No expiry</Badge>;
    const days = differenceInDays(parseISO(expiryDate), new Date());
    if (days < 0) return <Badge variant="destructive" className="text-xs">Expired {Math.abs(days)}d ago</Badge>;
    if (days <= 30) return <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Expires in {days}d</Badge>;
    if (days <= 60) return <Badge className="bg-warning/10 text-warning border-warning/20 text-xs"><Clock className="h-3 w-3 mr-1" />{days}d left</Badge>;
    return <Badge variant="outline" className="text-success text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Valid</Badge>;
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Training & Documents</h1>
            <p className="text-muted-foreground text-sm">Manage training, policies, certifications, and document assignments</p>
          </div>
        </div>

        <Tabs defaultValue="library">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="library" className="gap-1.5"><BookOpen className="h-4 w-4" /> Library</TabsTrigger>
            <TabsTrigger value="tracking" className="gap-1.5"><ClipboardCheck className="h-4 w-4" /> Tracking</TabsTrigger>
            <TabsTrigger value="certifications" className="gap-1.5"><GraduationCap className="h-4 w-4" /> Certifications</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-4">
            <TrainingLibraryManager />
          </TabsContent>

          <TabsContent value="tracking" className="mt-4">
            <TrainingCompletionDashboard />
          </TabsContent>

          <TabsContent value="certifications" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{records.length} certification records</p>
                {canManageTraining && (
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Record</Button>
                    </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Training Record</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div>
                        <Label>Employee</Label>
                        <Select value={form.employee_id} onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                          <SelectContent>
                            {activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.forename} {e.surname}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Certification Type</Label>
                        <Select value={form.certification_type} onValueChange={v => {
                          const ct = CERTIFICATION_TYPES.find(c => c.value === v);
                          setForm(f => ({ ...f, certification_type: v, certification_name: ct?.label || f.certification_name }));
                        }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CERTIFICATION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Certification Name</Label><Input value={form.certification_name} onChange={e => setForm(f => ({ ...f, certification_name: e.target.value }))} placeholder="e.g. Level 2 Food Hygiene" /></div>
                      <div><Label>Provider</Label><Input value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} placeholder="e.g. Highfield" /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Date Obtained</Label><Input type="date" value={form.date_obtained} onChange={e => setForm(f => ({ ...f, date_obtained: e.target.value }))} /></div>
                        <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
                      </div>
                      <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                      <Button onClick={handleSubmit} disabled={addRecord.isPending} className="w-full">
                        {addRecord.isPending ? "Saving..." : "Add Record"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {(expiredRecords.length > 0 || expiringRecords.length > 0) && (
                <div className="space-y-2">
                  {expiredRecords.length > 0 && (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                      <p className="text-sm text-destructive font-medium">{expiredRecords.length} expired</p>
                    </div>
                  )}
                  {expiringRecords.length > 0 && (
                    <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-warning flex-shrink-0" />
                      <p className="text-sm text-warning font-medium">{expiringRecords.length} expiring within 60 days</p>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-xl bg-card border border-border shadow-card overflow-hidden">
                <div className="divide-y divide-border">
                  {records.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                      <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                        <GraduationCap className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground mb-1">No certification records</h3>
                      <p className="text-sm text-muted-foreground max-w-xs">
                        Track food hygiene certificates, first aid qualifications, and other mandatory training for your team.
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1.5 max-w-xs">
                        The system will alert you when certifications are expiring so renewals aren't missed.
                      </p>
                    </div>
                  )}
                  {records.map(r => {
                    const emp = r.employees;
                    const name = emp ? `${emp.forename} ${emp.surname}` : "Unknown";
                    const certType = CERTIFICATION_TYPES.find(c => c.value === r.certification_type);
                    return (
                      <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">{emp?.forename?.[0]}{emp?.surname?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-card-foreground">{name}</p>
                            <p className="text-xs text-muted-foreground">
                              {r.certification_name} {r.provider && `· ${r.provider}`} · Obtained {format(parseISO(r.date_obtained), "d MMM yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getExpiryBadge(r.expiry_date)}
                          <Badge variant="outline" className="text-xs">{certType?.label || r.certification_type}</Badge>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteRecord.mutate(r.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
