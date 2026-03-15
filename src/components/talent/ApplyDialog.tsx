import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { useApplyToVacancy } from "@/hooks/useVacancies";
import { useOwnTalentProfile } from "@/hooks/useTalentPool";
import { toast } from "sonner";
import type { Vacancy } from "@/hooks/useVacancies";

interface ApplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vacancy: Vacancy;
}

export function ApplyDialog({ open, onOpenChange, vacancy }: ApplyDialogProps) {
  const [coverMessage, setCoverMessage] = useState("");
  const { data: profile } = useOwnTalentProfile();
  const applyMutation = useApplyToVacancy();

  const handleApply = async () => {
    if (!profile) {
      toast.error("Please set up your talent profile first");
      return;
    }

    try {
      await applyMutation.mutateAsync({
        vacancy_id: vacancy.id,
        talent_profile_id: profile.id,
        cover_message: coverMessage || undefined,
      });
      toast.success("Application sent!");
      onOpenChange(false);
      setCoverMessage("");
    } catch (err: any) {
      if (err?.message?.includes("duplicate") || err?.code === "23505") {
        toast.error("You've already applied to this vacancy");
      } else {
        toast.error("Failed to apply");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply to {vacancy.title}</DialogTitle>
          <DialogDescription>
            at {vacancy.company_name || "Company"} • {vacancy.location || "Location not specified"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!profile && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-sm text-destructive">
                You need a talent profile to apply. Go to Talent Pool → My Profile to set one up.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Quick message (optional)</Label>
            <Textarea
              value={coverMessage}
              onChange={(e) => setCoverMessage(e.target.value)}
              rows={3}
              placeholder="Hi, I'm interested in this position because..."
              maxLength={500}
            />
            <p className="text-[10px] text-muted-foreground text-right">{coverMessage.length}/500</p>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
            <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              Your name and profile summary will be shared. Contact details stay private until you choose to share them.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleApply} disabled={applyMutation.isPending || !profile}>
            {applyMutation.isPending ? "Applying..." : "Apply — Free"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
