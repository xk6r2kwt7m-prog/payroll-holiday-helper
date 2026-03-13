import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Send, Clock, CheckCircle2, XCircle, Loader2, Sun, Thermometer, BanIcon, AlertTriangle } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useSubmitHolidayRequest, useMyHolidayRequests } from "@/hooks/useHolidayRequests";
import { useNotifyEvent } from "@/hooks/useNotifyEvent";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface HolidayRequestFormProps {
  employeeId: string;
  employeeName: string;
}

const leaveTypes = [
  { id: "holiday", label: "Holiday", icon: Sun, color: "text-accent", bg: "bg-accent/10", activeBorder: "border-accent" },
  { id: "sick", label: "Sick Leave", icon: Thermometer, color: "text-destructive", bg: "bg-destructive/10", activeBorder: "border-destructive" },
  { id: "unpaid", label: "Unpaid", icon: BanIcon, color: "text-muted-foreground", bg: "bg-secondary", activeBorder: "border-foreground" },
  { id: "emergency", label: "Emergency", icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", activeBorder: "border-warning" },
];

export function HolidayRequestForm({ employeeId, employeeName }: HolidayRequestFormProps) {
  const { t } = useI18n();
  const [leaveType, setLeaveType] = useState("holiday");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hours, setHours] = useState("");
  const [reason, setReason] = useState("");

  const submitRequest = useSubmitHolidayRequest();
  const { data: myRequests = [], isLoading } = useMyHolidayRequests(employeeId);
  const { notifyAdmins } = useNotifyEvent();

  const handleSubmit = async () => {
    if (!startDate || !endDate || !hours) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      await submitRequest.mutateAsync({
        employee_id: employeeId,
        start_date: startDate,
        end_date: endDate,
        hours_requested: parseFloat(hours),
        reason: `[${leaveType}] ${reason}`.trim() || `[${leaveType}]`,
      });
      toast.success("Request submitted");
      await notifyAdmins(
        "holiday_submitted",
        t("notifications.holiday_submitted"),
        `${employeeName}: ${startDate} – ${endDate} (${hours}h)`,
        "/holidays",
        { employee_id: employeeId, start_date: startDate, end_date: endDate }
      );
      setStartDate("");
      setEndDate("");
      setHours("");
      setReason("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const pendingCount = myRequests.filter(r => r.status === "pending").length;
  const approvedCount = myRequests.filter(r => r.status === "approved").length;

  return (
    <div className="space-y-5">
      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-card border border-border p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-foreground tabular-nums">{myRequests.length}</p>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mt-0.5">Total</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-warning tabular-nums">{pendingCount}</p>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-warning mt-0.5">Pending</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-success tabular-nums">{approvedCount}</p>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-success mt-0.5">Approved</p>
        </div>
      </div>

      {/* Leave Type Selection */}
      <div>
        <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Type of leave</Label>
        <div className="grid grid-cols-4 gap-2">
          {leaveTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setLeaveType(type.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all min-h-[44px]",
                leaveType === type.id
                  ? `${type.bg} ${type.activeBorder} shadow-sm`
                  : "border-transparent bg-card hover:bg-muted"
              )}
            >
              <type.icon className={cn("h-5 w-5", leaveType === type.id ? type.color : "text-muted-foreground")} />
              <span className={cn("text-[10px] font-medium", leaveType === type.id ? type.color : "text-muted-foreground")}>{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Date Fields */}
      <div className="rounded-xl bg-card border border-border p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 h-11 rounded-lg" />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">End Date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 h-11 rounded-lg" />
          </div>
        </div>
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Hours</Label>
          <Input type="number" step="0.5" min="0" placeholder="e.g. 8" value={hours} onChange={(e) => setHours(e.target.value)} className="mt-1 h-11 rounded-lg" />
        </div>
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Note (optional)</Label>
          <Textarea rows={2} placeholder="Reason for leave..." value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 rounded-lg" />
        </div>
      </div>

      {/* Submit */}
      <Button onClick={handleSubmit} disabled={submitRequest.isPending} className="w-full h-14 text-base font-semibold rounded-xl">
        {submitRequest.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Send className="h-5 w-5 mr-2" />}
        {submitRequest.isPending ? "Submitting..." : "Submit Request"}
      </Button>

      {/* My Requests History */}
      {myRequests.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Request History</h2>
          {myRequests.slice(0, 10).map((req) => (
            <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border shadow-sm">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {format(new Date(req.start_date), "d MMM")} – {format(new Date(req.end_date), "d MMM")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {req.hours_requested}h
                  {req.reason ? ` · ${req.reason.replace(/^\[.*?\]\s*/, "")}` : ""}
                </p>
                {req.review_notes && (
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5 italic">{req.review_notes}</p>
                )}
              </div>
              <StatusBadge status={req.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return <Badge variant="outline" className="text-[10px] text-success border-success/30"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
    case "rejected":
      return <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px] text-warning border-warning/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  }
}
