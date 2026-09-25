import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Send, MailCheck, Clock, CheckCircle2, ChevronLeft, AlertTriangle } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import {
  useInfoRequests,
  useSendInfoRequest,
  useRevokeInfoRequest,
} from "@/hooks/useInfoRequests";
import {
  INFO_ITEMS,
  INFO_PRESETS,
  type InfoItemKey,
  type InfoRequestKind,
} from "@/lib/info-request-items";
import { useInfoCoverage } from "@/hooks/useInfoCoverage";
import { allMissingItems, missingItems, REASKABLE_ITEMS } from "@/lib/info-request-coverage";


/** Legacy export kept so older imports keep compiling. */
export type InfoSection = "personal" | "emergency" | "bank" | "rtw";

interface Props {
  employeeId: string;
  employeeName: string;
  employeeEmail?: string | null;
  /**
   * "existing_staff_update" asks someone already on the team for a few things;
   * "onboarding" is the full new-starter set. The two are never blended.
   */
  kind?: InfoRequestKind;
  trigger: React.ReactNode;
}

const GROUP_ORDER = ["Identity", "Contact", "Right to work", "Pay", "Emergency"] as const;

export function RequestStaffDetailsDialog({
  employeeId,
  employeeName,
  employeeEmail,
  kind = "existing_staff_update",
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [email, setEmail] = useState(employeeEmail ?? "");
  const [expiryDays, setExpiryDays] = useState("7");
  const [preset, setPreset] = useState<string | null>(null);
  const [selected, setSelected] = useState<InfoItemKey[]>([]);
  const [touched, setTouched] = useState(false);
  const { data: history = [] } = useInfoRequests(employeeId);
  const { data: coverage, isLoading: coverageLoading } = useInfoCoverage(employeeId, open);
  const send = useSendInfoRequest();
  const revoke = useRevokeInfoRequest();

  /** What is genuinely missing (right-to-work items can always be asked again). */
  const missingKeys = useMemo(() => {
    if (!coverage) return [] as InfoItemKey[];
    const missing = allMissingItems(coverage);
    return kind === "onboarding"
      ? Array.from(new Set([...missing, ...REASKABLE_ITEMS.filter(k => !coverage.pendingItems?.includes(k))]))
      : missing;
  }, [coverage, kind]);

  const heldKeys = useMemo(
    () => (coverage ? INFO_ITEMS.map((i) => i.key).filter((k) => coverage[k]) : []),
    [coverage],
  );

  /** Start from what is missing — the admin can still tick anything else. */
  useEffect(() => {
    if (!open || touched || !coverage) return;
    setSelected(missingKeys);
  }, [open, touched, coverage, missingKeys]);

  useEffect(() => {
    if (!open) {
      setTouched(false);
      setPreset(null);
    }
  }, [open]);

  const toggle = (key: InfoItemKey) =>
    setSelected((s) => {
      setTouched(true);
      setPreset(null);
      return s.includes(key) ? s.filter((k) => k !== key) : [...s, key];
    });

  /** Presets narrow themselves to the items we don't already hold. */
  const applyPreset = (key: string, items: InfoItemKey[]) => {
    setTouched(true);
    setPreset(key);
    const trimmed = coverage
      ? Array.from(new Set([...missingItems(items, coverage), ...items.filter((i) => REASKABLE_ITEMS.includes(i) && !coverage.pendingItems?.includes(i))]))
      : [...items];
    setSelected(trimmed);
  };


  const grouped = useMemo(
    () => GROUP_ORDER.map((g) => ({ group: g, items: INFO_ITEMS.filter((i) => i.group === g) })),
    [],
  );

  const submit = (prepareOnly = false) => {
    send.mutate(
      {
        employeeIds: [employeeId],
        sections: selected,
        requestKind: kind,
        preset,
        recipientOverride: email.trim() || null,
        expiryDays: Number(expiryDays) || 7,
        prepareOnly,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setConfirming(false);
        },
      },
    );
  };

  const latest = history[0];
  const canContinue = selected.length > 0 && !!email.trim();

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setConfirming(false);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        {coverage?.pendingItems?.length ? <p className="text-sm text-muted-foreground">Awaiting review or follow-up: {INFO_ITEMS.filter(i => coverage.pendingItems?.includes(i.key)).map(i => i.label).join(", ")}. These are excluded from automatic requests.</p> : null}
        <DialogHeader>
          <DialogTitle>
            {confirming ? "Check before sending" : `Ask ${employeeName.split(" ")[0]} for information`}
          </DialogTitle>
        </DialogHeader>

        {confirming ? (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="rounded-lg border border-border p-3 space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Person: </span>
                <span id="confirm-request-name" className="font-medium text-card-foreground">{employeeName}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Email: </span>
                <span id="confirm-request-email" className="font-medium text-card-foreground">{email.trim()}</span>
              </p>
            </div>

            <div className="space-y-1">
              <Label>What they will be asked for</Label>
              <ul id="confirm-request-items" className="text-sm text-card-foreground space-y-1">
                {selected.map((key) => (
                  <li key={key}>• {INFO_ITEMS.find((i) => i.key === key)?.label ?? key}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-1">
              <Label>Link expiry</Label>
              <p id="confirm-request-expiry" className="text-sm text-card-foreground">
                {(() => {
                  const days = Number(expiryDays) || 7;
                  const when = new Date(Date.now() + days * 86400000);
                  return `${days} day${days > 1 ? "s" : ""} — until ${when.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;
                })()}
              </p>
            </div>

            <div className="space-y-1">
              <Label>The email they will get</Label>
              <div
                id="confirm-request-email-preview"
                className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-card-foreground space-y-2"
              >
                <p className="font-medium">
                  Subject:{" "}
                  {kind === "onboarding"
                    ? "Please complete your details"
                    : "We need a couple of details from you"}
                </p>
                <p className="font-semibold">Please complete your details</p>
                <p>Hi {employeeName.split(" ")[0]},</p>
                <p>
                  We need a few details from you before your first shift. It takes about 5 minutes
                  on your phone and you do not need an account.
                </p>
                <p>
                  <span className="font-medium">You will be asked for:</span>{" "}
                  {selected.map((k) => INFO_ITEMS.find((i) => i.key === k)?.label ?? k).join(", ")}
                </p>
                <p className="font-medium text-primary">[ Complete my details ]</p>
                <p>
                  If you are asked for your right to work document, you can take a photo of it with
                  your phone camera.
                </p>
                <p className="text-xs text-muted-foreground">
                  This link is personal to you and expires on the date above. Please do not forward it.
                </p>
                <p>Thank you, Ugly Dumpling Team</p>
                <p className="text-xs text-muted-foreground">
                  The button is their own secure link. The email contains nothing else about them —
                  no address, bank details or National Insurance number.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              They get a secure link that closes as soon as they finish. Nothing here changes their pay
              or hours, and anything sensitive that differs from what you already hold is shown to you to
              confirm rather than changed. Bank details never take effect until you confirm them with
              the person directly.
            </p>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setConfirming(false)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button className="flex-1" onClick={() => submit(false)} disabled={send.isPending}>
                <Send className="h-4 w-4 mr-2" />
                {send.isPending ? "Sending..." : "Send request"}
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => submit(true)}
              disabled={send.isPending}
            >
              Prepare it, but do not send yet
            </Button>
            <p className="text-xs text-muted-foreground">
              A prepared request is saved as "Not sent". The link does not work until you send it.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1">
              <Label htmlFor="request-email">Send to</Label>
              <Input
                id="request-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
              {!employeeEmail && (
                <p className="text-xs text-warning flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> No email on their record yet
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Quick choices</Label>
              <div className="flex flex-wrap gap-2">
                {INFO_PRESETS.map((p) => (
                  <Button
                    key={p.key}
                    type="button"
                    size="sm"
                    variant={preset === p.key ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => applyPreset(p.key, p.items)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Each one is just a set of ticks — change anything below.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label>What to ask for</Label>
                <p id="coverage-summary" className="text-xs text-muted-foreground">
                  {coverageLoading
                    ? "Checking what we already hold..."
                    : missingKeys.length === 0
                      ? "Nothing further needs requesting on this list. Submitted details may still be awaiting review."
                      : `Ticked below: the ${missingKeys.length} item${missingKeys.length > 1 ? "s" : ""} we don't hold yet. Items marked "already on file" aren't asked for again unless you tick them.`}
                </p>
              </div>
              {grouped.map(({ group, items }) => (
                <div key={group} className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
                  {items.map((item) => (
                    <label
                      key={item.key}
                      className="flex items-start gap-3 rounded-lg border border-border p-3"
                    >
                      <Checkbox
                        id={`item-${item.key}`}
                        checked={selected.includes(item.key)}
                        onCheckedChange={() => toggle(item.key)}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="flex items-center gap-2 text-sm font-medium text-card-foreground">
                          {item.label}
                          {heldKeys.includes(item.key) && (
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {REASKABLE_ITEMS.includes(item.key) ? "on file — may expire" : "already on file"}
                            </Badge>
                          )}
                        </span>
                        <span className="block text-xs text-muted-foreground">{item.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              ))}

              {selected.some((k) => ["passport", "visa", "share_code"].includes(k)) && (
                <p className="text-xs text-muted-foreground">
                  Right to work documents wait for your review before they count as checked. The expiry date
                  they give is used to warn you before it runs out.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="request-expiry">Link expires after (days)</Label>
              <Input
                id="request-expiry"
                type="number"
                min={1}
                max={30}
                value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The link also closes as soon as they finish, so it can't be reopened later.
              </p>
            </div>

            {latest && (
              <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                <p className="flex items-center gap-1.5 font-medium text-card-foreground">
                  <MailCheck className="h-3.5 w-3.5" /> Last request
                </p>
                <p>Sent {formatDistanceToNow(parseISO(latest.sent_at), { addSuffix: true })} to {latest.recipient_email}</p>
                <p className="flex items-center gap-1.5">
                  {latest.submitted_at ? (
                    <><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Completed</>
                  ) : latest.opened_at ? (
                    <><Clock className="h-3.5 w-3.5" /> Opened, not finished</>
                  ) : (
                    <><Clock className="h-3.5 w-3.5" /> Not opened yet</>
                  )}
                  {latest.rtw_uploaded_count > 0 && (
                    <Badge variant="outline" className="text-[10px] ml-1">
                      {latest.rtw_uploaded_count} document{latest.rtw_uploaded_count > 1 ? "s" : ""}
                    </Badge>
                  )}
                </p>
                {!latest.submitted_at && latest.status !== "revoked" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-1 h-7 text-xs"
                    disabled={revoke.isPending}
                    onClick={() => revoke.mutate(latest.id)}
                  >
                    Cancel this link
                  </Button>
                )}
                {latest.status === "revoked" && <p>This link was cancelled.</p>}
              </div>
            )}

            <Button className="w-full" onClick={() => setConfirming(true)} disabled={!canContinue}>
              Continue
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
