import { useState } from "react";
import { MessageSquare, Inbox as InboxIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useEmployerConversations, useWorkerConversations, type TalentConversation as ConvType } from "@/hooks/useTalentConversations";
import { TalentConversation } from "./TalentConversation";

interface TalentInboxProps {
  mode: "employer" | "worker";
}

export function TalentInbox({ mode }: TalentInboxProps) {
  // Only fetch the relevant query for the active mode
  const employerQuery = useEmployerConversations(mode === "employer");
  const workerQuery = useWorkerConversations(mode === "worker");

  const conversations = mode === "employer"
    ? (employerQuery.data || [])
    : (workerQuery.data || []);
  const isLoading = mode === "employer" ? employerQuery.isLoading : workerQuery.isLoading;

  const [selectedConv, setSelectedConv] = useState<ConvType | null>(null);

  if (selectedConv) {
    return (
      <TalentConversation
        conversationId={selectedConv.id}
        otherPartyName={selectedConv.other_party_name || "Unknown"}
        vacancyTitle={selectedConv.vacancy_title}
        applicationId={
          (selectedConv as any).talent_applications?.id ||
          (selectedConv as any).application_id
        }
        applicationStatus={
          (selectedConv as any).talent_applications?.status || undefined
        }
        senderType={mode}
        onBack={() => setSelectedConv(null)}
      />
    );
  }

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <InboxIcon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">
          {mode === "employer" ? "Applicant Messages" : "My Messages"}
        </h3>
        {totalUnread > 0 && (
          <Badge variant="destructive" className="text-[9px] h-5 px-1.5">
            {totalUnread} new
          </Badge>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-3">
                <div className="h-4 w-32 bg-muted rounded mb-2" />
                <div className="h-3 w-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && conversations.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No conversations yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              {mode === "employer"
                ? "Messages from applicants will appear here"
                : "Apply to vacancies to start conversations"}
            </p>
          </CardContent>
        </Card>
      )}

      {conversations.map((conv) => {
        const appStatus = (conv as any).talent_applications?.status;
        const isTerminal = appStatus === "withdrawn" || appStatus === "rejected";

        return (
          <Card
            key={conv.id}
            className={cn(
              "cursor-pointer hover:shadow-sm transition-shadow active:bg-muted/30",
              (conv.unread_count || 0) > 0 && "border-primary/30",
              isTerminal && "opacity-60",
            )}
            onClick={() => setSelectedConv(conv)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      "text-sm truncate",
                      (conv.unread_count || 0) > 0 ? "font-semibold" : "font-medium"
                    )}>
                      {conv.other_party_name}
                    </p>
                    {(conv.unread_count || 0) > 0 && (
                      <Badge variant="destructive" className="text-[9px] h-4 px-1 shrink-0">
                        {conv.unread_count}
                      </Badge>
                    )}
                    {appStatus && (
                      <Badge variant="outline" className={cn(
                        "text-[9px] capitalize shrink-0",
                        isTerminal && "line-through text-muted-foreground",
                      )}>
                        {appStatus.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </div>
                  {conv.vacancy_title && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      Re: {conv.vacancy_title}
                    </p>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(conv.updated_at).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
