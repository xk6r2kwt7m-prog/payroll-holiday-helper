import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, ClipboardCheck, RotateCcw } from "lucide-react";

interface CheckItem {
  id: string;
  label: string;
  hint?: string;
}

interface CheckGroup {
  id: string;
  title: string;
  emoji: string;
  items: CheckItem[];
}

const QA_GROUPS: CheckGroup[] = [
  {
    id: "onboarding",
    title: "Onboarding",
    emoji: "🚀",
    items: [
      { id: "ob-1", label: "New tenant wizard completes all 7 steps", hint: "Workspace → Summary" },
      { id: "ob-2", label: "Company settings populated after onboarding" },
      { id: "ob-3", label: "Default departments seeded (FOH, BOH, CPU)" },
      { id: "ob-4", label: "Setup Health checklist appears on first login" },
      { id: "ob-5", label: "Employee self-service onboarding wizard completes" },
    ],
  },
  {
    id: "permissions",
    title: "Permissions by Role",
    emoji: "🔐",
    items: [
      { id: "perm-1", label: "Admin can access all modules + settings" },
      { id: "perm-2", label: "Manager can view team, schedule, approve timesheets" },
      { id: "perm-3", label: "Manager cannot access payroll or admin settings" },
      { id: "perm-4", label: "Supervisor can view team and schedule (read-only)" },
      { id: "perm-5", label: "Staff can only access self-service portal" },
      { id: "perm-6", label: "Manager scope limits data to assigned branches" },
    ],
  },
  {
    id: "self-service",
    title: "Employee Self-Service",
    emoji: "👤",
    items: [
      { id: "ss-1", label: "Staff can clock in/out" },
      { id: "ss-2", label: "Staff can submit holiday requests" },
      { id: "ss-3", label: "Staff can view own schedule" },
      { id: "ss-4", label: "Staff can view own documents" },
      { id: "ss-5", label: "Staff can complete training modules" },
      { id: "ss-6", label: "Staff cannot see other employees' data" },
    ],
  },
  {
    id: "vacancies",
    title: "Vacancy Posting & Applications",
    emoji: "📋",
    items: [
      { id: "vac-1", label: "Admin can create and publish a vacancy (free)" },
      { id: "vac-2", label: "Candidate can browse published vacancies" },
      { id: "vac-3", label: "Candidate can apply to a vacancy (free)" },
      { id: "vac-4", label: "Application creates a linked conversation" },
      { id: "vac-5", label: "Employer can reply to applicants (free)" },
      { id: "vac-6", label: "Candidate can withdraw application" },
      { id: "vac-7", label: "Duplicate applications are blocked" },
    ],
  },
  {
    id: "outbound",
    title: "Talent Outbound Contact",
    emoji: "💰",
    items: [
      { id: "out-1", label: "Admin can purchase credit pack (test mode)" },
      { id: "out-2", label: "Purchase creates pending → paid lifecycle" },
      { id: "out-3", label: "Wallet balance updates after purchase" },
      { id: "out-4", label: "Admin can unlock a passive candidate (consumes 1 credit)" },
      { id: "out-5", label: "Second unlock within active window is free" },
      { id: "out-6", label: "Candidate receives contact request in inbox" },
      { id: "out-7", label: "Candidate can accept / block / report" },
      { id: "out-8", label: "Blocked employer cannot re-contact" },
    ],
  },
  {
    id: "billing",
    title: "Billing & Credit Usage",
    emoji: "💳",
    items: [
      { id: "bill-1", label: "Billing tab shows correct balance" },
      { id: "bill-2", label: "Purchase history shows all records" },
      { id: "bill-3", label: "Credit ledger entries are accurate" },
      { id: "bill-4", label: "Idempotent: duplicate finalisation does not double-credit" },
      { id: "bill-5", label: "Admin billing view shows tenant details" },
    ],
  },
  {
    id: "expiry",
    title: "Expiry & Refund Flows",
    emoji: "⏰",
    items: [
      { id: "exp-1", label: "Expired purchases reduce wallet balance" },
      { id: "exp-2", label: "Expired unlock windows transition to 'expired'" },
      { id: "exp-3", label: "Abandoned pending purchases expire after 1 hour" },
      { id: "exp-4", label: "Refund reverses remaining credits correctly" },
      { id: "exp-5", label: "Expiry job is idempotent (re-run is safe)" },
    ],
  },
];

export function QATestChecklist() {
  const storageKey = "qa-checklist-state";
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "{}");
    } catch {
      return {};
    }
  });
  const [expandedGroup, setExpandedGroup] = useState<string | null>("onboarding");

  const toggleItem = (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const resetAll = () => {
    setChecked({});
    localStorage.removeItem(storageKey);
  };

  const totalItems = QA_GROUPS.reduce((s, g) => s + g.items.length, 0);
  const completedItems = Object.values(checked).filter(Boolean).length;
  const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              QA Test Checklist
            </CardTitle>
            <CardDescription>
              Validate platform flows end-to-end · {completedItems}/{totalItems} complete
            </CardDescription>
          </div>
          <Button size="sm" variant="ghost" onClick={resetAll} className="gap-1 text-xs">
            <RotateCcw className="h-3 w-3" /> Reset
          </Button>
        </div>
        <Progress value={pct} className="mt-2 h-2" />
      </CardHeader>
      <CardContent className="space-y-2">
        {QA_GROUPS.map((group) => {
          const groupComplete = group.items.filter((i) => checked[i.id]).length;
          const isExpanded = expandedGroup === group.id;

          return (
            <Collapsible key={group.id} open={isExpanded} onOpenChange={() => setExpandedGroup(isExpanded ? null : group.id)}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-muted/50 transition-colors text-left">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{group.emoji}</span>
                  <span className="text-sm font-medium">{group.title}</span>
                  <Badge
                    variant={groupComplete === group.items.length ? "default" : "secondary"}
                    className="text-[10px] h-5"
                  >
                    {groupComplete}/{group.items.length}
                  </Badge>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-10 pr-3 pb-2 space-y-2">
                {group.items.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-start gap-3 py-1.5 cursor-pointer group"
                  >
                    <Checkbox
                      checked={!!checked[item.id]}
                      onCheckedChange={() => toggleItem(item.id)}
                      className="mt-0.5"
                    />
                    <div>
                      <span className={`text-sm ${checked[item.id] ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {item.label}
                      </span>
                      {item.hint && (
                        <p className="text-[11px] text-muted-foreground">{item.hint}</p>
                      )}
                    </div>
                  </label>
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
