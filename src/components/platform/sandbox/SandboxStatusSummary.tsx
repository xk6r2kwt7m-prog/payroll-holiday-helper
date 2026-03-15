import { Badge } from "@/components/ui/badge";
import { Check, X, AlertTriangle, Clock } from "lucide-react";

interface SandboxStatusSummaryProps {
  sandbox: any;
  tenant: any;
}

function BoolBadge({ value, label }: { value: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {value ? (
        <Check className="h-3 w-3 text-primary" />
      ) : (
        <X className="h-3 w-3 text-muted-foreground" />
      )}
      <span className={value ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export type Freshness = "fresh" | "needs_retest" | "stale";

export function getLastActivityDate(sandbox: any): string | null {
  const dates = [
    sandbox.last_rebuilt_at,
    sandbox.last_impersonated_at,
    sandbox.last_qa_note_at,
    sandbox.last_smoke_test_at,
    sandbox.created_at,
  ].filter(Boolean);
  if (!dates.length) return null;
  return dates.sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())[0];
}

export function getFreshness(sandbox: any): Freshness {
  const qaStatus = sandbox.qa_status;
  if (qaStatus === "blocker" || qaStatus === "issue_found" || qaStatus === "retest_needed") {
    return "needs_retest";
  }
  const lastActivity = getLastActivityDate(sandbox);
  if (!lastActivity) return "stale";
  const hoursSince = (Date.now() - new Date(lastActivity).getTime()) / 3600000;
  if (hoursSince < 24) return "fresh";
  if (hoursSince < 72) return "needs_retest";
  return "stale";
}

/** Hours since last activity, or Infinity if never. */
export function getHoursSinceActivity(sandbox: any): number {
  const last = getLastActivityDate(sandbox);
  if (!last) return Infinity;
  return (Date.now() - new Date(last).getTime()) / 3600000;
}

const FRESHNESS_CONFIG: Record<Freshness, { label: string; className: string }> = {
  fresh: { label: "Fresh", className: "bg-primary/10 text-primary border-primary/30" },
  needs_retest: { label: "Needs Retest", className: "bg-accent/50 text-accent-foreground border-accent" },
  stale: { label: "Stale", className: "bg-muted text-muted-foreground border-border" },
};

export function FreshnessBadge({ sandbox }: { sandbox: any }) {
  const freshness = getFreshness(sandbox);
  const cfg = FRESHNESS_CONFIG[freshness];
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

const PRESET_RECOMMENDATIONS: Record<string, string> = {
  empty: "Onboarding · Setup · Permissions",
  small_restaurant: "Vacancies · Applications · Inbox",
  multi_branch: "Privacy · Talent Pool · Outbound Contact",
};

/** Returns a "recommended for" label based on seed config context. */
export function getRecommendedFor(sandbox: any): string {
  const config = (sandbox.seed_config as Record<string, any>) || {};
  // If billing-relevant seeds are all on, treat as billing test
  if (config.seedPayrollPeriods && config.seedTalentProfiles && config.serviceChargeEnabled) {
    return "Credits · Expiry · Ledger · Support Review";
  }
  return PRESET_RECOMMENDATIONS[sandbox.preset_name] || "General QA";
}

function getSeedGaps(config: Record<string, any>): string[] {
  const gaps: string[] = [];
  if (!config.seedTalentProfiles) gaps.push("Talent Profiles");
  if (!config.seedVacancies) gaps.push("Vacancies");
  if (!config.seedPayrollPeriods) gaps.push("Payroll");
  if (!config.seedArchivedLeaver) gaps.push("Archived Leaver");
  return gaps;
}

export function SandboxStatusSummary({ sandbox, tenant }: SandboxStatusSummaryProps) {
  const config = (sandbox.seed_config as Record<string, any>) || {};
  const seedGaps = getSeedGaps(config);
  const hoursSince = getHoursSinceActivity(sandbox);

  return (
    <div className="space-y-3">
      {/* Recommended for */}
      <div className="text-[11px] text-muted-foreground">
        Recommended for: <span className="font-medium text-foreground">{getRecommendedFor(sandbox)}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-xs">
        <div className="space-y-0.5">
          <span className="text-muted-foreground">Preset</span>
          <p className="font-medium"><Badge variant="outline" className="text-[10px] h-4">{sandbox.preset_name}</Badge></p>
        </div>
        <div className="space-y-0.5">
          <span className="text-muted-foreground">Setup State</span>
          <p className="font-medium"><Badge variant="secondary" className="text-[10px] h-4">{sandbox.setup_state}</Badge></p>
        </div>
        <div className="space-y-0.5">
          <span className="text-muted-foreground">Country</span>
          <p className="font-medium">{tenant?.country || "—"}</p>
        </div>
        <BoolBadge value={!!config.seedTalentProfiles} label="Talent Profiles" />
        <BoolBadge value={!!config.seedVacancies} label="Vacancies" />
        <BoolBadge value={!!config.seedPayrollPeriods} label="Payroll Periods" />
        <BoolBadge value={!!config.seedArchivedLeaver} label="Archived Leaver" />
        <BoolBadge value={!!tenant?.service_charge_enabled} label="Service Charge" />
        <div className="space-y-0.5">
          <span className="text-muted-foreground">Created</span>
          <p className="font-medium">{new Date(sandbox.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Activity timestamps */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>Rebuilt: <strong className="text-foreground">{timeAgo(sandbox.last_rebuilt_at)}</strong></span>
        <span>Impersonated: <strong className="text-foreground">{timeAgo(sandbox.last_impersonated_at)}</strong></span>
        <span>QA Note: <strong className="text-foreground">{timeAgo(sandbox.last_qa_note_at)}</strong></span>
        <span>Smoke Test: <strong className="text-foreground">{timeAgo(sandbox.last_smoke_test_at)}</strong></span>
      </div>

      {/* Stale environment warnings */}
      {hoursSince >= 72 && (
        <div className="flex items-start gap-2 text-[11px] bg-destructive/10 text-destructive rounded-md px-2.5 py-1.5">
          <Clock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>No testing activity for {Math.floor(hoursSince / 24)}+ days — data may be stale. Consider rebuilding.</span>
        </div>
      )}
      {hoursSince >= 24 && hoursSince < 72 && (
        <div className="flex items-start gap-2 text-[11px] bg-muted/80 text-muted-foreground rounded-md px-2.5 py-1.5">
          <Clock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>Last activity was {Math.floor(hoursSince)}h ago — consider retesting before relying on results.</span>
        </div>
      )}

      {/* Seed coverage warning */}
      {seedGaps.length > 0 && (
        <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/50 rounded-md px-2.5 py-1.5">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>Missing seed data: {seedGaps.join(", ")}</span>
        </div>
      )}
    </div>
  );
}
