import { useState } from "react";
import { ClipboardList, MessageSquare, Building2, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMyApplications, type Application } from "@/hooks/useVacancies";
import { TalentConversation } from "./TalentConversation";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const STATUS_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  applied: { label: "Applied", color: "bg-blue-500/10 text-blue-700 border-blue-200", emoji: "📤" },
  in_review: { label: "In Review", color: "bg-amber-500/10 text-amber-700 border-amber-200", emoji: "👀" },
  interviewing: { label: "Interview", color: "bg-purple-500/10 text-purple-700 border-purple-200", emoji: "📅" },
  trial: { label: "Trial Shift", color: "bg-cyan-500/10 text-cyan-700 border-cyan-200", emoji: "🏪" },
  hired: { label: "Hired!", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200", emoji: "🎉" },
  rejected: { label: "Not selected", color: "bg-muted text-muted-foreground", emoji: "—" },
  withdrawn: { label: "Withdrawn", color: "bg-muted text-muted-foreground", emoji: "↩️" },
};

export function MyApplications() {
  const { data: applications = [], isLoading } = useMyApplications();
  const [openConv, setOpenConv] = useState<{ convId: string; companyName: string; vacancyTitle: string; appId: string; appStatus: string } | null>(null);

  // Batch-fetch conversations for all apps
  const appIds = applications.map((a) => a.id);
  const { data: conversations = [] } = useQuery({
    queryKey: ["my-app-conversations", appIds],
    queryFn: async () => {
      if (appIds.length === 0) return [];
      const { data, error } = await supabase
        .from("talent_conversations")
        .select("id, application_id")
        .in("application_id", appIds);
      if (error) throw error;
      return (data || []) as { id: string; application_id: string }[];
    },
    enabled: appIds.length > 0,
  });
  const convByAppId = Object.fromEntries(conversations.map((c) => [c.application_id, c.id]));

  if (openConv) {
    return (
      <TalentConversation
        conversationId={openConv.convId}
        otherPartyName={openConv.companyName}
        vacancyTitle={openConv.vacancyTitle}
        applicationId={openConv.appId}
        applicationStatus={openConv.appStatus}
        senderType="worker"
        onBack={() => setOpenConv(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4"><div className="h-5 w-40 bg-muted rounded mb-2" /><div className="h-4 w-28 bg-muted rounded" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No applications yet</p>
          <p className="text-xs text-muted-foreground mt-1">Browse the Jobs tab and apply to vacancies</p>
        </CardContent>
      </Card>
    );
  }

  // Group: active first, then terminal
  const active = applications.filter((a) => !["rejected", "withdrawn"].includes(a.status));
  const terminal = applications.filter((a) => ["rejected", "withdrawn"].includes(a.status));

  return (
    <div className="space-y-4">
      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">Active ({active.length})</p>
          {active.map((app) => (
            <ApplicationCard key={app.id} app={app} convId={convByAppId[app.id]} onOpenConv={setOpenConv} />
          ))}
        </div>
      )}
      {terminal.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Past ({terminal.length})</p>
          {terminal.map((app) => (
            <ApplicationCard key={app.id} app={app} convId={convByAppId[app.id]} onOpenConv={setOpenConv} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicationCard({ app, convId, onOpenConv }: {
  app: Application;
  convId?: string;
  onOpenConv: (conv: any) => void;
}) {
  const config = STATUS_CONFIG[app.status] || STATUS_CONFIG.applied;
  const isTerminal = app.status === "withdrawn" || app.status === "rejected";
  const vacancyTitle = app.vacancy?.title || "Position";
  const companyName = app.vacancy?.company_name || "Company";

  return (
    <Card
      className={cn(
        "transition-shadow",
        convId && !isTerminal && "cursor-pointer hover:shadow-sm active:bg-muted/30",
        isTerminal && "opacity-60",
      )}
      onClick={() => {
        if (convId) {
          onOpenConv({
            convId,
            companyName,
            vacancyTitle,
            appId: app.id,
            appStatus: app.status,
          });
        }
      }}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-medium truncate", isTerminal && "text-muted-foreground")}>
              {vacancyTitle}
            </p>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-0.5 truncate">
                <Building2 className="h-3 w-3 shrink-0" /> {companyName}
              </span>
              {app.vacancy?.location && (
                <span className="flex items-center gap-0.5 truncate">
                  <MapPin className="h-3 w-3 shrink-0" /> {app.vacancy.location}
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Applied {new Date(app.applied_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant="outline" className={cn("text-[10px] capitalize", config.color, app.status === "withdrawn" && "line-through")}>
              {config.emoji} {config.label}
            </Badge>
            {convId && !isTerminal && (
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
