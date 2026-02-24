import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useEmployees } from "@/hooks/useEmployees";
import { useDisciplinaryRecords, useAddDisciplinaryRecord, useUpdateDisciplinaryRecord, RECORD_TYPES, CATEGORIES } from "@/hooks/useDisciplinary";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ShieldAlert, Plus, Eye, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const categoryColors: Record<string, string> = {
  verbal_warning: "bg-warning/10 text-warning border-warning/20",
  written_warning: "bg-warning/15 text-warning border-warning/30",
  final_warning: "bg-destructive/10 text-destructive border-destructive/20",
  dismissal: "bg-destructive/15 text-destructive border-destructive/30",
  investigation: "bg-primary/10 text-primary border-primary/20",
  grievance_raised: "bg-accent/10 text-accent-foreground border-accent/20",
  grievance_resolved: "bg-success/10 text-success border-success/20",
};

export default function Disciplinary() {
  const { data: employees = [] } = useEmployees();
  const { data: records = [] } = useDisciplinaryRecords();
  const addRecord = useAddDisciplinaryRecord();
  const updateRecord = useUpdateDisciplinaryRecord();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [form, setForm] = useState({
    employee_id: "", record_type: "disciplinary", category: "verbal_warning",
    incident_date: "", description: "", witnesses: "", meeting_date: "",
    meeting_notes: "", outcome: "", appeal_deadline: "", expiry_date: "",
  });

  const activeEmployees = employees.filter(e => e.status === "active" || e.status === "starter");

  const handleSubmit = () => {
    if (!form.employee_id || !form.incident_date || !form.description) return;
    addRecord.mutate({
      employee_id: form.employee_id,
      record_type: form.record_type,
      category: form.category,
      incident_date: form.incident_date,
      description: form.description,
      witnesses: form.witnesses || undefined,
      meeting_date: form.meeting_date || undefined,
      meeting_notes: form.meeting_notes || undefined,
      outcome: form.outcome || undefined,
      appeal_deadline: form.appeal_deadline || undefined,
      expiry_date: form.expiry_date || undefined,
    }, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm({ employee_id: "", record_type: "disciplinary", category: "verbal_warning", incident_date: "", description: "", witnesses: "", meeting_date: "", meeting_notes: "", outcome: "", appeal_deadline: "", expiry_date: "" });
      },
    });
  };

  const activeRecords = records.filter(r => r.status === "active");
  const expiredRecords = records.filter(r => r.status !== "active");

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Disciplinary & Grievance Log</h1>
            <p className="text-muted-foreground">Confidential record of warnings, meetings & outcomes</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> New Record</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>New Disciplinary / Grievance Record</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Employee</Label>
                    <Select value={form.employee_id} onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.forename} {e.surname}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={form.record_type} onValueChange={v => setForm(f => ({ ...f, record_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{RECORD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Incident Date</Label><Input type="date" value={form.incident_date} onChange={e => setForm(f => ({ ...f, incident_date: e.target.value }))} /></div>
                </div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Detail the incident..." /></div>
                <div><Label>Witnesses</Label><Input value={form.witnesses} onChange={e => setForm(f => ({ ...f, witnesses: e.target.value }))} placeholder="Names of witnesses" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Meeting Date</Label><Input type="date" value={form.meeting_date} onChange={e => setForm(f => ({ ...f, meeting_date: e.target.value }))} /></div>
                  <div><Label>Appeal Deadline</Label><Input type="date" value={form.appeal_deadline} onChange={e => setForm(f => ({ ...f, appeal_deadline: e.target.value }))} /></div>
                </div>
                <div><Label>Meeting Notes</Label><Textarea value={form.meeting_notes} onChange={e => setForm(f => ({ ...f, meeting_notes: e.target.value }))} rows={2} /></div>
                <div><Label>Outcome</Label><Textarea value={form.outcome} onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))} rows={2} placeholder="Outcome / action taken" /></div>
                <div><Label>Warning Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
                <Button onClick={handleSubmit} disabled={addRecord.isPending} className="w-full">
                  {addRecord.isPending ? "Saving..." : "Save Record"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Confidentiality notice */}
        <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive font-medium">Confidential — This data is protected and only visible to administrators. All access is logged.</p>
        </div>

        {/* Active records */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active Records ({activeRecords.length})</h2>
          {activeRecords.length === 0 && (
            <div className="rounded-xl bg-card border border-border shadow-card p-8 text-center">
              <p className="text-muted-foreground">No active disciplinary or grievance records.</p>
            </div>
          )}
          {activeRecords.map(r => {
            const emp = r.employees;
            const name = emp ? `${emp.forename} ${emp.surname}` : "Unknown";
            const cat = CATEGORIES.find(c => c.value === r.category);
            return (
              <div key={r.id} className="rounded-xl bg-card border border-border shadow-card p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedRecord(r)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-destructive/10 text-destructive text-xs">{emp?.forename?.[0]}{emp?.surname?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{name} <span className="text-muted-foreground font-normal">· {emp?.department}</span></p>
                      <p className="text-xs text-muted-foreground mt-0.5">{format(parseISO(r.incident_date), "d MMM yyyy")} — {r.description.slice(0, 80)}{r.description.length > 80 ? "..." : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("text-xs", categoryColors[r.category])}>{cat?.label}</Badge>
                    <Badge variant="outline" className="text-xs capitalize">{r.record_type}</Badge>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Expired / resolved */}
        {expiredRecords.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Expired / Resolved ({expiredRecords.length})</h2>
            {expiredRecords.map(r => {
              const emp = r.employees;
              const name = emp ? `${emp.forename} ${emp.surname}` : "Unknown";
              const cat = CATEGORIES.find(c => c.value === r.category);
              return (
                <div key={r.id} className="rounded-xl bg-card border border-border shadow-card p-4 opacity-60 cursor-pointer" onClick={() => setSelectedRecord(r)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">{emp?.forename?.[0]}{emp?.surname?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-card-foreground">{name}</p>
                        <p className="text-xs text-muted-foreground">{format(parseISO(r.incident_date), "d MMM yyyy")} — {cat?.label}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">Expired</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detail sheet */}
        <Sheet open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
          <SheetContent className="overflow-y-auto">
            {selectedRecord && (
              <>
                <SheetHeader>
                  <SheetTitle>
                    {selectedRecord.record_type === "grievance" ? "Grievance" : "Disciplinary"} Record
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium text-muted-foreground">Employee:</span> <span className="text-foreground">{selectedRecord.employees?.forename} {selectedRecord.employees?.surname}</span></div>
                    <div><span className="font-medium text-muted-foreground">Category:</span> <Badge variant="outline" className={cn("text-xs ml-1", categoryColors[selectedRecord.category])}>{CATEGORIES.find(c => c.value === selectedRecord.category)?.label}</Badge></div>
                    <div><span className="font-medium text-muted-foreground">Incident Date:</span> <span>{format(parseISO(selectedRecord.incident_date), "d MMMM yyyy")}</span></div>
                    <div><span className="font-medium text-muted-foreground">Description:</span><p className="mt-1 text-foreground whitespace-pre-wrap">{selectedRecord.description}</p></div>
                    {selectedRecord.witnesses && <div><span className="font-medium text-muted-foreground">Witnesses:</span> <span>{selectedRecord.witnesses}</span></div>}
                    {selectedRecord.meeting_date && <div><span className="font-medium text-muted-foreground">Meeting Date:</span> <span>{format(parseISO(selectedRecord.meeting_date), "d MMMM yyyy")}</span></div>}
                    {selectedRecord.meeting_notes && <div><span className="font-medium text-muted-foreground">Meeting Notes:</span><p className="mt-1 whitespace-pre-wrap">{selectedRecord.meeting_notes}</p></div>}
                    {selectedRecord.outcome && <div><span className="font-medium text-muted-foreground">Outcome:</span><p className="mt-1 whitespace-pre-wrap">{selectedRecord.outcome}</p></div>}
                    {selectedRecord.appeal_deadline && <div><span className="font-medium text-muted-foreground">Appeal Deadline:</span> <span>{format(parseISO(selectedRecord.appeal_deadline), "d MMMM yyyy")}</span></div>}
                    {selectedRecord.expiry_date && <div><span className="font-medium text-muted-foreground">Warning Expires:</span> <span>{format(parseISO(selectedRecord.expiry_date), "d MMMM yyyy")}</span></div>}
                    <div><span className="font-medium text-muted-foreground">Status:</span> <Badge variant="outline" className="text-xs ml-1 capitalize">{selectedRecord.status}</Badge></div>
                  </div>
                  {selectedRecord.status === "active" && (
                    <Button variant="outline" className="w-full" onClick={() => {
                      updateRecord.mutate({ id: selectedRecord.id, status: "expired" });
                      setSelectedRecord(null);
                    }}>
                      Mark as Expired / Resolved
                    </Button>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}
