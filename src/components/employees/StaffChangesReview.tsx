import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Check, Eye, EyeOff, Landmark, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { maskTail } from "@/lib/employee-columns";
import {
  isBankField,
  useDecideStaffDetailChange,
  useRecordRightToWorkDecision,
  useRightToWorkReview,
  useStaffDetailChanges,
  useVerifyBankChange,
  RTW_LABELS,
  type StaffDetailChange,
} from "@/hooks/useStaffDetailChanges";

/**
 * What a member of staff has sent in, side by side with what is already held.
 *
 * Bank details and National Insurance numbers stay hidden behind a tap, and only
 * for administrators. Every accept or reject records who decided and when. A
 * changed bank account is not used for pay until an administrator confirms it
 * directly with the employee.
 */
export function StaffChangesReview({ employeeId }: { employeeId: string }) {
  const { isAdmin } = useAuth();
  const { data: changes = [] } = useStaffDetailChanges(employeeId);
  const { data: rtw } = useRightToWorkReview(employeeId);
  const decide = useDecideStaffDetailChange();
  const verifyBank = useVerifyBankChange();
  const recordRtw = useRecordRightToWorkDecision();

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [rtwName, setRtwName] = useState("");
  const [rtwNotes, setRtwNotes] = useState("");

  const pending = changes.filter((c) => c.state === "pending" && c.needs_review);
  const bankPending = pending.filter((c) => isBankField(c.field_name));
  const otherPending = pending.filter((c) => !isBankField(c.field_name));
  const decided = changes.filter((c) => c.state !== "pending").slice(0, 6);

  const show = (c: StaffDetailChange, value: string | null) => {
    if (!value) return "Not given";
    if (!c.sensitive) return value;
    if (!isAdmin) return maskTail(value);
    return revealed[c.id] ? value : maskTail(value);
  };

  const rtwState = rtw?.rtw_status ?? "not_submitted";
  const rtwUnverified = ["submitted", "pending_review", "requested"].includes(rtwState);

  const row = (c: StaffDetailChange) => (
    <div key={c.id} className="rounded-md bg-background border border-border p-3 space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium text-foreground">{c.field_label}</p>
        {c.sensitive && (
          <Badge variant="outline" className="text-[10px]">Protected</Badge>
        )}
        {c.sensitive && isAdmin && (
          <button
            type="button"
            className="ml-auto text-muted-foreground"
            aria-label={revealed[c.id] ? "Hide" : "Show"}
            onClick={() => setRevealed((r) => ({ ...r, [c.id]: !r[c.id] }))}
          >
            {revealed[c.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Already held</p>
          <p className="font-mono break-all">{show(c, c.old_value) || "Blank"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">They sent</p>
          <p className="font-mono break-all">{show(c, c.new_value)}</p>
        </div>
      </div>
      {c.notes && <p className="text-[11px] text-muted-foreground">{c.notes}</p>}
      {!isBankField(c.field_name) && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 gap-1"
            disabled={decide.isPending || !name.trim()}
            onClick={() => decide.mutate({ change: c, accept: true, notes, deciderName: name })}
          >
            <Check className="h-3.5 w-3.5" /> Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1"
            disabled={decide.isPending || !name.trim()}
            onClick={() => decide.mutate({ change: c, accept: false, notes, deciderName: name })}
          >
            <X className="h-3.5 w-3.5" /> Reject
          </Button>
        </div>
      )}
    </div>
  );

  if (pending.length === 0 && decided.length === 0 && rtwState === "not_submitted") return null;

  return (
    <div className="space-y-3">
      {pending.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Information to review
            <Badge variant="outline" className="ml-auto text-[10px]">{pending.length}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Nothing here has changed the record yet. Type your name so the decision is recorded
            against you.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="decider-name" className="text-xs">Your name</Label>
              <Input
                id="decider-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Who is checking this"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="decider-notes" className="text-xs">Note (optional)</Label>
              <Input
                id="decider-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything worth recording"
                className="h-9"
              />
            </div>
          </div>

          {otherPending.map(row)}

          {bankPending.length > 0 && (
            <div className="rounded-md border border-border bg-background p-3 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Landmark className="h-4 w-4 text-primary" />
                Bank details
              </div>
              <p className="text-xs text-muted-foreground">
                Pay still uses the account already on file. Speak to the employee yourself —
                by phone or in person, not by replying to an email — and confirm the account
                before it is used.
              </p>
              {bankPending.map(row)}
              {isAdmin ? (
                <Button
                  size="sm"
                  className="w-full gap-1"
                  disabled={verifyBank.isPending || !name.trim()}
                  onClick={() =>
                    verifyBank.mutate({ changes: bankPending, verifierName: name, notes })
                  }
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  I confirmed these directly with the employee — use them for pay
                </Button>
              ) : (
                <p className="text-xs text-warning">
                  Only an administrator can confirm a change of bank account.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {rtwState !== "not_submitted" && (
        <div className="rounded-lg border border-border bg-card p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Right to work
            <Badge
              variant="outline"
              className={`ml-auto text-[10px] ${rtwState === "verified" ? "text-success" : rtwState === "rejected" || rtwState === "expired" ? "text-destructive" : "text-warning"}`}
            >
              {RTW_LABELS[rtwState] ?? rtwState}
            </Badge>
          </div>
          {rtwUnverified && (
            <p className="text-xs text-warning">
              This has not been checked yet. Nothing has been cancelled — but the evidence still
              needs looking at.
            </p>
          )}
          {rtw?.rtw_reviewed_by_name && rtw?.rtw_reviewed_at && (
            <p className="text-xs text-muted-foreground">
              Checked by {rtw.rtw_reviewed_by_name} on{" "}
              {new Date(rtw.rtw_reviewed_at).toLocaleDateString("en-GB")}
              {rtw.rtw_expires_on ? ` · runs out ${new Date(rtw.rtw_expires_on).toLocaleDateString("en-GB")}` : ""}
            </p>
          )}
          {isAdmin && (
            <div className="space-y-2">
              <Input
                value={rtwName}
                onChange={(e) => setRtwName(e.target.value)}
                placeholder="Your name"
                className="h-9"
                aria-label="Name of the person checking the right-to-work evidence"
              />
              <Textarea
                value={rtwNotes}
                onChange={(e) => setRtwNotes(e.target.value)}
                placeholder="What you checked (optional)"
                className="min-h-16 text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={recordRtw.isPending || !rtwName.trim()}
                  onClick={() =>
                    recordRtw.mutate({
                      employeeId,
                      decision: "verified",
                      checkedByName: rtwName,
                      notes: rtwNotes,
                    })
                  }
                >
                  Verified
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  disabled={recordRtw.isPending || !rtwName.trim()}
                  onClick={() =>
                    recordRtw.mutate({
                      employeeId,
                      decision: "rejected",
                      checkedByName: rtwName,
                      notes: rtwNotes,
                    })
                  }
                >
                  Not acceptable
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {decided.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recently decided
          </p>
          {decided.map((c) => (
            <p key={c.id} className="text-xs text-muted-foreground">
              {c.field_label} — {c.state === "accepted" ? "accepted" : "rejected"}
              {c.decided_by_name ? ` by ${c.decided_by_name}` : ""}
              {c.decided_at ? ` on ${new Date(c.decided_at).toLocaleDateString("en-GB")}` : ""}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
