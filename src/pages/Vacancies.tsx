import { useState, useMemo } from "react";
import { Plus, Briefcase, Pause, Play, X, MoreVertical, Edit, MessageSquare, Users, ChevronDown, ChevronUp } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOwnVacancies, useUpdateVacancy, useVacancyApplications, type Vacancy, type Application } from "@/hooks/useVacancies";
import { useAuth } from "@/hooks/useAuth";
import { VacancyFormDialog } from "@/components/talent/VacancyFormDialog";
import { TalentInbox } from "@/components/talent/TalentInbox";
import { TalentConversation } from "@/components/talent/TalentConversation";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  paused: "bg-amber-500/10 text-amber-700 border-amber-200",
  closed: "bg-muted text-muted-foreground",
  filled: "bg-primary/10 text-primary border-primary/20",
};

const Vacancies = () => {
  const { isAdmin } = useAuth();
  const { data: vacancies = [], isLoading } = useOwnVacancies();
  const updateVacancy = useUpdateVacancy();
  const [createOpen, setCreateOpen] = useState(false);
  const [editVacancy, setEditVacancy] = useState<Vacancy | null>(null);
  const [selectedVacancyId, setSelectedVacancyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("vacancies");
  const [openConv, setOpenConv] = useState<{
    id: string; name: string; vacancyTitle: string;
    applicationId: string; applicationStatus: string;
    summary?: string; roles?: string[];
  } | null>(null);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const updates: any = { id, status };
      if (status === "published") updates.published_at = new Date().toISOString();
      await updateVacancy.mutateAsync(updates);
      toast.success(`Vacancy ${status}`);
    } catch {
      toast.error("Failed to update vacancy");
    }
  };

  if (openConv) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto">
          <TalentConversation
            conversationId={openConv.id}
            otherPartyName={openConv.name}
            vacancyTitle={openConv.vacancyTitle}
            applicationId={openConv.applicationId}
            applicationStatus={openConv.applicationStatus}
            senderType="employer"
            onBack={() => setOpenConv(null)}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Briefcase className="h-4.5 w-4.5 text-primary" />
              </div>
              Hiring
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage vacancies and applicants</p>
          </div>
          {isAdmin && (
            <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Post Vacancy
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-9">
            <TabsTrigger value="vacancies" className="text-xs gap-1.5">
              <Briefcase className="h-3.5 w-3.5" /> Vacancies
            </TabsTrigger>
            <TabsTrigger value="inbox" className="text-xs gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Inbox
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vacancies" className="mt-4 space-y-3">
            {isLoading && (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-5 w-40 bg-muted rounded" /></CardContent></Card>
                ))}
              </div>
            )}

            {!isLoading && vacancies.length === 0 && (
              <Card>
                <CardContent className="p-10 text-center">
                  <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No vacancies yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Post your first vacancy to start hiring</p>
                  <Button size="sm" className="mt-4 gap-1.5" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4" /> Post Vacancy
                  </Button>
                </CardContent>
              </Card>
            )}

            {vacancies.map((v) => (
              <VacancyRow
                key={v.id}
                vacancy={v}
                isSelected={selectedVacancyId === v.id}
                onToggle={() => setSelectedVacancyId(selectedVacancyId === v.id ? null : v.id)}
                onEdit={() => setEditVacancy(v)}
                onStatusChange={handleStatusChange}
                onOpenConversation={setOpenConv}
              />
            ))}
          </TabsContent>

          <TabsContent value="inbox" className="mt-4">
            <TalentInbox mode="employer" />
          </TabsContent>
        </Tabs>

        <VacancyFormDialog open={createOpen} onOpenChange={setCreateOpen} />
        {editVacancy && (
          <VacancyFormDialog open={true} onOpenChange={() => setEditVacancy(null)} vacancy={editVacancy} />
        )}
      </div>
    </AppLayout>
  );
};

// ─── Vacancy Row with applicant count badge ───
interface VacancyRowProps {
  vacancy: Vacancy;
  isSelected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onStatusChange: (id: string, status: string) => void;
  onOpenConversation: (conv: any) => void;
}

function VacancyRow({ vacancy: v, isSelected, onToggle, onEdit, onStatusChange, onOpenConversation }: VacancyRowProps) {
  // Lightweight count query — only when not expanded
  const { data: appCount } = useQuery({
    queryKey: ["vacancy-app-count", v.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("talent_applications")
        .select("id", { count: "exact", head: true })
        .eq("vacancy_id", v.id)
        .neq("status", "withdrawn");
      if (error) throw error;
      return count || 0;
    },
  });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 cursor-pointer active:bg-muted/30 -m-1 p-1 rounded-lg transition-colors" onClick={onToggle}>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">{v.title}</h3>
              <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[v.status] || ""}`}>
                {v.status}
              </Badge>
              {(appCount ?? 0) > 0 && (
                <Badge variant="secondary" className="text-[10px] gap-0.5 h-5">
                  <Users className="h-3 w-3" /> {appCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <p className="text-xs text-muted-foreground">
                {[v.location, v.employment_type].filter(Boolean).join(" · ")}
                {v.hourly_rate_min && ` · £${v.hourly_rate_min}${v.hourly_rate_max ? `–${v.hourly_rate_max}` : ""}/hr`}
              </p>
              {isSelected ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-3.5 w-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              {v.status === "draft" && (
                <DropdownMenuItem onClick={() => onStatusChange(v.id, "published")}>
                  <Play className="h-3.5 w-3.5 mr-2" /> Publish
                </DropdownMenuItem>
              )}
              {v.status === "published" && (
                <DropdownMenuItem onClick={() => onStatusChange(v.id, "paused")}>
                  <Pause className="h-3.5 w-3.5 mr-2" /> Pause
                </DropdownMenuItem>
              )}
              {v.status === "paused" && (
                <DropdownMenuItem onClick={() => onStatusChange(v.id, "published")}>
                  <Play className="h-3.5 w-3.5 mr-2" /> Resume
                </DropdownMenuItem>
              )}
              {v.status !== "closed" && v.status !== "filled" && (
                <DropdownMenuItem onClick={() => onStatusChange(v.id, "closed")} className="text-destructive">
                  <X className="h-3.5 w-3.5 mr-2" /> Close
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isSelected && (
          <div className="mt-4 pt-4 border-t border-border">
            <VacancyApplicantsPanel
              vacancyId={v.id}
              vacancyTitle={v.title}
              onOpenConversation={onOpenConversation}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Grouped applicant panel ───
const STATUS_GROUPS = [
  { key: "active", label: "Active", statuses: ["applied", "in_review"], color: "text-blue-700" },
  { key: "progressing", label: "Progressing", statuses: ["interviewing", "trial"], color: "text-purple-700" },
  { key: "outcome", label: "Outcome", statuses: ["hired", "rejected", "withdrawn"], color: "text-muted-foreground" },
];

const STATUS_COLORS: Record<string, string> = {
  applied: "bg-blue-500/10 text-blue-700 border-blue-200",
  in_review: "bg-amber-500/10 text-amber-700 border-amber-200",
  interviewing: "bg-purple-500/10 text-purple-700 border-purple-200",
  trial: "bg-cyan-500/10 text-cyan-700 border-cyan-200",
  hired: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  rejected: "bg-muted text-muted-foreground",
  withdrawn: "bg-muted text-muted-foreground",
};

interface ApplicantPanelProps {
  vacancyId: string;
  vacancyTitle: string;
  onOpenConversation: (conv: any) => void;
}

function VacancyApplicantsPanel({ vacancyId, vacancyTitle, onOpenConversation }: ApplicantPanelProps) {
  const { data: applications = [], isLoading } = useVacancyApplications(vacancyId);

  const appIds = applications.map((a) => a.id);
  const { data: conversations = [] } = useQuery({
    queryKey: ["application-conversations-batch", vacancyId, appIds],
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

  const grouped = useMemo(() => {
    return STATUS_GROUPS.map((g) => ({
      ...g,
      apps: applications.filter((a) => g.statuses.includes(a.status)),
    })).filter((g) => g.apps.length > 0);
  }, [applications]);

  if (isLoading) return <p className="text-xs text-muted-foreground py-2">Loading applicants...</p>;
  if (applications.length === 0) return <p className="text-xs text-muted-foreground py-2">No applications yet</p>;

  return (
    <div className="space-y-4">
      {grouped.map((group) => (
        <div key={group.key}>
          <p className={cn("text-[11px] font-semibold uppercase tracking-wider mb-2", group.color)}>
            {group.label} ({group.apps.length})
          </p>
          <div className="space-y-1.5">
            {group.apps.map((app) => {
              const convId = convByAppId[app.id];
              const displayName = `${app.talent_profile?.employee?.forename || ""} ${app.talent_profile?.employee?.surname_initial || ""}`.trim() || "Candidate";
              const isTerminal = app.status === "withdrawn" || app.status === "rejected";

              return (
                <div
                  key={app.id}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-lg border border-border transition-colors",
                    convId && !isTerminal ? "cursor-pointer hover:bg-muted/50 active:bg-muted/70" : "bg-muted/20",
                  )}
                  onClick={() => {
                    if (convId && !isTerminal) {
                      onOpenConversation({
                        id: convId,
                        name: displayName,
                        vacancyTitle,
                        applicationId: app.id,
                        applicationStatus: app.status,
                      });
                    }
                  }}
                >
                  {/* Avatar circle */}
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-semibold text-primary">
                      {(app.talent_profile?.employee?.forename?.[0] || "?").toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-medium truncate", isTerminal && "text-muted-foreground")}>
                      {displayName}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {app.talent_profile?.preferred_roles?.slice(0, 2).join(", ") || "—"}
                      {app.talent_profile?.years_experience ? ` · ${app.talent_profile.years_experience}y` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline" className={cn("text-[10px] capitalize", STATUS_COLORS[app.status] || "", app.status === "withdrawn" && "line-through")}>
                      {app.status.replace(/_/g, " ")}
                    </Badge>
                    {convId && !isTerminal && (
                      <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Vacancies;
