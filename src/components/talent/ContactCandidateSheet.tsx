import { useState } from "react";
import { MessageSquare, Send, Coins, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { useCreditWallet, useUnlockContact } from "@/hooks/useOutboundContact";
import { CreditPurchaseSheet } from "./CreditPurchaseSheet";
import { type TalentProfile } from "@/hooks/useTalentPool";
import { toast } from "sonner";

interface ContactCandidateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: TalentProfile;
  onContactOpened?: (conversationId: string) => void;
}

export function ContactCandidateSheet({
  open,
  onOpenChange,
  profile,
  onContactOpened,
}: ContactCandidateSheetProps) {
  const { data: wallet } = useCreditWallet();
  const unlock = useUnlockContact();
  const [introMessage, setIntroMessage] = useState("");
  const [showPurchase, setShowPurchase] = useState(false);

  const balance = wallet?.balance || 0;
  const hasCredits = balance > 0;

  const handleUnlock = async () => {
    try {
      const result = await unlock.mutateAsync({
        talentProfileId: profile.id,
        introMessage: introMessage.trim() || undefined,
      });

      if (result.error === "no_credits") {
        setShowPurchase(true);
        return;
      }

      if (result.already_unlocked) {
        toast.info("You've already contacted this candidate");
      } else {
        toast.success("Contact request sent! Credit used.");
      }

      onOpenChange(false);
      if (result.conversation_id) {
        onContactOpened?.(result.conversation_id);
      }
    } catch (e: any) {
      if (e.message?.includes("not available")) {
        toast.error("This candidate is not available for contact");
      } else {
        toast.error("Failed to contact candidate");
      }
    }
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Contact {profile.employee?.forename || "Candidate"}
            </DrawerTitle>
            <DrawerDescription>
              Send a direct message to this candidate. They can choose to accept or decline.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 space-y-4">
            {/* Candidate summary */}
            <div className="rounded-lg border border-border p-3 bg-muted/30">
              <p className="font-medium text-sm">
                {profile.employee?.forename} {profile.employee?.surname_initial}
              </p>
              {profile.preferred_roles?.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {profile.preferred_roles.join(", ")}
                </p>
              )}
              {profile.preferred_locations?.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  📍 {profile.preferred_locations.join(", ")}
                </p>
              )}
            </div>

            {/* Intro message */}
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Intro message (optional)
              </label>
              <Textarea
                value={introMessage}
                onChange={(e) => setIntroMessage(e.target.value)}
                placeholder="Hi! We're looking for experienced staff and your profile stood out..."
                rows={3}
                className="text-sm resize-none"
              />
            </div>

            {/* Credit balance */}
            <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-card">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Credit Balance</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={hasCredits ? "default" : "destructive"}
                  className="text-xs"
                >
                  {balance} credit{balance !== 1 ? "s" : ""}
                </Badge>
                {!hasCredits && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setShowPurchase(true)}
                  >
                    Buy Credits
                  </Button>
                )}
              </div>
            </div>
          </div>

          <DrawerFooter className="pt-4">
            {hasCredits ? (
              <Button
                onClick={handleUnlock}
                disabled={unlock.isPending}
                className="w-full gap-2"
              >
                <Send className="h-4 w-4" />
                {unlock.isPending ? "Sending..." : "Use 1 Credit · Contact Candidate"}
              </Button>
            ) : (
              <Button
                onClick={() => setShowPurchase(true)}
                className="w-full gap-2"
              >
                <Lock className="h-4 w-4" />
                Get Credits to Contact
              </Button>
            )}
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <CreditPurchaseSheet
        open={showPurchase}
        onOpenChange={setShowPurchase}
        onPurchased={() => {
          // After purchase, user can now unlock
        }}
      />
    </>
  );
}
