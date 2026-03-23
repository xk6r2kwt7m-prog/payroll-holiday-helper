import { useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp, CheckCircle2, UserPlus, UserMinus, Eye, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useNavigate } from "react-router-dom";
import type { PayrollImportIssue } from "@/hooks/usePayrollImportStatus";

interface UnresolvedIssuesPanelProps {
  issues: PayrollImportIssue[];
  excludedNames: string[];
  onAddToPeriod?: (employeeId: string) => void;
  onExclude?: (csvName: string) => void;
  onMarkReviewed?: (csvName: string) => void;
}

export function UnresolvedIssuesPanel({
  issues,
  excludedNames,
  onAddToPeriod,
  onExclude,
  onMarkReviewed,
}: UnresolvedIssuesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reviewedIssues, setReviewedIssues] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const blockingIssues = issues.filter(i => !reviewedIssues.has(i.csvName));
  const reviewOnlyIssues = issues.filter(i => reviewedIssues.has(i.csvName));
  const hasBlockers = blockingIssues.length > 0;

  if (issues.length === 0 && excludedNames.length === 0) return null;

  const handleMarkReviewed = (csvName: string) => {
    setReviewedIssues(prev => new Set([...prev, csvName]));
    onMarkReviewed?.(csvName);
  };

  const getIssueDescription = (issue: PayrollImportIssue) => {
    switch (issue.issue) {
      case "exists_not_added":
        return `Employee exists as ${issue.employeeName}${issue.employeeStatus ? ` (${issue.employeeStatus})` : ""} but is not linked to this payroll period.`;
      case "leaver_in_csv":
        return `Leaver appears in imported timesheet — may have worked during the transition period.`;
      default:
        return `Employee not found in database.`;
    }
  };

  const getSuggestedAction = (issue: PayrollImportIssue) => {
    switch (issue.issue) {
      case "exists_not_added":
        return "Add to this payroll period";
      case "leaver_in_csv":
        return "Review: confirm final pay or exclude";
      default:
        return "Create new employee or exclude";
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={`rounded-xl border p-4 space-y-2 animate-fade-in ${
        hasBlockers 
          ? "border-destructive/20 bg-destructive/5" 
          : "border-warning/30 bg-warning/5"
      }`}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between gap-2 w-full text-left group">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className={`h-5 w-5 shrink-0 ${hasBlockers ? "text-destructive" : "text-warning"}`} />
              <h3 className={`font-semibold text-sm ${hasBlockers ? "text-destructive" : "text-warning"}`}>
                {hasBlockers ? "Action Required" : "Issues Reviewed"}
              </h3>
              <Badge variant="secondary" className={`text-[10px] ${
                hasBlockers ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"
              }`}>
                {blockingIssues.length} blocking · {reviewOnlyIssues.length} reviewed
              </Badge>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                {isOpen ? "Hide" : "Review issues"}
              </span>
              {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </button>
        </CollapsibleTrigger>

        {!isOpen && hasBlockers && (
          <p className="text-xs text-muted-foreground pl-7">
            {blockingIssues.length} unresolved {blockingIssues.length === 1 ? "issue blocks" : "issues block"} submission. Click "Review issues" to resolve.
          </p>
        )}

        <CollapsibleContent className="space-y-3 pt-1">
          {/* Blocking issues */}
          {blockingIssues.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-destructive pl-7">Blocking — must resolve before submission</p>
              {blockingIssues.map((issue) => (
                <IssueCard
                  key={issue.csvName}
                  issue={issue}
                  getDescription={getIssueDescription}
                  getSuggested={getSuggestedAction}
                  onMarkReviewed={handleMarkReviewed}
                  onAddToPeriod={onAddToPeriod}
                  onExclude={onExclude}
                  navigate={navigate}
                  isBlocking
                />
              ))}
            </div>
          )}

          {/* Reviewed issues */}
          {reviewOnlyIssues.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground pl-7">Reviewed — no longer blocking</p>
              {reviewOnlyIssues.map((issue) => (
                <IssueCard
                  key={issue.csvName}
                  issue={issue}
                  getDescription={getIssueDescription}
                  getSuggested={getSuggestedAction}
                  navigate={navigate}
                  isBlocking={false}
                />
              ))}
            </div>
          )}

          {/* Excluded employees */}
          {excludedNames.length > 0 && (
            <div className="rounded-lg bg-muted/50 border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground">
                <UserMinus className="h-3.5 w-3.5 inline mr-1" />
                Excluded: {excludedNames.join(", ")}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Deliberately excluded during import. Recorded in audit log.
              </p>
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function IssueCard({
  issue,
  getDescription,
  getSuggested,
  onMarkReviewed,
  onAddToPeriod,
  onExclude,
  navigate,
  isBlocking,
}: {
  issue: PayrollImportIssue;
  getDescription: (i: PayrollImportIssue) => string;
  getSuggested: (i: PayrollImportIssue) => string;
  onMarkReviewed?: (csvName: string) => void;
  onAddToPeriod?: (employeeId: string) => void;
  onExclude?: (csvName: string) => void;
  navigate: ReturnType<typeof useNavigate>;
  isBlocking: boolean;
}) {
  return (
    <div className={`rounded-lg border bg-background p-3 space-y-2 ${
      isBlocking ? "border-destructive/30" : "border-border/60"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{issue.csvName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{getDescription(issue)}</p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-primary">{getSuggested(issue)}</span>
          </div>
        </div>
        {issue.employeeStatus && (
          <Badge variant="outline" className="text-[10px] shrink-0">
            {issue.employeeStatus}
          </Badge>
        )}
      </div>

      {isBlocking && (
        <div className="flex flex-wrap gap-1.5">
          {issue.issue === "exists_not_added" && issue.employeeId && onAddToPeriod && (
            <Button size="sm" className="h-7 text-xs" onClick={() => onAddToPeriod(issue.employeeId!)}>
              <UserPlus className="h-3 w-3 mr-1" />
              Add to payroll
            </Button>
          )}
          {issue.employeeId && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(`/employees?edit=${issue.employeeId}`)}>
              <Eye className="h-3 w-3 mr-1" />
              View employee
            </Button>
          )}
          {onExclude && (
            <Button size="sm" variant="outline" className="h-7 text-xs text-muted-foreground" onClick={() => onExclude(issue.csvName)}>
              <UserMinus className="h-3 w-3 mr-1" />
              Exclude
            </Button>
          )}
          {onMarkReviewed && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => onMarkReviewed(issue.csvName)}>
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Mark reviewed
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
