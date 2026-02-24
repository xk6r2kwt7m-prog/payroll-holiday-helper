import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useEmployees } from "@/hooks/useEmployees";
import { useAbsenceRecords, useAddAbsence, useDeleteAbsence, calculateBradfordFactor, getBradfordLevel } from "@/hooks/useAbsences";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Plus, Trash2, AlertTriangle, TrendingUp, UserX } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isWithinInterval, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const ABSENCE_TYPES = [
  { value: "sick", label: "Sick", emoji: "🤒" },
  { value: "appointment", label: "Appointment", emoji: "🏥" },
  { value: "unauthorised", label: "Unauthorised", emoji: "❌" },
  { value: "compassionate", label: "Compassionate", emoji: "💐" },
  { value: "maternity", label: "Maternity", emoji: "👶" },
  { value: "paternity", label: "Paternity", emoji: "👶" },
  { value: "other", label: "Other", emoji: "📋" },
];

const typeColors: Record<string, string> = {
  sick: "bg-destructive/10 text-destructive border-destructive/20",
  appointment: "bg-primary/10 text-primary border-primary/20",
  unauthorised: "bg-destructive/15 text-destructive border-destructive/30",
  compassionate: "bg-accent/10 text-accent border-accent/20",
  maternity: "bg-success/10 text-success border-success/20",
  paternity: "bg-success/10 text-success border-success/20",
  other: "bg-muted text-muted-foreground border-border",
};

export default function AbsenceTracker() {
  const { data: employees = [] } = useEmployees();
  const { data: absences = [] } = useAbsenceRecords();
  const addAbsence = useAddAbsence();
  const deleteAbsence = useDeleteAbsence();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ employee_id: "", absence_type: "sick", start_date: "", end_date: "", hours: "0", notes: "" });
  const [currentDate, setCurrentDate] = useState(new Date());

  const activeEmployees = employees.filter(e => e.status === "active" || e.status === "starter");

  // Bradford Factor scores
  const bradfordScores = useMemo(() => {
    return activeEmployees.map(emp => {
      const empAbsences = absences.filter(a => a.employee_id === emp.id);
      const score = calculateBradfordFactor(empAbsences);
      const level = getBradfordLevel(score);
      const spellCount = empAbsences.filter(a => {
        const d = new Date(a.start_date);
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return d >= yearAgo;
      }).length;
      return { employee: emp, score, level, spellCount, totalAbsences: empAbsences.length };
    }).sort((a, b) => b.score - a.score);
  }, [activeEmployees, absences]);

  // Calendar data
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handleSubmit = () => {
    if (!form.employee_id || !form.start_date || !form.end_date) return;
    addAbsence.mutate({
      employee_id: form.employee_id,
      absence_type: form.absence_type,
      start_date: form.start_date,
      end_date: form.end_date,
      hours: parseFloat(form.hours) || 0,
      notes: form.notes || undefined,
    }, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm({ employee_id: "", absence_type: "sick", start_date: "", end_date: "", hours: "0", notes: "" });
      }
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Absence Tracker</h1>
            <p className="text-muted-foreground">Track absences, view the team calendar & monitor Bradford Factor scores</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Record Absence</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record Absence</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Employee</Label>
                  <Select value={form.employee_id} onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {activeEmployees.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.forename} {e.surname} ({e.department})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Absence Type</Label>
                  <Select value={form.absence_type} onValueChange={v => setForm(f => ({ ...f, absence_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ABSENCE_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.emoji} {t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                  <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
                </div>
                <div><Label>Hours Lost</Label><Input type="number" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} /></div>
                <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." /></div>
                <Button onClick={handleSubmit} disabled={addAbsence.isPending} className="w-full">
                  {addAbsence.isPending ? "Saving..." : "Record Absence"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="calendar">
          <TabsList>
            <TabsTrigger value="calendar"><Calendar className="h-4 w-4 mr-1.5" /> Calendar</TabsTrigger>
            <TabsTrigger value="bradford"><TrendingUp className="h-4 w-4 mr-1.5" /> Bradford Factor</TabsTrigger>
            <TabsTrigger value="history"><UserX className="h-4 w-4 mr-1.5" /> History</TabsTrigger>
          </TabsList>

          {/* CALENDAR TAB */}
          <TabsContent value="calendar" className="mt-4">
            <div className="rounded-xl bg-card border border-border shadow-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <Button variant="ghost" size="sm" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>← Prev</Button>
                <h3 className="font-semibold text-card-foreground">{format(currentDate, "MMMM yyyy")}</h3>
                <Button variant="ghost" size="sm" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>Next →</Button>
              </div>
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-border">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                  <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {/* Pad start of month */}
                {Array.from({ length: (getDay(monthStart) + 6) % 7 }).map((_, i) => (
                  <div key={`pad-${i}`} className="min-h-[80px] border-r border-b border-border bg-muted/20" />
                ))}
                {monthDays.map(day => {
                  const dayAbsences = absences.filter(a =>
                    isWithinInterval(day, { start: parseISO(a.start_date), end: parseISO(a.end_date) })
                  );
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div key={day.toISOString()} className={cn("min-h-[80px] border-r border-b border-border p-1", isToday && "bg-primary/5")}>
                      <span className={cn("text-xs font-medium", isToday ? "text-primary font-bold" : "text-muted-foreground")}>{format(day, "d")}</span>
                      <div className="space-y-0.5 mt-0.5">
                        {dayAbsences.slice(0, 3).map(a => {
                          const emp = a.employees;
                          const name = emp ? `${emp.forename} ${emp.surname?.[0]}.` : "?";
                          const typeInfo = ABSENCE_TYPES.find(t => t.value === a.absence_type);
                          return (
                            <div key={a.id} className={cn("text-[10px] rounded px-1 py-0.5 truncate border", typeColors[a.absence_type] || typeColors.other)}>
                              {typeInfo?.emoji} {name}
                            </div>
                          );
                        })}
                        {dayAbsences.length > 3 && <div className="text-[10px] text-muted-foreground px-1">+{dayAbsences.length - 3} more</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* BRADFORD FACTOR TAB */}
          <TabsContent value="bradford" className="mt-4 space-y-4">
            <div className="rounded-xl bg-card border border-border shadow-card p-5">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <h3 className="font-semibold text-card-foreground">Bradford Factor Scores</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Formula: S² × D — S = absence spells (12 months), D = total days absent. Higher scores indicate disruptive short-term absence patterns.</p>
              
              <div className="grid gap-1 text-sm">
                {/* Legend */}
                <div className="grid grid-cols-[1fr_80px_80px_80px_80px] gap-2 pb-2 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <span>Employee</span>
                  <span className="text-center">Spells</span>
                  <span className="text-center">Days</span>
                  <span className="text-center">Score</span>
                  <span className="text-center">Level</span>
                </div>
                {bradfordScores.map(({ employee, score, level, spellCount }, i) => {
                  const yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                  const recentAbs = absences.filter(a => a.employee_id === employee.id && new Date(a.start_date) >= yearAgo);
                  const totalDays = recentAbs.reduce((s, a) => {
                    const d = Math.max(1, Math.ceil((new Date(a.end_date).getTime() - new Date(a.start_date).getTime()) / 86400000) + 1);
                    return s + d;
                  }, 0);

                  if (score === 0 && spellCount === 0) return null;

                  return (
                    <motion.div
                      key={employee.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="grid grid-cols-[1fr_80px_80px_80px_80px] gap-2 py-2 border-b border-border/50 items-center"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px]">{employee.forename[0]}{employee.surname[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-card-foreground text-sm">{employee.forename} {employee.surname}</p>
                          <p className="text-[11px] text-muted-foreground">{employee.department}</p>
                        </div>
                      </div>
                      <span className="text-center text-card-foreground">{spellCount}</span>
                      <span className="text-center text-card-foreground">{totalDays}</span>
                      <span className="text-center font-bold text-card-foreground">{score}</span>
                      <div className="text-center">
                        <Badge variant="outline" className={cn("text-[10px]", level.color)}>{level.label}</Badge>
                      </div>
                    </motion.div>
                  );
                })}
                {bradfordScores.every(s => s.score === 0) && (
                  <p className="text-center text-muted-foreground py-8">No absences recorded in the last 12 months 🎉</p>
                )}
              </div>
            </div>

            {/* Bradford Factor guide */}
            <div className="rounded-xl bg-card border border-border shadow-card p-5">
              <h4 className="font-semibold text-card-foreground mb-3">Bradford Factor Guide</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {[
                  { range: "0–50", level: "Low", color: "text-success", desc: "Normal pattern" },
                  { range: "51–124", level: "Moderate", color: "text-warning", desc: "Informal chat" },
                  { range: "125–399", level: "Concern", color: "text-warning", desc: "Formal review" },
                  { range: "400+", level: "Critical", color: "text-destructive", desc: "Disciplinary" },
                ].map(g => (
                  <div key={g.range} className="rounded-lg border border-border p-3">
                    <p className={cn("font-bold text-lg", g.color)}>{g.range}</p>
                    <p className="font-medium text-card-foreground text-xs">{g.level}</p>
                    <p className="text-[11px] text-muted-foreground">{g.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history" className="mt-4">
            <div className="rounded-xl bg-card border border-border shadow-card overflow-hidden">
              <div className="border-b border-border px-5 py-3">
                <h3 className="font-semibold text-card-foreground">Absence History</h3>
              </div>
              <div className="divide-y divide-border">
                {absences.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No absences recorded yet.</p>
                )}
                {absences.map(a => {
                  const emp = a.employees;
                  const name = emp ? `${emp.forename} ${emp.surname}` : "Unknown";
                  const typeInfo = ABSENCE_TYPES.find(t => t.value === a.absence_type);
                  const days = Math.max(1, Math.ceil((new Date(a.end_date).getTime() - new Date(a.start_date).getTime()) / 86400000) + 1);
                  return (
                    <div key={a.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">{emp?.forename?.[0]}{emp?.surname?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-card-foreground">{name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(a.start_date), "d MMM")} – {format(parseISO(a.end_date), "d MMM yyyy")} · {days}d
                            {a.notes && ` · ${a.notes}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("text-xs", typeColors[a.absence_type])}>
                          {typeInfo?.emoji} {typeInfo?.label}
                        </Badge>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteAbsence.mutate(a.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
