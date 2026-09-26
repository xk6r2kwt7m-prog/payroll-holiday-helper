import { cn } from "@/lib/utils";

interface PayrollJourneyProps {
  status: string;
  entryCount: number;
  dataBlock?: string | null;
  blockerCount: number;
  canPrepare: boolean;
  onPrepare: () => void;
}

/** Navigation only. Never grants approval, changes records or infers delivery. */
export function PayrollJourney({ status, entryCount, dataBlock, blockerCount, canPrepare, onPrepare }: PayrollJourneyProps) {
  const knownStatus = ["draft", "pending", "approved", "rejected"].includes(status);
  const current = dataBlock || !knownStatus ? "review"
    : status === "approved" ? "reports"
    : entryCount === 0 && canPrepare ? "prepare"
    : status === "pending" && blockerCount === 0 ? "approval" : "review";
  const guidance = dataBlock ? "Payroll checks are unavailable or still loading. Read the check message below before continuing."
    : !knownStatus ? "This period has an unfamiliar status. Check its details before taking action."
    : status === "approved" ? "This period is approved. Review the report and recipient before sharing it."
    : entryCount === 0 ? "Start by adding or importing this period’s timesheets."
    : blockerCount > 0 ? "Resolve the highlighted issues, then review the approval checks."
    : status === "rejected" ? "This period needs another review. Check the details and available period controls below."
    : status === "pending" ? "Complete the approval checklist. The existing checks decide whether approval is available."
    : "Review hours, pay and warnings before submitting this period for approval.";
  const steps = [
    { id: "prepare", label: "Prepare", detail: "Timesheets and entries" },
    { id: "review", label: "Review", detail: "Details and issues" },
    { id: "approval", label: "Approval", detail: "Checks and confirmation" },
    { id: "reports", label: "Share", detail: "Reports and email" },
  ];
  return (
    <section aria-label="Payroll journey" className="rounded-xl border border-border bg-card p-4 space-y-3">
      <p className="text-sm text-foreground" role="status">{guidance}</p>
      <nav aria-label="Payroll review steps">
        <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {steps.map((step, index) => {
            const unavailable = step.id === "prepare" && !canPrepare;
            const content = <><span className="text-sm font-medium">{index + 1}. {step.label}</span><span className="block text-xs text-muted-foreground mt-1">{step.detail}</span></>;
            return <li key={step.id}>{unavailable ? (
              <span aria-disabled="true" className="block rounded-lg p-3 text-muted-foreground">{content}</span>
            ) : (
              <a href={`#payroll-${step.id}`} aria-current={step.id === current ? "step" : undefined}
                onClick={step.id === "prepare" ? onPrepare : undefined}
                className={cn("block min-h-11 rounded-lg p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", step.id === current ? "bg-primary/10 text-foreground ring-1 ring-primary/30" : "hover:bg-muted text-muted-foreground")}>
                {content}
              </a>
            )}</li>;
          })}
        </ol>
      </nav>
    </section>
  );
}
