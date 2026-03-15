import { useState } from "react";
import { Coins, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { useCreditPacks, type CreditPack } from "@/hooks/useOutboundContact";
import { useCreatePurchase, useFinalisePurchase } from "@/hooks/useTalentBilling";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CreditPurchaseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchased?: (balance: number) => void;
}

export function CreditPurchaseSheet({ open, onOpenChange, onPurchased }: CreditPurchaseSheetProps) {
  const { data: packs = [], isLoading } = useCreditPacks();
  const createPurchase = useCreatePurchase();
  const finalise = useFinalisePurchase();
  const [selectedPack, setSelectedPack] = useState<string | null>(null);

  const handlePurchase = async () => {
    if (!selectedPack) return;
    try {
      // Step 1: Create pending purchase
      const pending = await createPurchase.mutateAsync(selectedPack);

      // Step 2: In test mode, immediately finalise as paid
      // Future Stripe flow: redirect to Checkout, webhook calls finalise
      const result = await finalise.mutateAsync({
        purchaseId: pending.purchase_id,
        status: "paid",
      });

      toast.success(`${result.credits_added || pending.credits} contacts added to your wallet`);
      onPurchased?.(result.wallet_balance || 0);
      onOpenChange(false);
      setSelectedPack(null);
    } catch {
      toast.error("Purchase failed. Please try again.");
    }
  };

  const isPending = createPurchase.isPending || finalise.isPending;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Contact Credits
          </DrawerTitle>
          <DrawerDescription>
            Purchase credits to reach out to passive candidates directly
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-5 w-24 bg-muted rounded mb-2" />
                    <div className="h-4 w-16 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            packs.map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                selected={selectedPack === pack.id}
                onSelect={() => setSelectedPack(pack.id)}
              />
            ))
          )}
        </div>

        <DrawerFooter className="pt-4">
          <Button
            onClick={handlePurchase}
            disabled={!selectedPack || isPending}
            className="w-full gap-2"
          >
            <Zap className="h-4 w-4" />
            {isPending ? "Processing..." : "Purchase Credits"}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
          <p className="text-[10px] text-muted-foreground text-center">
            Test mode: credits granted immediately. Stripe payment will be added when connected.
          </p>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function PackCard({
  pack,
  selected,
  onSelect,
}: {
  pack: CreditPack;
  selected: boolean;
  onSelect: () => void;
}) {
  const perContact = (pack.price_amount / pack.credits).toFixed(2);
  const isBestValue = pack.credits >= 30;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all active:scale-[0.98]",
        selected
          ? "border-primary ring-2 ring-primary/20 shadow-md"
          : "hover:border-primary/40"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}>
          {selected ? <Check className="h-5 w-5" /> : <Coins className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">{pack.credits} contacts</p>
            {isBestValue && (
              <Badge className="text-[9px] h-4 bg-primary/10 text-primary border-primary/20">
                Best Value
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            £{perContact}/contact · Valid {pack.validity_days} days
          </p>
        </div>
        <p className="font-bold text-base shrink-0">£{pack.price_amount.toFixed(2)}</p>
      </CardContent>
    </Card>
  );
}
