import { useState } from "react";
import {
  CONTRACT_CLAUSES,
  APP_ADDED_CLAUSES,
  MISSING_CLAUSES,
  getKeyTermsSummary,
  getAuditSummary,
  getClauseContent,
} from "./contractClauses";
import type { ContentBlock } from "./contractClauses";
import type { ContractVariables, ContractType } from "./contractTemplates";
import { resolveContractRoleLabel } from "./contractTemplates";
import { Badge } from "@/components/ui/badge";
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
  Plus,
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
  const isManagement = contractType === "management" || contractType === "supervisor";

  return (
    <div className="space-y-4">
      {/* Key Terms Summary */}
      <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Key Terms</h3>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 ml-auto border-primary/30 text-primary">
            {isManagement ? "Management" : "Team Member"} Template
          </Badge>
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
          Source Audit
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
  const isManagement = contractType === "management" || contractType === "supervisor";
  const roleLabel = resolveContractRoleLabel(variables.jobTitle, isManagement);

  return (
    <div className="space-y-3">
      {/* Clause Navigation */}
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center gap-2 mb-2">
          <List className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Original Clause Structure (12 clauses)
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
              {clause.sourceFidelity === "missing" && (
                <span className="text-red-500 text-[9px]" title="Not yet implemented from original">✗</span>
              )}
              {clause.flags.length > 0 && (
                <AlertTriangle className="h-2.5 w-2.5 text-amber-500 shrink-0" />
              )}
            </button>
          ))}
        </div>

        {/* App-added clauses */}
        {APP_ADDED_CLAUSES.length > 0 && (
          <>
            <div className="flex items-center gap-2 mt-3 mb-1.5 pt-2 border-t border-border">
              <Plus className="h-3 w-3 text-blue-500" />
              <span className="text-[10px] font-medium text-blue-600 uppercase tracking-wide">
                App-Added (not in originals)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {APP_ADDED_CLAUSES.map((clause) => (
                <button
                  key={clause.id}
                  onClick={() => {
                    onClauseClick(activeClause === clause.id ? null : clause.id);
                    const el = document.getElementById(`clause-${clause.id}`);
                    el?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className={`text-left text-[11px] px-2 py-1 rounded transition-colors flex items-center gap-1.5 ${
                    activeClause === clause.id
                      ? "bg-blue-500/10 text-blue-600 font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <span className="text-[10px] text-blue-500 w-4 shrink-0">+</span>
                  <span className="truncate">{clause.title}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="text-primary">●</span> Employee value</span>
          <span className="flex items-center gap-1"><span className="text-red-500">✗</span> Not implemented</span>
          <span className="flex items-center gap-1"><AlertTriangle className="h-2.5 w-2.5 text-amber-500" /> Flag</span>
        </div>
      </div>

      {/* Full Contract Text */}
      <ScrollArea className="max-h-[400px]">
        <div className="rounded-xl border border-border bg-card p-4 space-y-0">
          {/* Preamble */}
          <div className="pb-4 mb-4 border-b border-border">
            <p className="text-xs text-muted-foreground mb-2">
              This Employment Agreement is made and entered into by and between:
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
              {` (hereinafter referred to as "${roleLabel}")`}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              The Company and the {roleLabel} shall hereinafter collectively be referred to as the "Parties".
            </p>
          </div>

          {/* Original Clauses */}
          {CONTRACT_CLAUSES.map((clause) => (
            <ClauseBlock
              key={clause.id}
              clauseId={clause.id}
              number={clause.number}
              title={clause.title}
              hasEmployeeValues={clause.hasEmployeeValues}
              isRoleSpecific={clause.isRoleSpecific}
              sourceFidelity={clause.sourceFidelity}
              flags={clause.flags}
              variables={variables}
              contractType={contractType}
              isActive={activeClause === clause.id}
              onToggle={() => onClauseClick(activeClause === clause.id ? null : clause.id)}
            />
          ))}

          {/* App-Added Clauses */}
          {APP_ADDED_CLAUSES.length > 0 && (
            <div className="pt-3 mt-3 border-t-2 border-blue-200 dark:border-blue-800/30">
              <p className="text-[10px] text-blue-600 font-medium uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Plus className="h-3 w-3" />
                Additional Clauses (not in original contracts)
              </p>
              {APP_ADDED_CLAUSES.map((clause) => (
                <ClauseBlock
                  key={clause.id}
                  clauseId={clause.id}
                  number={clause.number}
                  title={clause.title}
                  hasEmployeeValues={false}
                  isRoleSpecific={false}
                  sourceFidelity="app_addition"
                  flags={[]}
                  variables={variables}
                  contractType={contractType}
                  isActive={activeClause === clause.id}
                  onToggle={() => onClauseClick(activeClause === clause.id ? null : clause.id)}
                  isAppAdded
                />
              ))}
            </div>
          )}

          {/* Signature Block */}
          <div id="clause-signatures" className="pt-4 mt-4 border-t border-border">
            <p className="text-[10px] text-muted-foreground mb-3 italic">
              IN WITNESS WHEREOF, the Parties hereto have executed this Agreement, the day and year written below, which shall be applicable as of its execution by both of the Parties.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-medium text-foreground">Employer</p>
                <p className="text-[11px] text-muted-foreground">{companyLegalName}</p>
                <div className="border-b border-foreground/30 w-32 mt-6 mb-1" />
                <p className="text-[10px] text-muted-foreground">Signature</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-foreground">{roleLabel}</p>
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
  clauseId,
  number,
  title,
  hasEmployeeValues,
  isRoleSpecific,
  sourceFidelity,
  flags,
  variables,
  contractType,
  isActive,
  onToggle,
  isAppAdded = false,
}: {
  clauseId: string;
  number: string;
  title: string;
  hasEmployeeValues: boolean;
  isRoleSpecific: boolean;
  sourceFidelity: string;
  flags: { type: string; note: string }[];
  variables: ContractVariables;
  contractType: ContractType;
  isActive: boolean;
  onToggle: () => void;
  isAppAdded?: boolean;
}) {
  const content = getClauseContent(clauseId, variables, contractType);

  return (
    <div
      id={`clause-${clauseId}`}
      className={`py-3 border-b border-border/50 last:border-0 transition-colors ${
        isActive ? "bg-primary/[0.03] -mx-4 px-4 rounded-lg" : ""
      }`}
    >
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full text-left group"
      >
        <span className={`text-[10px] font-mono font-bold w-5 shrink-0 ${isAppAdded ? "text-blue-500" : "text-primary"}`}>
          {number}.
        </span>
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide flex-1">
          {title}
        </span>
        <div className="flex items-center gap-1.5">
          {hasEmployeeValues && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/30 text-primary">
              Custom
            </Badge>
          )}
          {isRoleSpecific && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-blue-300 text-blue-600">
              Role
            </Badge>
          )}
          {isAppAdded && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-blue-300 text-blue-500">
              Added
            </Badge>
          )}
          {sourceFidelity === "missing" && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-red-300 text-red-500">
              New
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
          <RenderContentBlocks blocks={content} />

          {flags.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {flags.map((flag, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 rounded-md px-2.5 py-1.5 ${
                    flag.type === "wording_risk"
                      ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30"
                      : flag.type === "source_mismatch"
                      ? "bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/30"
                      : "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30"
                  }`}
                >
                  <AlertTriangle className={`h-3 w-3 shrink-0 mt-0.5 ${
                    flag.type === "wording_risk" ? "text-red-500" : flag.type === "source_mismatch" ? "text-orange-500" : "text-amber-500"
                  }`} />
                  <p className={`text-[10px] leading-relaxed ${
                    flag.type === "wording_risk" ? "text-red-700 dark:text-red-400" : flag.type === "source_mismatch" ? "text-orange-700 dark:text-orange-400" : "text-amber-700 dark:text-amber-400"
                  }`}>
                    <span className="font-medium">
                      {flag.type === "role_specific_gap" && "Role gap: "}
                      {flag.type === "source_mismatch" && "Source mismatch: "}
                      {flag.type === "wording_risk" && "⚠ Legal review: "}
                      {flag.type === "legal_minimum_only" && "Minimum only: "}
                      {flag.type === "hardcoded_value" && "Hardcoded: "}
                      {flag.type === "review_recommended" && "Review: "}
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

// ─── Content Block Renderer ───

function RenderContentBlocks({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => (
        <div key={i}>
          {block.type === "subheading" && (
            <p className="text-[10px] font-semibold text-foreground/70 uppercase tracking-wide mt-2 mb-1">
              {block.text}
            </p>
          )}
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
    </>
  );
}

// ─── Clause Audit View ───

function ClauseAuditView({ contractType }: { contractType: ContractType }) {
  const auditSummary = getAuditSummary();
  const isManagement = contractType === "management" || contractType === "supervisor";

  const sourceMismatchClauses = CONTRACT_CLAUSES.filter((c) =>
    c.flags.some((f) => f.type === "source_mismatch")
  );
  const wordingRiskClauses = CONTRACT_CLAUSES.filter((c) =>
    c.flags.some((f) => f.type === "wording_risk")
  );
  const roleGapClauses = CONTRACT_CLAUSES.filter((c) =>
    c.flags.some((f) => f.type === "role_specific_gap")
  );

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Source Fidelity Audit — {isManagement ? "Management" : "Team Member"} Contract
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-muted/30 p-2.5 text-center">
            <p className="text-lg font-bold text-foreground">{CONTRACT_CLAUSES.length}</p>
            <p className="text-[10px] text-muted-foreground">Original clauses</p>
          </div>
          <div className="rounded-lg bg-orange-50 dark:bg-orange-950/20 p-2.5 text-center">
            <p className="text-lg font-bold text-orange-600">{auditSummary.sourceMismatch}</p>
            <p className="text-[10px] text-muted-foreground">Source mismatches</p>
          </div>
          <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-2.5 text-center">
            <p className="text-lg font-bold text-red-600">{auditSummary.wordingRisks}</p>
            <p className="text-[10px] text-muted-foreground">Wording risks</p>
          </div>
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-2.5 text-center">
            <p className="text-lg font-bold text-blue-600">{auditSummary.roleGaps}</p>
            <p className="text-[10px] text-muted-foreground">Role-specific gaps</p>
          </div>
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-2.5 text-center">
            <p className="text-lg font-bold text-blue-600">{auditSummary.appAddedClauses}</p>
            <p className="text-[10px] text-muted-foreground">App-added clauses</p>
          </div>
          <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-2.5 text-center">
            <p className="text-lg font-bold text-red-600">{auditSummary.missingClauses}</p>
            <p className="text-[10px] text-muted-foreground">Missing (legal)</p>
          </div>
        </div>
      </div>

      {/* Wording Risks (highest priority) */}
      {wordingRiskClauses.length > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-800/30 bg-card p-4">
          <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            Wording Requiring Legal Review
          </h4>
          <div className="space-y-2">
            {wordingRiskClauses.map((clause) => (
              <Collapsible key={clause.id}>
                <CollapsibleTrigger className="w-full flex items-center justify-between rounded-lg border border-red-200 dark:border-red-800/30 bg-red-50/50 dark:bg-red-950/10 px-3 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                  <span className="font-medium text-foreground">
                    {clause.number}. {clause.title}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 py-2 space-y-1.5">
                  {clause.flags.filter(f => f.type === "wording_risk").map((flag, i) => (
                    <div key={i} className="flex items-start gap-2 text-[10px]">
                      <AlertTriangle className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
                      <span className="text-foreground/70">{flag.note}</span>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      )}

      {/* Source Mismatches */}
      {sourceMismatchClauses.length > 0 && (
        <div className="rounded-xl border border-orange-200 dark:border-orange-800/30 bg-card p-4">
          <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
            Source Fidelity Mismatches
          </h4>
          <p className="text-[10px] text-muted-foreground mb-3">
            These clauses differ from the uploaded original contracts.
          </p>
          <div className="space-y-2">
            {sourceMismatchClauses.map((clause) => (
              <Collapsible key={clause.id}>
                <CollapsibleTrigger className="w-full flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs hover:bg-muted/50 transition-colors">
                  <span className="font-medium text-foreground">
                    {clause.number}. {clause.title}
                  </span>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-orange-300 text-orange-600">
                    {clause.flags.filter(f => f.type === "source_mismatch").length} mismatch{clause.flags.filter(f => f.type === "source_mismatch").length !== 1 ? "es" : ""}
                  </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 py-2 space-y-1.5">
                  {clause.flags.filter(f => f.type === "source_mismatch").map((flag, i) => (
                    <div key={i} className="flex items-start gap-2 text-[10px]">
                      <Info className="h-3 w-3 text-orange-500 shrink-0 mt-0.5" />
                      <span className="text-foreground/70">{flag.note}</span>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      )}

      {/* Role-Specific Gaps */}
      {roleGapClauses.length > 0 && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800/30 bg-card p-4">
          <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-blue-500" />
            Role-Specific Differences (Duty Manager vs Team Member)
          </h4>
          <div className="space-y-2">
            {roleGapClauses.map((clause) => (
              <Collapsible key={clause.id}>
                <CollapsibleTrigger className="w-full flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs hover:bg-muted/50 transition-colors">
                  <span className="font-medium text-foreground">
                    {clause.number}. {clause.title}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 py-2 space-y-1.5">
                  {clause.flags.filter(f => f.type === "role_specific_gap").map((flag, i) => (
                    <div key={i} className="flex items-start gap-2 text-[10px]">
                      <Info className="h-3 w-3 text-blue-500 shrink-0 mt-0.5" />
                      <span className="text-foreground/70">{flag.note}</span>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      )}

      {/* App-Added Clauses */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-800/30 bg-card p-4">
        <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
          <Plus className="h-3.5 w-3.5 text-blue-500" />
          App-Added Clauses (not in original contracts)
        </h4>
        <p className="text-[10px] text-muted-foreground mb-3">
          These clauses were added by the app and do not appear in any uploaded original contract.
        </p>
        <div className="space-y-1.5">
          {APP_ADDED_CLAUSES.map((clause) => (
            <div key={clause.id} className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="flex-1">
                <span className="text-xs font-medium text-foreground">{clause.title}</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">{clause.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Missing Clauses */}
      <div className="rounded-xl border border-red-200 dark:border-red-800/30 bg-card p-4">
        <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
          Missing Clauses (legally expected)
        </h4>
        <div className="space-y-2">
          {MISSING_CLAUSES.map((missing) => (
            <div key={missing.title} className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-foreground">{missing.title}</span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1 py-0 h-4 ${
                      missing.severity === "legally_required"
                        ? "border-red-300 text-red-600"
                        : "border-amber-300 text-amber-600"
                    }`}
                  >
                    {missing.severity.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{missing.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
