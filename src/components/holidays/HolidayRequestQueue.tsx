import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Clock, Calendar, Loader2 } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useAllHolidayRequests, useReviewHolidayRequest } from "@/hooks/useHolidayRequests";
import { useNotifyEvent } from "@/hooks/useNotifyEvent";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function HolidayRequestQueue() {
  const { t } = useI18n();
  const { data: requests = [], isLoading } = useAllHolidayRequests();
  const reviewMutation = useReviewHolidayRequest();
  const { notify } = useNotifyEvent();
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const pendingRequests = requests.filter((r: any) => r.status === "pending");
  const reviewedRequests = requests.filter((r: any) => r.status !== "pending");

  const handleReview = async (request: any, status: "approved" | "rejected") => {
    try {
      await reviewMutation.mutateAsync({
        id: request.id,
        status,
        review_notes: reviewNotes[request.id] || undefined,
      });
      toast.success(status === "approved" ? t("holidays.approve") + " ✓" : t("holidays.reject") + " ✓");

      // Notify the employee who submitted the request
      const emp = request.employees;
      if (emp?.user_id) {
        const eventType = status === "approved" ? "holiday_approved" : "holiday_rejected";
        const title = status === "approved" ? t("notifications.holiday_approved") : t("notifications.holiday_rejected");
        await notify({
          userId: emp.user_id,
          eventType,
          title,
          body: `${request.start_date} – ${request.end_date} (${request.hours_requested}h)`,
          link: "/staff",
          metadata: { request_id: request.id },
        });
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) {
    return <p className="text-muted-foreground text-sm py-4">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-4">
      {/* Pending Queue */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-warning" />
            {t("common.pending")} ({pendingRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="flex items-center gap-3 py-4 px-2">
              <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">All caught up</p>
                <p className="text-xs text-muted-foreground">No leave requests waiting for approval right now.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req: any) => (
                <div key={req.id} className="p-3 rounded-lg border border-warning/20 bg-warning/5 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {req.employees?.forename} {req.employees?.surname}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(req.start_date), "d MMM")} – {format(new Date(req.end_date), "d MMM yyyy")} · {req.hours_requested}h
                      </p>
                      {req.reason && <p className="text-xs text-muted-foreground mt-0.5">{req.reason}</p>}
                    </div>
                    <Badge variant="outline" className="text-warning border-warning/30 text-xs">{t("common.pending")}</Badge>
                  </div>
                  <Textarea
                    rows={1}
                    placeholder={t("common.notes")}
                    value={reviewNotes[req.id] || ""}
                    onChange={(e) => setReviewNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                    className="text-xs"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleReview(req, "approved")}
                      disabled={reviewMutation.isPending}
                    >
                      {reviewMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {t("holidays.approve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleReview(req, "rejected")}
                      disabled={reviewMutation.isPending}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      {t("holidays.reject")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Reviewed */}
      {reviewedRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("common.history")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reviewedRequests.slice(0, 20).map((req: any) => (
                <div key={req.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">
                      {req.employees?.forename} {req.employees?.surname}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(req.start_date), "d MMM")} – {format(new Date(req.end_date), "d MMM")} · {req.hours_requested}h
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("text-xs", req.status === "approved" ? "text-success border-success/30" : "text-destructive border-destructive/30")}
                  >
                    {req.status === "approved" ? t("holidays.approve") : t("holidays.reject")}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
