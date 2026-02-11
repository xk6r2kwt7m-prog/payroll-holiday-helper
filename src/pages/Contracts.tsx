import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FilePlus, FileCheck } from "lucide-react";
import { ContractFormDialog } from "@/components/contracts/ContractFormDialog";
import { SignedContractsList } from "@/components/contracts/SignedContractsList";

export default function Contracts() {
  const [generateOpen, setGenerateOpen] = useState(false);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contracts</h1>
            <p className="text-muted-foreground">
              Generate new employment contracts and manage signed copies
            </p>
          </div>
          <Button onClick={() => setGenerateOpen(true)}>
            <FilePlus className="h-4 w-4" />
            Generate New Contract
          </Button>
        </div>

        <Tabs defaultValue="signed" className="space-y-4">
          <TabsList>
            <TabsTrigger value="signed" className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Signed Contracts
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
