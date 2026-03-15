import { Building2, Check, X, Ban, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useWorkerContactRequests, useRespondToContact, type ContactUnlock } from "@/hooks/useOutboundContact";
import { toast } from "sonner";

interface ContactRequestsInboxProps {
  onOpenConversation?: (conversationId: string) => void;
}

export function ContactRequestsInbox({ onOpenConversation }: ContactRequestsInboxProps) {
  const { data: requests = [], isLoading } = useWorkerContactRequests();
  const respond = useRespondToContact();

  const handleRespond = async (unlock: ContactUnlock, response: "accepted" | "ignored" | "blocked" | "reported") => {
    try {
      await respond.mutateAsync({ unlockId: unlock.id, response });
      if (response === "accepted") {
        toast.success("Connection accepted!");
        if (unlock.conversation_id) {
          onOpenConversation?.(unlock.conversation_id);
        }
      } else if (response === "blocked") {
        toast.info("Company blocked. They won't be able to contact you again.");
      } else if (response === "reported") {
        toast.info("Reported. We'll review this contact request.");
      } else {
        toast.info("Request ignored");
      }
    } catch {
      toast.error("Failed to respond");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-5 w-32 bg-muted rounded mb-2" />
              <div className="h-4 w-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No pending contact requests</p>
          <p className="text-xs text-muted-foreground mt-1">
            When companies want to connect, requests will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Contact Requests</h3>
        <Badge variant="destructive" className="text-[9px] h-5 px-1.5">
          {requests.length} new
        </Badge>
      </div>

      {requests.map((req) => (
        <ContactRequestCard
          key={req.id}
          request={req}
          onRespond={(response) => handleRespond(req, response)}
          isPending={respond.isPending}
        />
      ))}
    </div>
  );
}

function ContactRequestCard({
  request,
  onRespond,
  isPending,
}: {
  request: ContactUnlock;
  onRespond: (response: "accepted" | "ignored" | "blocked" | "reported") => void;
  isPending: boolean;
}) {
  const expiresAt = new Date(request.expires_at);
  const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm">{request.company_name}</p>
            <p className="text-xs text-muted-foreground">
              wants to connect with you
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {daysLeft}d left
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={() => onRespond("accepted")}
            disabled={isPending}
          >
            <Check className="h-3.5 w-3.5" />
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => onRespond("ignored")}
            disabled={isPending}
          >
            <X className="h-3.5 w-3.5" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                <Ban className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Block this company?</AlertDialogTitle>
                <AlertDialogDescription>
                  {request.company_name} will no longer be able to contact you. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onRespond("blocked")}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Block
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                <Flag className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Report this company?</AlertDialogTitle>
                <AlertDialogDescription>
                  We'll review this contact request. The company will be blocked from contacting you.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onRespond("reported")}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Report & Block
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
