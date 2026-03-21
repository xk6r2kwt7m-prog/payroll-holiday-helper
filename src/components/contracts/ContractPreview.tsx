import { useState } from "react";
import {
  CONTRACT_CLAUSES,
  MISSING_CLAUSES,
  getKeyTermsSummary,
  getAuditSummary,
} from "./contractClauses";
import type { ContractVariables, ContractType } from "./contractTemplates";
import { getEmploymentTypeLabel } from "./contractTemplates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileText,
  Info,
  List,
  Shield,
  User,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ContractPreviewProps {
  variables: ContractVariables;
  contractType: ContractType;
  companyLegalName: string;
  companyAddress: string;
}

type ViewTab = "preview" | "audit";

export function ContractPreview({
  variables,
  contractType,
  companyLegalName,
  companyAddress,
}: ContractPreviewProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>("preview");
  const [activeClause, setActiveClause] = useState<string | null>(null);
  const keyTerms = getKeyTermsSummary(variables, contractType);
  const auditSummary = getAuditSummary();

  return (
    <div className="space-y-4">
      {/* Key Terms Summary */}
      <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Key Terms</h3>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {keyTerms.map((term) => (
            <div key={term.label} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{term.label}</span>
              <span className="font-medium text-foreground text-right truncate max-w-[140px]">
                {term.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 rounded-lg bg-muted/50 p-0.5">
        <button
          onClick={() => setActiveTab("preview")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "preview"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Contract Preview
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "audit"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          Clause Audit
          {auditSummary.total > 0 && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 ml-0.5 border-amber-300 text-amber-600">
              {auditSummary.total + auditSummary.missingClauses}
            </Badge>
          )}
        </button>
      </div>

      {activeTab === "preview" && (
        <ContractClausePreview
          variables={variables}
          contractType={contractType}
          companyLegalName={companyLegalName}
          companyAddress={companyAddress}
          activeClause={activeClause}
          onClauseClick={setActiveClause}
        />
      )}

      {activeTab === "audit" && (
        <ClauseAuditView contractType={contractType} />
      )}
    </div>
  );
}

// ─── Clause Preview ───

function ContractClausePreview({
  variables,
  contractType,
  companyLegalName,
  companyAddress,
  activeClause,
  onClauseClick,
}: {
  variables: ContractVariables;
  contractType: ContractType;
  companyLegalName: string;
  companyAddress: string;
  activeClause: string | null;
  onClauseClick: (id: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Clause Navigation */}
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center gap-2 mb-2">
          <List className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Clause Index
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {CONTRACT_CLAUSES.map((clause) => (
            <button
              key={clause.id}
              onClick={() => {
                onClauseClick(activeClause === clause.id ? null : clause.id);
                const el = document.getElementById(`clause-${clause.id}`);
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className={`text-left text-[11px] px-2 py-1 rounded transition-colors flex items-center gap-1.5 ${
                activeClause === clause.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <span className="text-[10px] text-muted-foreground w-4 shrink-0">{clause.number}.</span>
              <span className="truncate">{clause.title}</span>
              {clause.hasEmployeeValues && (
                <span className="text-primary text-[9px]" title="Contains employee-specific values">●</span>
              )}
              {clause.flags.length > 0 && (
                <AlertTriangle className="h-2.5 w-2.5 text-amber-500 shrink-0" />
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="text-primary">●</span> Employee value
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-2.5 w-2.5 text-amber-500" /> Review flag
          </span>
        </div>
      </div>

      {/* Full Contract Text */}
      <ScrollArea className="max-h-[400px]">
        <div className="rounded-xl border border-border bg-card p-4 space-y-0">
          {/* Preamble */}
          <div className="pb-4 mb-4 border-b border-border">
            <p className="text-xs text-muted-foreground mb-2">
              This Employment Agreement is made between:
            </p>
            <p className="text-xs text-foreground">
              <span className="font-semibold">{companyLegalName}</span>
              {companyAddress ? `, with its registered address at ${companyAddress}` : ""}
              {" "}("the Company")
            </p>
            <p className="text-xs text-muted-foreground my-1">and</p>
            <p className="text-xs text-foreground">
              <span className="font-semibold">{variables.employeeName}</span>
              {variables.homeAddress ? `, residing at ${variables.homeAddress}` : ""}
              {" "}("the Employee")
            </p>
          </div>

          {/* Clauses */}
          {CONTRACT_CLAUSES.map((clause) => (
            <ClauseBlock
              key={clause.id}
              clause={clause}
              variables={variables}
              contractType={contractType}
              isActive={activeClause === clause.id}
              onToggle={() => onClauseClick(activeClause === clause.id ? null : clause.id)}
            />
          ))}

          {/* Signature Block */}
          <div id="clause-signatures" className="pt-4 mt-4 border-t border-border">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">
              Signatures
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-medium text-foreground">Employer</p>
                <p className="text-[11px] text-muted-foreground">{companyLegalName}</p>
                <div className="border-b border-foreground/30 w-32 mt-6 mb-1" />
                <p className="text-[10px] text-muted-foreground">Signature</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-foreground">Employee</p>
                <p className="text-[11px] text-muted-foreground">{variables.employeeName}</p>
                <div className="border-b border-foreground/30 w-32 mt-6 mb-1" />
                <p className="text-[10px] text-muted-foreground">Signature</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-4">Date: ___________________</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Single Clause ───

function ClauseBlock({
  clause,
  variables,
  contractType,
  isActive,
  onToggle,
}: {
  clause: (typeof CONTRACT_CLAUSES)[number];
  variables: ContractVariables;
  contractType: ContractType;
  isActive: boolean;
  onToggle: () => void;
}) {
  const content = getClauseContent(clause.id, variables, contractType);

  return (
    <div
      id={`clause-${clause.id}`}
      className={`py-3 border-b border-border/50 last:border-0 transition-colors ${
        isActive ? "bg-primary/[0.03] -mx-4 px-4 rounded-lg" : ""
      }`}
    >
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full text-left group"
      >
        <span className="text-[10px] text-primary font-mono font-bold w-5 shrink-0">
          {clause.number}.
        </span>
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide flex-1">
          {clause.title}
        </span>
        <div className="flex items-center gap-1.5">
          {clause.hasEmployeeValues && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/30 text-primary">
              Custom
            </Badge>
          )}
          {clause.isRoleSpecific && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-blue-300 text-blue-600">
              Role
            </Badge>
          )}
          {isActive ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </button>

      {isActive && (
        <div className="mt-2 space-y-2">
          {content.map((block, i) => (
            <div key={i}>
              {block.type === "paragraph" && (
                <p className="text-[11px] text-foreground/80 leading-relaxed">
                  {block.text}
                </p>
              )}
              {block.type === "highlight" && (
                <div className="rounded-md bg-primary/[0.06] border border-primary/10 px-3 py-1.5 text-[11px] font-medium text-foreground">
                  {block.text}
                </div>
              )}
              {block.type === "bullets" && (
                <ul className="space-y-0.5 ml-3">
                  {block.items!.map((item, j) => (
                    <li key={j} className="text-[11px] text-foreground/80 flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {clause.flags.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {clause.flags.map((flag, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 px-2.5 py-1.5"
                >
                  <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                    <span className="font-medium">
                      {flag.type === "role_specific_gap" && "Role gap: "}
                      {flag.type === "review_recommended" && "Review: "}
                      {flag.type === "legal_minimum_only" && "Minimum only: "}
                      {flag.type === "hardcoded_value" && "Hardcoded: "}
                    </span>
                    {flag.note}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Clause Audit View ───

function ClauseAuditView({ contractType }: { contractType: ContractType }) {
  const auditSummary = getAuditSummary();
  const flaggedClauses = CONTRACT_CLAUSES.filter((c) => c.flags.length > 0);
  const roleSpecificClauses = CONTRACT_CLAUSES.filter((c) => c.isRoleSpecific);
  const isManagement = contractType === "management" || contractType === "supervisor";

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Clause Audit Summary
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/30 p-2.5 text-center">
            <p className="text-lg font-bold text-foreground">{CONTRACT_CLAUSES.length}</p>
            <p className="text-[10px] text-muted-foreground">Clauses included</p>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-2.5 text-center">
            <p className="text-lg font-bold text-amber-600">{auditSummary.total}</p>
            <p className="text-[10px] text-muted-foreground">Review flags</p>
          </div>
          <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-2.5 text-center">
            <p className="text-lg font-bold text-red-600">{auditSummary.legallyRequired}</p>
            <p className="text-[10px] text-muted-foreground">Missing (legally required)</p>
          </div>
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-2.5 text-center">
            <p className="text-lg font-bold text-blue-600">{auditSummary.roleGaps}</p>
            <p className="text-[10px] text-muted-foreground">Role-specific gaps</p>
          </div>
        </div>
      </div>

      {/* Flagged Clauses */}
      {flaggedClauses.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/30 bg-card p-4">
          <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Clauses with Review Flags
          </h4>
          <div className="space-y-2">
            {flaggedClauses.map((clause) => (
              <Collapsible key={clause.id}>
                <CollapsibleTrigger className="w-full flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs hover:bg-muted/50 transition-colors">
                  <span className="font-medium text-foreground">
                    {clause.number}. {clause.title}
                  </span>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                    {clause.flags.length} {clause.flags.length === 1 ? "flag" : "flags"}
                  </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 py-2 space-y-1.5">
                  {clause.flags.map((flag, i) => (
                    <div key={i} className="flex items-start gap-2 text-[10px]">
                      <Info className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                      <span className="text-foreground/70">{flag.note}</span>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      )}

      {/* Missing Clauses */}
      <div className="rounded-xl border border-red-200 dark:border-red-800/30 bg-card p-4">
        <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
          Missing Clauses
        </h4>
        <div className="space-y-2">
          {MISSING_CLAUSES.map((missing) => (
            <div
              key={missing.title}
              className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-foreground">{missing.title}</span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1 py-0 h-4 ${
                      missing.severity === "legally_required"
                        ? "border-red-300 text-red-600"
                        : missing.severity === "recommended"
                        ? "border-amber-300 text-amber-600"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {missing.severity.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {missing.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role-Specific Gaps */}
      {isManagement && roleSpecificClauses.length > 0 && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800/30 bg-card p-4">
          <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-blue-500" />
            Role-Specific Gaps for {contractType === "management" ? "Management" : "Supervisor"} Contracts
          </h4>
          <p className="text-[10px] text-muted-foreground mb-3">
            These clauses currently use identical wording for all roles. Management contracts typically require stronger or different wording.
          </p>
          <div className="space-y-1">
            {roleSpecificClauses.map((clause) => (
              <div key={clause.id} className="flex items-center gap-2 text-[11px] text-foreground/70 px-2 py-1">
                <span className="text-muted-foreground w-4">{clause.number}.</span>
                <span>{clause.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Clause Content Generator ───
// Returns structured content blocks for each clause.
// This mirrors ContractPDF.tsx exactly — no legal wording is changed.

interface ContentBlock {
  type: "paragraph" | "highlight" | "bullets";
  text?: string;
  items?: string[];
}

function getClauseContent(
  clauseId: string,
  v: ContractVariables,
  _contractType: ContractType
): ContentBlock[] {
  switch (clauseId) {
    case "position":
      return [
        { type: "paragraph", text: `The Employee is employed as ${v.jobTitle}.` },
        { type: "paragraph", text: "The Employee agrees to perform all duties reasonably required for the role and any additional duties reasonably requested by management consistent with their skills and experience." },
        { type: "paragraph", text: "The Employee agrees to act with honesty, professionalism, and integrity at all times while representing the Company." },
      ];

    case "place_of_work":
      return [
        { type: "paragraph", text: "The Employee's primary place of work will be:" },
        { type: "highlight", text: v.workLocation || "[Not specified]" },
        { type: "paragraph", text: "Due to the nature of the Company's operations, the Employee may be required to work at any Company location within Greater London where reasonably required by the business." },
      ];

    case "probation":
      return [
        { type: "paragraph", text: `Employment is subject to a probation period of ${v.probationPeriod}.` },
        { type: "paragraph", text: "During this period the Company will assess performance, reliability, and suitability for the role." },
        { type: "paragraph", text: "The Company may terminate employment during probation with one week's notice." },
      ];

    case "hours":
      return [
        { type: "paragraph", text: "The Employee's hours will vary depending on the operational needs of the business." },
        { type: "paragraph", text: "Working hours will be organised through the Company's rota system." },
        { type: "paragraph", text: "Average weekly hours are expected to be approximately:" },
        { type: "highlight", text: `${v.weeklyHours} hours per week` },
        { type: "paragraph", text: "Due to the nature of hospitality operations, shifts may vary week to week." },
      ];

    case "rota":
      return [
        { type: "paragraph", text: "The Company operates a rota system to allocate shifts. Employees are responsible for checking the rota regularly and attending all scheduled shifts." },
        { type: "paragraph", text: "The Company reserves the right to amend rotas where reasonably required to meet operational needs. Employees may occasionally be asked to adjust shifts at short notice due to operational requirements." },
      ];

    case "communication":
      return [
        { type: "paragraph", text: "Employees are responsible for regularly checking the Company's communication channels including email, rota software, and internal messaging platforms." },
        { type: "paragraph", text: "Important updates regarding shifts, operations, and company policies may be communicated through these systems. Failure to check communications may result in missed instructions or shifts." },
      ];

    case "salary":
      return [
        { type: "highlight", text: `The Employee will be paid £${v.hourlyRate} per hour.` },
        { type: "paragraph", text: "Salary will be paid monthly in arrears through the Company's payroll system." },
        { type: "paragraph", text: "Salary will be subject to deductions required by law including income tax and National Insurance." },
        { type: "paragraph", text: "Any service charge or tips may be distributed separately according to Company policy." },
      ];

    case "holiday":
      return [
        { type: "paragraph", text: "The Employee is entitled to statutory holiday entitlement in accordance with UK law." },
        { type: "paragraph", text: "This is equivalent to 5.6 weeks of paid holiday per year or accrued proportionally depending on hours worked." },
        { type: "paragraph", text: "Holiday must be requested in advance and approved by management." },
      ];

    case "sickness":
      return [
        { type: "paragraph", text: "Employees must notify the Company as soon as possible if they are unable to attend work due to illness." },
        { type: "paragraph", text: "Notification must be made before the start of the scheduled shift whenever possible." },
        { type: "paragraph", text: "If absence exceeds three consecutive days, a medical certificate may be required." },
      ];

    case "attendance":
      return [
        { type: "paragraph", text: "Employees are expected to attend all scheduled shifts." },
        { type: "paragraph", text: "Failure to attend a shift without valid reason may be treated as unauthorised absence and may result in disciplinary action." },
      ];

    case "confidentiality":
      return [
        { type: "paragraph", text: "Employees must not disclose confidential information relating to the Company including:" },
        { type: "bullets", items: ["recipes", "financial information", "operational procedures", "customer data", "business strategies"] },
        { type: "paragraph", text: "This obligation continues after employment ends." },
      ];

    case "secondary_employment":
      return [
        { type: "paragraph", text: "Employees must obtain written permission from the Company before undertaking other employment that could interfere with their duties or create a conflict of interest." },
      ];

    case "deductions":
      return [
        { type: "paragraph", text: "The Company reserves the right to deduct from wages any sums owed to the Company including:" },
        { type: "bullets", items: ["salary overpayments", "training costs", "uniform costs", "losses caused by negligence"] },
      ];

    case "data_protection":
      return [
        { type: "paragraph", text: "The Company will process employee data in accordance with the UK GDPR and Data Protection Act 2018." },
      ];

    case "disciplinary":
      return [
        { type: "paragraph", text: "Employees must comply with Company policies and procedures. Serious misconduct may result in disciplinary action including dismissal." },
        { type: "paragraph", text: "Examples of gross misconduct include but are not limited to:" },
        { type: "bullets", items: ["theft", "violence", "harassment", "serious insubordination", "working while intoxicated", "breach of food safety regulations"] },
      ];

    case "termination":
      return [
        { type: "paragraph", text: "After probation either party may terminate employment by providing notice of:" },
        { type: "highlight", text: v.noticePeriod },
        { type: "paragraph", text: "The Company reserves the right to make payment in lieu of notice where appropriate." },
      ];

    case "entire_agreement":
      return [
        { type: "paragraph", text: "This agreement constitutes the entire agreement between the Parties and supersedes any previous discussions or agreements." },
      ];

    default:
      return [{ type: "paragraph", text: "[Clause content not found]" }];
  }
}
