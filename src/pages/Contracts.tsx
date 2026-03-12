import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FilePlus, FileCheck, FileText } from "lucide-react";
import { ContractFormDialog } from "@/components/contracts/ContractFormDialog";
import { SignedContractsList } from "@/components/contracts/SignedContractsList";
import { useI18n } from "@/hooks/useI18n";

export default function Contracts() {
  const [generateOpen, setGenerateOpen] = useState(false);
  const { t } = useI18n();

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

        <Tabs defaultValue="signed" className="space-y-4">
          <TabsList>
            <TabsTrigger value="signed" className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              {t("contracts.signed_contracts")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="signed">
            <SignedContractsList />
          </TabsContent>
        </Tabs>
      </div>

      <ContractFormDialog open={generateOpen} onOpenChange={setGenerateOpen} />
    </AppLayout>
  );
}