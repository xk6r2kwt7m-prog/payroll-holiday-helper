import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Send, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
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

export function HolidayRequestForm({ employeeId, employeeName }: HolidayRequestFormProps) {
  const { t } = useI18n();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hours, setHours] = useState("");
  const [reason, setReason] = useState("");

  const submitRequest = useSubmitHolidayRequest();
  const { data: myRequests = [], isLoading } = useMyHolidayRequests(employeeId);
  const { notifyAdmins } = useNotifyEvent();

  const handleSubmit = async () => {
    if (!startDate || !endDate || !hours) {
      toast.error(t("common.required"));
      return;
    }
    try {
      await submitRequest.mutateAsync({
        employee_id: employeeId,
        start_date: startDate,
        end_date: endDate,
        hours_requested: parseFloat(hours),
        reason: reason || undefined,
      });
      toast.success(t("holidays.request_holiday") + " ✓");

      // Notify admins
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

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="outline" className="text-success border-success/30 bg-success/10 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />{t("holidays.approve")}</Badge>;
      case "rejected":
        return <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 text-xs"><XCircle className="h-3 w-3 mr-1" />{t("holidays.reject")}</Badge>;
      default:
        return <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10 text-xs"><Clock className="h-3 w-3 mr-1" />{t("common.pending")}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Request Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t("holidays.request_holiday")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{t("payroll.start_date")}</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">{t("payroll.end_date")}</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">{t("common.hours")}</Label>
            <Input type="number" step="0.5" min="0" placeholder="8" value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">{t("common.notes")}</Label>
            <Textarea rows={2} placeholder={t("common.optional")} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <Button onClick={handleSubmit} disabled={submitRequest.isPending} className="w-full">
            {submitRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            {t("common.submitting") === "Submitting..." && !submitRequest.isPending ? t("holidays.request_holiday") : submitRequest.isPending ? t("common.submitting") : t("holidays.request_holiday")}
          </Button>
        </CardContent>
      </Card>

      {/* My Requests */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t("common.history")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-2">{t("common.loading")}</p>
          ) : myRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">{t("common.no_data")}</p>
          ) : (
            <div className="space-y-2">
              {myRequests.slice(0, 10).map((req) => (
                <div key={req.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(req.start_date), "d MMM")} – {format(new Date(req.end_date), "d MMM yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground">{req.hours_requested}h{req.reason ? ` · ${req.reason}` : ""}</p>
                    {req.review_notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">{req.review_notes}</p>
                    )}
                  </div>
                  {statusBadge(req.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
