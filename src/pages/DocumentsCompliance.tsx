import { useSearchParams } from "react-router-dom";
import { useTenantGuard } from "@/hooks/useTenantGuard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useCallback, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { ComplianceAttentionPanel } from "@/components/compliance/ComplianceAttentionPanel";
import { StaffInductionSection } from "@/components/compliance/StaffInductionSection";
import { DocumentLibrarySection } from "@/components/compliance/DocumentLibrarySection";
import { BranchComplianceSection } from "@/components/compliance/BranchComplianceSection";
import { CertificatesSection } from "@/components/compliance/CertificatesSection";
import { InspectionFileSection } from "@/components/compliance/InspectionFileSection";
import { AlcoholAuthorisationsPanel } from "@/components/compliance/AlcoholAuthorisationsPanel";
import { AlcoholAuthorisationBoard } from "@/components/compliance/AlcoholAuthorisationBoard";
import { TrainingAutomationPanel } from "@/components/compliance/TrainingAutomationPanel";
import { PremisesLicencePanel } from "@/components/compliance/PremisesLicencePanel";
import { SiteEmergencyDetailsCard } from "@/components/compliance/SiteEmergencyDetailsCard";
import { IncidentBookSection } from "@/components/compliance/IncidentBookSection";
import { InductionLessonsPanel } from "@/components/compliance/InductionLessonsPanel";
import { AllergenTrainingReview } from "@/components/compliance/allergen/AllergenTrainingReview";
import {
  useComplianceBranches, useConfirmBranchLocation, type ComplianceBranchOption,
} from "@/hooks/useComplianceBranches";

const COMPLIANCE_SECTIONS = [
  ["induction", "Staff induction"], ["library", "Document library"],
  ["branch", "Branch compliance"], ["certificates", "Certificates & expiry"],
  ["inspection", "Inspection file"], ["allergen", "Allergen training"], ["incidents", "Incident book"],
] as const;

export default function DocumentsCompliance() {
  const [params, setParams] = useSearchParams();
  const section = COMPLIANCE_SECTIONS.some(([key]) => key === params.get("tab")) ? params.get("tab")! : "induction";
  const changeSection = (value: string) => setParams(previous => { const next = new URLSearchParams(previous); next.set("tab", value); return next; });
  const { data: branchData, isLoading, isError, refetch } = useComplianceBranches();
  const options = branchData?.selectable ?? [];
  const needsReview = branchData?.needsReview ?? [];
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const reset = useCallback(() => setSelectedBranch(null), []);
  const { tenantReady } = useTenantGuard(reset);
  const branch = selectedBranch === "" ? "" : options.find(option => option.branch === selectedBranch)?.branch ?? options[0]?.branch ?? "";
  const setBranch = setSelectedBranch;


  return (
    <AppLayout>
      <div className="max-w-5xl min-w-0 w-full mx-auto space-y-5 pb-16">
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Documents &amp; Compliance</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Staff induction, company and branch documents, licences and inspection readiness.
          </p>
        </header>

        {!tenantReady || isLoading ? <p role="status">Loading your compliance workspace…</p> : isError ? (
          <div role="alert" className="rounded-xl border p-4 space-y-2"><p>Could not load your locations. Please retry before working with compliance records.</p><Button onClick={() => void refetch()}>Try again</Button></div>
        ) : <>
        <ComplianceAttentionPanel />

        {needsReview.length > 0 && <BranchReviewNotice items={needsReview} />}

        <Tabs value={section} onValueChange={changeSection} className="min-w-0 space-y-4">
          <div className="sm:hidden space-y-2">
            <label htmlFor="compliance-section" className="text-sm font-medium">Choose a section</label>
            <Select value={section} onValueChange={changeSection}>
              <SelectTrigger id="compliance-section" className="min-h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{COMPLIANCE_SECTIONS.map(([key, title]) => <SelectItem key={key} value={key}>{title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="hidden sm:block overflow-x-auto">
          <TabsList className="flex w-max min-w-full flex-nowrap h-auto justify-start">
            <TabsTrigger value="induction">Staff induction</TabsTrigger>
            <TabsTrigger value="library">Document library</TabsTrigger>
            <TabsTrigger value="branch">Branch compliance</TabsTrigger>
            <TabsTrigger value="certificates">Certificates &amp; expiry</TabsTrigger>
            <TabsTrigger value="inspection">Inspection file</TabsTrigger>
            <TabsTrigger value="allergen">Allergen training</TabsTrigger>
            <TabsTrigger value="incidents">Incident book</TabsTrigger>
          </TabsList>
          </div>

          <TabsContent value="induction" className="space-y-4">
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <h2 className="font-semibold">Help each starter take the next step</h2>
              <p className="text-sm text-muted-foreground">Send the relevant approved pack, monitor their reading and assessment, then record practical sign-off. Staff details and contract approval remain separate checks.</p>
            </div>
            <Accordion type="multiple" defaultValue={["staff"]} className="space-y-3">
              <AccordionItem value="staff" className="rounded-xl border px-4">
                <AccordionTrigger>1. Send and monitor staff induction</AccordionTrigger>
                <AccordionContent><StaffInductionSection /></AccordionContent>
              </AccordionItem>
              <AccordionItem value="lessons" className="rounded-xl border px-4">
                <AccordionTrigger>2. Review and release phone-friendly lessons</AccordionTrigger>
                <AccordionContent><InductionLessonsPanel /></AccordionContent>
              </AccordionItem>
              <AccordionItem value="alcohol" className="rounded-xl border px-4">
                <AccordionTrigger>3. Check alcohol sales authorisations</AccordionTrigger>
                <AccordionContent><AlcoholAuthorisationBoard /><div className="mt-4"><AlcoholAuthorisationsPanel /></div></AccordionContent>
              </AccordionItem>
              <AccordionItem value="reminders" className="rounded-xl border px-4">
                <AccordionTrigger>4. Manage reminders and document updates</AccordionTrigger>
                <AccordionContent><TrainingAutomationPanel /></AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="library">
            <DocumentLibrarySection />
          </TabsContent>

          <TabsContent value="branch" className="space-y-4">
            <BranchPicker options={options} value={branch} onChange={setBranch} />
            {branch && <PremisesLicencePanel branch={branch} />}
            {branch && <SiteEmergencyDetailsCard branch={branch} />}
            {branch && <BranchComplianceSection branch={branch} />}
          </TabsContent>

          <TabsContent value="certificates" className="space-y-4">
            <BranchPicker options={options} value={branch} onChange={setBranch} allowAll />
            <CertificatesSection branchFilter={branch || undefined} />
          </TabsContent>

          <TabsContent value="inspection" className="space-y-4">
            <BranchPicker options={options} value={branch} onChange={setBranch} />
            {branch && <InspectionFileSection branch={branch} />}
          </TabsContent>

          <TabsContent value="allergen" className="space-y-4">
            <AllergenTrainingReview />
          </TabsContent>

          <TabsContent value="incidents" className="space-y-4">
            <BranchPicker options={options} value={branch} onChange={setBranch} allowAll />
            <IncidentBookSection branch={branch || undefined} />
          </TabsContent>
        </Tabs>
        </>}
      </div>
    </AppLayout>
  );
}

/** Locations that look like leftovers are held back until someone confirms them. */
function BranchReviewNotice({ items }: { items: ComplianceBranchOption[] }) {
  const confirm = useConfirmBranchLocation();
  return (
    <div className="rounded-xl border border-warning/40 bg-warning/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">Locations needing review</p>
          <p className="text-xs text-muted-foreground">
            These locations are not offered when filing compliance records. Nothing has been deleted —
            confirm one to start using it again.
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {items.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-3 rounded-lg bg-card border border-border px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm truncate">{b.display_name || b.branch}</p>
              {b.review_note && <p className="text-xs text-muted-foreground">{b.review_note}</p>}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await confirm.mutateAsync(b.id);
                toast.success("Location confirmed — it can now be used for compliance records");
              }}
            >
              Confirm
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BranchPicker({
  options, value, onChange, allowAll,
}: {
  options: ComplianceBranchOption[];
  value: string;
  onChange: (v: string) => void;
  allowAll?: boolean;
}) {
  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add your restaurant locations in Settings to use branch compliance files.
      </p>
    );
  }
  return (
    <Select value={value || (allowAll ? "__all" : "")} onValueChange={(v) => onChange(v === "__all" ? "" : v)}>
      <SelectTrigger className="w-full sm:w-[240px]"><SelectValue placeholder="Choose branch" /></SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value="__all">All branches</SelectItem>}
        {options.map((b) => (
          <SelectItem key={b.id} value={b.branch}>{b.display_name || b.branch}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
