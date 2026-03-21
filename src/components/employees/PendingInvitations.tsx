import { useState } from "react";
import { Mail, RotateCw, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useInvitations, useResendInvitation } from "@/hooks/useInvitations";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function PendingInvitations() {
  const { data: invitations = [], isLoading } = useInvitations();
  const resend = useResendInvitation();
  const [resendingId, setResendingId] = useState<string | null>(null);

  const pending = invitations.filter(
    (inv: any) => inv.status === "pending" || !inv.status
  );

  if (isLoading || pending.length === 0) return null;

  const handleResend = async (inv: any) => {
    setResendingId(inv.id);
    try {
      await resend.mutateAsync({ email: inv.email, invitationId: inv.id });
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="rounded-lg border border-border/70 bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 bg-muted/30">
        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">
          Pending Invitations
        </span>
        <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5">
          {pending.length}
        </Badge>
      </div>
      <div className="divide-y divide-border/40">
        {pending.map((inv: any) => (
          <div
            key={inv.id}
            className="flex items-center gap-3 px-3 py-2.5 text-sm"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {inv.email}
              </p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="h-2.5 w-2.5" />
                {format(new Date(inv.created_at), "d MMM yyyy, HH:mm")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2.5 text-xs gap-1.5 shrink-0",
                "hover:bg-primary/10 hover:text-primary"
              )}
              disabled={resendingId === inv.id}
              onClick={() => handleResend(inv)}
            >
              {resendingId === inv.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RotateCw className="h-3 w-3" />
              )}
              Resend
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
