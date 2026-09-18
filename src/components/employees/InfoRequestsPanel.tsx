import { useMemo, useState } from "react";
import { Mail, BellRing, Ban, Loader2, CheckCircle2, Clock, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  useInfoRequests,
  useRemindInfoRequest,
  useRevokeInfoRequest,
  useExpiringDocuments,
  infoRequestState,
  infoRequestPersonName,
  infoRequestItems,
  INFO_REQUEST_STATE_LABELS,
  type InfoRequestState,
} from "@/hooks/useInfoRequests";
import { infoItemLabel } from "@/lib/info-request-items";

const TONE: Record<InfoRequestState, string> = {
  completed: "bg-success/10 text-success border-success/30",
  opened: "bg-primary/10 text-primary border-primary/30",
  waiting: "bg-muted text-muted-foreground border-border",
  expired: "bg-warning/10 text-warning border-warning/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

/**
 * Information requests sent to staff already on the team: what was asked for,
 * what happened to each link, and the manual actions — remind (same link) or
 * cancel. Nothing sends itself.
 */
export function InfoRequestsPanel({ showCompleted = false }: { showCompleted?: boolean }) {
  const { data: requests = [], isLoading } = useInfoRequests(undefined, "existing_staff_update");
  const { data: expiring = [] } = useExpiringDocuments(90);
  const remind = useRemindInfoRequest();
  const cancel = useRevokeInfoRequest();
  const [busy, setBusy] = useState<string | null>(null);

  const rows = useMemo(() => {
    const list = requests.map((r) => ({ r, state: infoRequestState(r) }));
    return showCompleted ? list : list.filter((x) => x.state !== "completed" && x.state !== "cancelled");
  }, [requests, showCompleted]);

  if (isLoading) return null;
  if (rows.length === 0 && expiring.length === 0) return null;

  return (
    <div className="space-y-3">
      {rows.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold text-card-foreground">Information requests</p>
            <Badge variant="outline" className="text-[10px] ml-auto">{rows.length}</Badge>
          </div>
          <div className="divide-y divide-border">
            {rows.map(({ r, state }) => {
              const items = infoRequestItems(r);
              const working = busy === r.id;
              return (
                <div key={r.id} className="px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-card-foreground truncate">
                      {infoRequestPersonName(r)}
                    </span>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${TONE[state]}`}>
                      {INFO_REQUEST_STATE_LABELS[state]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {items.map(infoItemLabel).join(", ") || "Nothing recorded"}
                  </p>
                  <p className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-2">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Sent {format(new Date(r.sent_at), "d MMM")}
                    </span>
                    <span>Expires {format(new Date(r.token_expires_at), "d MMM")}</span>
                    {r.reminder_count > 0 && (
                      <span>
                        Reminded {r.reminder_count}×
                        {r.last_reminder_at ? ` (last ${format(new Date(r.last_reminder_at), "d MMM")})` : ""}
                      </span>
                    )}
                    {r.rtw_uploaded_count > 0 && (
                      <span className="flex items-center gap-1 text-success">
                        <CheckCircle2 className="h-3 w-3" /> {r.rtw_uploaded_count} document
                        {r.rtw_uploaded_count > 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                  {(state === "waiting" || state === "opened") && (
                    <div className="flex gap-1.5 pt-0.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={working}
                        onClick={async () => {
                          setBusy(r.id);
                          try { await remind.mutateAsync(r); } finally { setBusy(null); }
                        }}
                      >
                        {working ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <BellRing className="h-3 w-3 mr-1" />}
                        Send reminder
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground"
                        disabled={working}
                        onClick={async () => {
                          setBusy(r.id);
                          try { await cancel.mutateAsync(r.id); } finally { setBusy(null); }
                        }}
                      >
                        <Ban className="h-3 w-3 mr-1" /> Cancel link
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {expiring.length > 0 && <ExpiringDocumentsPanel />}
    </div>
  );
}

/**
 * Documents with an expiry date in the next 90 days, or already overdue.
 * Read-only — nobody is marked as checked by the system.
 */
export function ExpiringDocumentsPanel() {
  const { data: expiring = [] } = useExpiringDocuments(90);
  if (expiring.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <CalendarClock className="h-3.5 w-3.5 text-warning" />
        <p className="text-xs font-semibold text-card-foreground">Expiring soon</p>
        <Badge variant="outline" className="text-[10px] ml-auto">{expiring.length}</Badge>
      </div>
      <div className="divide-y divide-border">
        {expiring.map((d) => (
          <div key={d.id} className="px-3 py-2 flex items-center gap-2">
            <span className="flex-1 min-w-0">
              <span className="block text-sm text-card-foreground truncate">{d.employee_name}</span>
              <span className="block text-xs text-muted-foreground truncate">
                {d.document_name || d.document_type.replace(/_/g, " ")}
              </span>
            </span>
            <Badge
              variant="outline"
              className={
                d.days_left < 0
                  ? "text-[10px] bg-destructive/10 text-destructive border-destructive/30"
                  : d.days_left <= 30
                    ? "text-[10px] bg-warning/10 text-warning border-warning/30"
                    : "text-[10px]"
              }
            >
              {d.days_left < 0
                ? `Expired ${Math.abs(d.days_left)}d ago`
                : `${d.days_left}d left`}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
