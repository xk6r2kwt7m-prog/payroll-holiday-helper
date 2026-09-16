import { useEffect, useState } from "react";
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
import { SiteEmergencyDetailsCard } from "@/components/compliance/SiteEmergencyDetailsCard";
import {
  useComplianceBranches, useConfirmBranchLocation, type ComplianceBranchOption,
} from "@/hooks/useComplianceBranches";

export default function DocumentsCompliance() {
  const { data: branchData } = useComplianceBranches();
  const options = branchData?.selectable ?? [];
  const needsReview = branchData?.needsReview ?? [];
  const [branch, setBranch] = useState<string>("");

  useEffect(() => {
    if (!branch && options.length > 0) setBranch(options[0].branch);
  }, [options, branch]);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-5 pb-16">
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Documents &amp; Compliance</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Staff induction, company and branch documents, licences and inspection readiness.
          </p>
        </header>

        <ComplianceAttentionPanel />

        {needsReview.length > 0 && <BranchReviewNotice items={needsReview} />}

        <Tabs defaultValue="induction" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="induction">Staff induction</TabsTrigger>
            <TabsTrigger value="library">Document library</TabsTrigger>
            <TabsTrigger value="branch">Branch compliance</TabsTrigger>
            <TabsTrigger value="certificates">Certificates &amp; expiry</TabsTrigger>
            <TabsTrigger value="inspection">Inspection file</TabsTrigger>
            <TabsTrigger value="incidents">Incident book</TabsTrigger>
          </TabsList>

          <TabsContent value="induction" className="space-y-6">
            <StaffInductionSection />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Alcohol sales authorisations
              </p>
              <AlcoholAuthorisationsPanel />
            </div>
          </TabsContent>

          <TabsContent value="library">
            <DocumentLibrarySection />
          </TabsContent>

          <TabsContent value="branch" className="space-y-4">
            <BranchPicker options={options} value={branch} onChange={setBranch} />
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
        </Tabs>
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
      <SelectTrigger className="w-[240px]"><SelectValue placeholder="Choose branch" /></SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value="__all">All branches</SelectItem>}
        {options.map((b) => (
          <SelectItem key={b.id} value={b.branch}>{b.display_name || b.branch}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
