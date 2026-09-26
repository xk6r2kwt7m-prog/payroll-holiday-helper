import { useState } from "react";
import { Check, ClipboardCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useDecideStaffDetailChange,
  useStaffDetailChanges,
  type StaffDetailChange,
} from "@/hooks/useStaffDetailChanges";

/** Fields a manager may decide. Must match the server list in the manager-review database change. */
export const MANAGER_REVIEW_FIELDS = ["forename", "surname", "preferred_name", "email", "nationality"] as const;

export function isManagerReviewable(c: Pick<StaffDetailChange, "field_name" | "sensitive" | "state" | "needs_review">) {
  return c.state === "pending" && c.needs_review && !c.sensitive
    && (MANAGER_REVIEW_FIELDS as readonly string[]).includes(c.field_name);
}

/**
 * Manager view of submitted staff details: ordinary details only.
 *
 * Protected submissions (bank, NI, passport, share code, residence permit) are never sent to a
 * manager's browser — the database only returns them to administrators. Date of birth and
 * settlement status are hidden here too, because they affect pay and right to work. The server
 * refuses a manager decision on anything outside this list, so hiding them here is not the safeguard.
 */
export function ManagerStaffChangesReview({ employeeId }: { employeeId: string }) {
  const { data: changes = [], isError, refetch } = useStaffDetailChanges(employeeId);
  const decide = useDecideStaffDetailChange();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  if (isError) {
    return (
      <div role="alert" className="space-y-2 text-sm">
        <p>Could not load submitted details.</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>Retry</Button>
      </div>
    );
  }

  const pending = changes.filter(isManagerReviewable);
  if (pending.length === 0) return null;

  return (
    <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <ClipboardCheck className="h-4 w-4 text-warning" />
        Details to review
      </div>
      <p className="text-xs text-muted-foreground">
        Nothing here has changed the record yet. Bank, National Insurance, passport, date of birth and
        right-to-work details are checked by an administrator and are not shown here.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="manager-decider-name" className="text-xs">Your name</Label>
          <Input id="manager-decider-name" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Who is checking this" className="h-9" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="manager-decider-notes" className="text-xs">Note (optional)</Label>
          <Input id="manager-decider-notes" value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything worth recording" className="h-9" />
        </div>
      </div>
      {pending.map((c) => (
        <div key={c.id} className="rounded-md bg-background border border-border p-3 space-y-2">
          <p className="text-xs font-medium text-foreground">{c.field_label}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Already held</p>
              <p className="break-all">{c.old_value || "Blank"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">They sent</p>
              <p className="break-all">{c.new_value || "Not given"}</p>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="flex-1 gap-1" disabled={decide.isPending || !name.trim()}
              onClick={() => decide.mutate({ change: c, accept: true, notes, deciderName: name })}>
              <Check className="h-3.5 w-3.5" /> Accept
            </Button>
            <Button size="sm" variant="outline" className="flex-1 gap-1" disabled={decide.isPending || !name.trim()}
              onClick={() => decide.mutate({ change: c, accept: false, notes, deciderName: name })}>
              <X className="h-3.5 w-3.5" /> Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
