import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FilePlus, FileCheck, FileText, ClipboardCheck, Upload } from "lucide-react";
import { ContractFormDialog } from "@/components/contracts/ContractFormDialog";
import { UploadExistingContractDialog } from "@/components/contracts/UploadExistingContractDialog";
import { SignedContractsList } from "@/components/contracts/SignedContractsList";
import { TestStaffCard } from "@/components/contracts/TestStaffCard";
import { useI18n } from "@/hooks/useI18n";
import { useTenantGuard } from "@/hooks/useTenantGuard";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function Contracts() {
  const [searchParams] = useSearchParams();
  const preselectedEmployeeId = searchParams.get("employee") || undefined;
  const [generateOpen, setGenerateOpen] = useState(Boolean(preselectedEmployeeId));
  const { t } = useI18n();

  const resetPageState = useCallback(() => {
    setGenerateOpen(false);
  }, []);
  const { tenantReady } = useTenantGuard(resetPageState);
  const { tenantId } = useTenant();

  // Read-only count of contracts signed by staff and waiting on the admin.
  const { data: reviewCount = 0 } = useQuery({
    queryKey: ["contracts_awaiting_review", tenantId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("employee_documents")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId!)
        .eq("document_type", "contract")
        .eq("contract_state", "employee_signed");
      if (error) throw error;
      return count || 0;
    },
    enabled: !!tenantId,
  });

  if (!tenantReady) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-slide-in-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t("contracts.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("contracts.subtitle")}</p>
            </div>
          </div>
          <Button onClick={() => setGenerateOpen(true)} className="gradient-primary w-full sm:w-auto">
            <FilePlus className="h-4 w-4" />
            {t("contracts.new_contract")}
          </Button>
        </div>

        <TestStaffCard />

        <Tabs defaultValue={reviewCount ? "review" : "signed"} className="space-y-4">
          <TabsList>
            <TabsTrigger value="review" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Awaiting your review
              {!!reviewCount && (
                <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
                  {reviewCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="signed" className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              {t("contracts.signed_contracts")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="review">
            <SignedContractsList
              onlyStates={["employee_signed"]}
              emptyTitle="Nothing waiting for you"
              emptyDescription="Contracts signed by staff appear here for you to review, sign and send back."
            />
          </TabsContent>
          <TabsContent value="signed">
            <SignedContractsList />
          </TabsContent>
        </Tabs>
      </div>

      <ContractFormDialog open={generateOpen} onOpenChange={setGenerateOpen} preselectedEmployeeId={preselectedEmployeeId} />
    </AppLayout>
  );
}