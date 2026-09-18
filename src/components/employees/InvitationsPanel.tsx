import { useMemo, useState } from "react";
import { Mail, RotateCw, Clock, Loader2, BellRing, Ban, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  useInvitations,
  useResendInvitation,
  useSendInvitationReminder,
  useCancelInvitation,
  invitationState,
  invitationPersonName,
  INVITATION_STATE_LABELS,
  type InvitationRow,
  type InvitationState,
} from "@/hooks/useInvitations";

const TONE: Record<InvitationState, string> = {
  joined: "bg-success/10 text-success border-success/30",
  opened: "bg-primary/10 text-primary border-primary/30",
  waiting: "bg-muted text-muted-foreground border-border",
  expired: "bg-warning/10 text-warning border-warning/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

/**
 * Who has been asked to join, what happened to each link, and the manual
 * actions available: remind (same link), send a new link, or cancel.
 */
export function InvitationsPanel({ showJoined = false }: { showJoined?: boolean }) {
  const { data: invitations = [], isLoading } = useInvitations();
  const resend = useResendInvitation();
  const remind = useSendInvitationReminder();
  const cancel = useCancelInvitation();
  const [busy, setBusy] = useState<string | null>(null);

  const rows = useMemo(() => {
    const list = invitations.map((inv) => ({ inv, state: invitationState(inv) }));
    return showJoined ? list : list.filter((r) => r.state !== "joined" && r.state !== "cancelled");
  }, [invitations, showJoined]);

  if (isLoading || rows.length === 0) return null;

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-lg border border-border/70 bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 bg-muted/30">
        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">Invitations sent</span>
        <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5">{rows.length}</Badge>
      </div>

      <div className="divide-y divide-border/40">
        {rows.map(({ inv, state }: { inv: InvitationRow; state: InvitationState }) => {
          const noRecord = !inv.employee_id;
          const canRemind = state === "waiting" || state === "opened";
          return (
            <div key={inv.id} className="px-3 py-2.5 space-y-1.5">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {invitationPersonName(inv)}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{inv.email}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] h-5 px-1.5 shrink-0 ${TONE[state]}`}>
                  {state === "joined" && <CheckCircle2 className="h-2.5 w-2.5 mr-1" />}
                  {INVITATION_STATE_LABELS[state]}
                </Badge>
              </div>

              <p className="text-[10px] text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  Sent {format(new Date(inv.created_at), "d MMM yyyy, HH:mm")}
                </span>
                {inv.expires_at && <span>Link valid until {format(new Date(inv.expires_at), "d MMM")}</span>}
                {inv.last_reminder_at && (
                  <span>Reminded {format(new Date(inv.last_reminder_at), "d MMM")} ({inv.reminder_count ?? 1})</span>
                )}
              </p>

              {noRecord && (
                <p className="text-[10px] text-warning flex items-start gap-1">
                  <AlertTriangle className="h-3 w-3 mt-px shrink-0" />
                  No staff record is attached to this invitation. Send a new link from the person's own
                  staff record so their name is certain.
                </p>
              )}

              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {canRemind && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-xs gap-1.5 hover:bg-primary/10 hover:text-primary"
                    disabled={busy === inv.id}
                    onClick={() => run(inv.id, () => remind.mutateAsync({ invitationId: inv.id }))}
                  >
                    {busy === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <BellRing className="h-3 w-3" />}
                    Send reminder
                  </Button>
                )}
                {state !== "joined" && state !== "cancelled" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-xs gap-1.5"
                    disabled={busy === inv.id}
                    onClick={() =>
                      run(inv.id, () =>
                        resend.mutateAsync({
                          email: inv.email,
                          invitationId: inv.id,
                          name: inv.employees ? invitationPersonName(inv) : undefined,
                        }),
                      )
                    }
                  >
                    <RotateCw className="h-3 w-3" />
                    Send new link
                  </Button>
                )}
                {(state === "waiting" || state === "opened" || state === "expired") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-xs gap-1.5 text-destructive hover:bg-destructive/10"
                    disabled={busy === inv.id}
                    onClick={() => run(inv.id, () => cancel.mutateAsync(inv.id))}
                  >
                    <Ban className="h-3 w-3" />
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
