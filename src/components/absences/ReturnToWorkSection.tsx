import { useState } from "react";
import { useAbsenceRecords, AbsenceRecord } from "@/hooks/useAbsences";
import { useReturnToWorkForms, useCreateRTWForm } from "@/hooks/useReturnToWork";
import { useEmployees } from "@/hooks/useEmployees";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ClipboardCheck, Plus, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
  absences: AbsenceRecord[];
}

export function ReturnToWorkSection({ absences }: Props) {
  const { data: employees = [] } = useEmployees();
  const { data: rtwForms = [] } = useReturnToWorkForms();
  const createRTW = useCreateRTWForm();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState<string>("");
  const [form, setForm] = useState({
    fit_to_return: true,
    reason_for_absence: "",
    doctor_consulted: false,
    doctor_note_provided: false,
    adjustments_needed: "",
    follow_up_required: false,
    follow_up_date: "",
    follow_up_notes: "",
    manager_comments: "",
  });

  const absencesWithoutRTW = absences.filter(
    a => !rtwForms.some(r => r.absence_record_id === a.id)
  );

  const handleSubmit = () => {
    if (!selectedAbsence) return;
    const absence = absences.find(a => a.id === selectedAbsence);
    if (!absence) return;
    createRTW.mutate({
      absence_record_id: selectedAbsence,
      employee_id: absence.employee_id,
      ...form,
      follow_up_date: form.follow_up_date || undefined,
    }, {
      onSuccess: () => {
        setDialogOpen(false);
        setSelectedAbsence("");
        setForm({ fit_to_return: true, reason_for_absence: "", doctor_consulted: false, doctor_note_provided: false, adjustments_needed: "", follow_up_required: false, follow_up_date: "", follow_up_notes: "", manager_comments: "" });
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-card-foreground">Return-to-Work Forms</h3>
          {absencesWithoutRTW.length > 0 && (
            <Badge variant="destructive" className="text-xs">{absencesWithoutRTW.length} pending</Badge>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" /> Complete RTW</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Return-to-Work Interview</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2 max-h-[65vh] overflow-y-auto">
              <div>
                <Label>Absence Record</Label>
                <Select value={selectedAbsence} onValueChange={setSelectedAbsence}>
                  <SelectTrigger><SelectValue placeholder="Select absence" /></SelectTrigger>
                  <SelectContent>
                    {absencesWithoutRTW.map(a => {
                      const emp = a.employees;
                      const name = emp ? `${emp.forename} ${emp.surname}` : "Unknown";
                      return (
                        <SelectItem key={a.id} value={a.id}>
                          {name} — {a.absence_type} ({format(parseISO(a.start_date), "d MMM")} – {format(parseISO(a.end_date), "d MMM")})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Fit to return?</Label>
                <Switch checked={form.fit_to_return} onCheckedChange={v => setForm(f => ({ ...f, fit_to_return: v }))} />
              </div>
              <div><Label>Reason for absence (employee's words)</Label><Textarea value={form.reason_for_absence} onChange={e => setForm(f => ({ ...f, reason_for_absence: e.target.value }))} rows={2} /></div>
              <div className="flex items-center justify-between">
                <Label>Doctor / GP consulted?</Label>
                <Switch checked={form.doctor_consulted} onCheckedChange={v => setForm(f => ({ ...f, doctor_consulted: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Doctor's note / fit note provided?</Label>
                <Switch checked={form.doctor_note_provided} onCheckedChange={v => setForm(f => ({ ...f, doctor_note_provided: v }))} />
              </div>
              <div><Label>Adjustments needed</Label><Textarea value={form.adjustments_needed} onChange={e => setForm(f => ({ ...f, adjustments_needed: e.target.value }))} rows={2} placeholder="Any workplace adjustments required?" /></div>
              <div className="flex items-center justify-between">
                <Label>Follow-up required?</Label>
                <Switch checked={form.follow_up_required} onCheckedChange={v => setForm(f => ({ ...f, follow_up_required: v }))} />
              </div>
              {form.follow_up_required && (
                <>
                  <div><Label>Follow-up Date</Label><Input type="date" value={form.follow_up_date} onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))} /></div>
                  <div><Label>Follow-up Notes</Label><Textarea value={form.follow_up_notes} onChange={e => setForm(f => ({ ...f, follow_up_notes: e.target.value }))} rows={2} /></div>
                </>
              )}
              <div><Label>Manager Comments</Label><Textarea value={form.manager_comments} onChange={e => setForm(f => ({ ...f, manager_comments: e.target.value }))} rows={2} /></div>
              <Button onClick={handleSubmit} disabled={createRTW.isPending || !selectedAbsence} className="w-full">
                {createRTW.isPending ? "Saving..." : "Complete Return-to-Work Form"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Completed RTW forms */}
      <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
        {rtwForms.length === 0 && <p className="text-center text-muted-foreground py-6 text-sm">No return-to-work forms completed yet.</p>}
        {rtwForms.map(rtw => {
          const emp = rtw.employees;
          const name = emp ? `${emp.forename} ${emp.surname}` : "Unknown";
          return (
            <div key={rtw.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
              <div className="flex items-center gap-3">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-success/10 text-success text-[10px]">{emp?.forename?.[0]}{emp?.surname?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-card-foreground">{name}</p>
                  <p className="text-xs text-muted-foreground">
                    {rtw.completed_at && format(parseISO(rtw.completed_at), "d MMM yyyy")}
                    {rtw.fit_to_return ? " · Fit to return" : " · NOT fit to return"}
                    {rtw.follow_up_required && " · Follow-up required"}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className={cn("text-xs", rtw.fit_to_return ? "text-success" : "text-destructive")}>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {rtw.status}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
