import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ShieldCheck } from "lucide-react";
import { ComplianceAttentionPanel } from "@/components/compliance/ComplianceAttentionPanel";
import { StaffInductionSection } from "@/components/compliance/StaffInductionSection";
import { DocumentLibrarySection } from "@/components/compliance/DocumentLibrarySection";
import { BranchComplianceSection } from "@/components/compliance/BranchComplianceSection";
import { CertificatesSection } from "@/components/compliance/CertificatesSection";
import { InspectionFileSection } from "@/components/compliance/InspectionFileSection";
import { AlcoholAuthorisationsPanel } from "@/components/compliance/AlcoholAuthorisationsPanel";
import { SiteEmergencyDetailsCard } from "@/components/compliance/SiteEmergencyDetailsCard";
import { useTenantBranches } from "@/hooks/useBranches";

export default function DocumentsCompliance() {
  const { data: branches = [] } = useTenantBranches();
  const [branch, setBranch] = useState<string>("");

  useEffect(() => {
    if (!branch && branches.length > 0) setBranch(branches[0]);
  }, [branches, branch]);

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

        <Tabs defaultValue="induction" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="induction">Staff induction</TabsTrigger>
            <TabsTrigger value="library">Document library</TabsTrigger>
            <TabsTrigger value="branch">Branch compliance</TabsTrigger>
            <TabsTrigger value="certificates">Certificates &amp; expiry</TabsTrigger>
            <TabsTrigger value="inspection">Inspection file</TabsTrigger>
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
            <BranchPicker branches={branches} value={branch} onChange={setBranch} />
            {branch && <SiteEmergencyDetailsCard branch={branch} />}
            {branch && <BranchComplianceSection branch={branch} />}
          </TabsContent>

          <TabsContent value="certificates" className="space-y-4">
            <BranchPicker branches={branches} value={branch} onChange={setBranch} allowAll />
            <CertificatesSection branchFilter={branch || undefined} />
          </TabsContent>

          <TabsContent value="inspection" className="space-y-4">
            <BranchPicker branches={branches} value={branch} onChange={setBranch} />
            {branch && <InspectionFileSection branch={branch} />}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function BranchPicker({
  branches, value, onChange, allowAll,
}: {
  branches: string[];
  value: string;
  onChange: (v: string) => void;
  allowAll?: boolean;
}) {
  if (branches.length === 0) {
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
        {branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
