/**
 * Emailing the allergen course link to chosen staff.
 *
 * Manual only: the administrator picks the people and presses send. Nothing is
 * scheduled, nobody is chased automatically, and the email carries only a first
 * name and the course link.
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Send, CheckCircle2, CircleAlert } from "lucide-react";
import { toast } from "sonner";
import { UD_SITES } from "@/data/allergen/ud-july-2026-menus";
import {
  useCourseRecipients,
  useSendAllergenCourseEmail,
  allergenCourseUrl,
  type CourseEmailOutcome,
} from "@/hooks/useAllergenCourseEmail";
import { usePublishedAllergenVersion } from "@/hooks/useAllergenStaffAccess";

export function AllergenCourseEmailCard() {
  const { data: recipients = [], isLoading } = useCourseRecipients();
  const { data: published } = usePublishedAllergenVersion();
  const send = useSendAllergenCourseEmail();

  const [chosen, setChosen] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [outcomes, setOutcomes] = useState<CourseEmailOutcome[]>([]);

  const isPublished = !!published?.published_at;
  const chosenPeople = useMemo(
    () => recipients.filter((r) => chosen.includes(r.employee_id)),
    [recipients, chosen],
  );
  const missingEmail = chosenPeople.filter((p) => !p.email);

  const toggle = (id: string) =>
    setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const selectAllWithEmail = () =>
    setChosen(recipients.filter((r) => r.email).map((r) => r.employee_id));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4" /> Email the course to staff
        </CardTitle>
        <CardDescription className="text-xs">
          Choose who should take the course and press send. Each person gets one email with the course
          link and nothing else. No reminders are sent and nobody is contacted unless you press send.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isPublished && (
          <Alert>
            <AlertDescription className="text-xs">
              The course is not published yet, so the link would turn staff away. Publish it first, then
              send.
            </AlertDescription>
          </Alert>
        )}

        <p className="text-[11px] text-muted-foreground break-all">
          The email links to <code>{allergenCourseUrl()}</code>
        </p>

        <div className="grid gap-1.5 sm:max-w-[220px]">
          <Label className="text-xs">Complete by (optional)</Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-9"
          />
        </div>

        {isLoading && <p className="text-xs text-muted-foreground">Loading the staff list…</p>}

        <div className="space-y-3">
          {UD_SITES.map((site) => {
            const forSite = recipients.filter((r) => r.site === site);
            return (
              <div key={site} className="space-y-1">
                <p className="text-xs font-semibold">{site}</p>
                {forSite.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nobody at this site is recorded as front of house or kitchen.
                  </p>
                )}
                {forSite.map((r) => (
                  <label
                    key={r.employee_id}
                    className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-xs"
                  >
                    <Checkbox
                      checked={chosen.includes(r.employee_id)}
                      onCheckedChange={() => toggle(r.employee_id)}
                      disabled={!r.email}
                    />
                    <span className="flex-1 min-w-[120px]">{r.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {r.audience === "foh" ? "Front of house" : "Kitchen"}
                    </Badge>
                    {r.notification_state === "sent" ? (
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Link sent
                      </Badge>
                    ) : r.assignment_id ? (
                      <Badge variant="outline" className="text-[10px]">
                        Assigned — not emailed
                      </Badge>
                    ) : null}
                    {!r.email && (
                      <span className="text-[10px] text-amber-700">No email address on file</span>
                    )}
                  </label>
                ))}
              </div>
            );
          })}
        </div>

        {missingEmail.length > 0 && (
          <Alert>
            <AlertDescription className="text-xs">
              {missingEmail.map((p) => p.name).join(", ")} — no email address on file. Add one on their
              record first.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={selectAllWithEmail}>
            Select everyone
          </Button>
          <Button size="sm" variant="outline" onClick={() => setChosen([])} disabled={!chosen.length}>
            Clear
          </Button>
          <Button
            size="sm"
            className="gap-1"
            disabled={!isPublished || !chosenPeople.length || send.isPending}
            onClick={() =>
              send.mutate(
                {
                  recipients: chosenPeople,
                  courseVersion: published?.version ?? null,
                  dueDate: dueDate || null,
                },
                {
                  onSuccess: (res) => {
                    setOutcomes(res);
                    const ok = res.filter((r) => r.success).length;
                    const bad = res.length - ok;
                    if (ok) toast.success(`Course link emailed to ${ok} ${ok === 1 ? "person" : "people"}.`);
                    if (bad) toast.error(`${bad} could not be sent — see the list below.`);
                  },
                  onError: (e: any) => toast.error(e.message ?? "Could not send the course link"),
                },
              )
            }
          >
            <Send className="h-3.5 w-3.5" />
            {send.isPending
              ? "Sending…"
              : `Send the course link to ${chosenPeople.length || 0} ${chosenPeople.length === 1 ? "person" : "people"}`}
          </Button>
        </div>

        {outcomes.length > 0 && (
          <div className="space-y-1 rounded-md border p-2 text-xs">
            <p className="font-medium">Last send</p>
            {outcomes.map((o) => (
              <p key={o.employee_id} className="flex items-start gap-1.5 text-muted-foreground">
                {o.success ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                ) : (
                  <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                )}
                <span>
                  {o.name} — {o.success ? "accepted for delivery" : o.error}
                </span>
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
