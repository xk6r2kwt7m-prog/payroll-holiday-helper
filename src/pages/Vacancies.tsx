import { useState } from "react";
import { Plus, Briefcase, Eye, Pause, Play, X, MoreVertical, Edit } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOwnVacancies, useUpdateVacancy, type Vacancy } from "@/hooks/useVacancies";
import { useVacancyApplications, type Application } from "@/hooks/useVacancies";
import { useAuth } from "@/hooks/useAuth";
import { VacancyFormDialog } from "@/components/talent/VacancyFormDialog";
import { TalentInbox } from "@/components/talent/TalentInbox";
import { toast } from "sonner";

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
              Inbox
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
              <Card key={v.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setSelectedVacancyId(selectedVacancyId === v.id ? null : v.id)}>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{v.title}</h3>
                        <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[v.status] || ""}`}>
                          {v.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[v.location, v.country, v.employment_type].filter(Boolean).join(" • ")}
                        {v.hourly_rate_min && ` • £${v.hourly_rate_min}${v.hourly_rate_max ? `–£${v.hourly_rate_max}` : ""}/hr`}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditVacancy(v)}>
                          <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        {v.status === "draft" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(v.id, "published")}>
                            <Play className="h-3.5 w-3.5 mr-2" /> Publish
                          </DropdownMenuItem>
                        )}
                        {v.status === "published" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(v.id, "paused")}>
                            <Pause className="h-3.5 w-3.5 mr-2" /> Pause
                          </DropdownMenuItem>
                        )}
                        {v.status === "paused" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(v.id, "published")}>
                            <Play className="h-3.5 w-3.5 mr-2" /> Resume
                          </DropdownMenuItem>
                        )}
                        {v.status !== "closed" && v.status !== "filled" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(v.id, "closed")} className="text-destructive">
                            <X className="h-3.5 w-3.5 mr-2" /> Close
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Applicants panel */}
                  {selectedVacancyId === v.id && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <VacancyApplicantsPanel vacancyId={v.id} />
                    </div>
                  )}
                </CardContent>
              </Card>
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

function VacancyApplicantsPanel({ vacancyId }: { vacancyId: string }) {
  const { data: applications = [], isLoading } = useVacancyApplications(vacancyId);

  const statusOrder = ["applied", "in_review", "interviewing", "trial", "hired", "rejected", "withdrawn"];
  const statusColors: Record<string, string> = {
    applied: "bg-blue-500/10 text-blue-700",
    in_review: "bg-amber-500/10 text-amber-700",
    interviewing: "bg-purple-500/10 text-purple-700",
    trial: "bg-cyan-500/10 text-cyan-700",
    hired: "bg-emerald-500/10 text-emerald-700",
    rejected: "bg-muted text-muted-foreground",
    withdrawn: "bg-muted text-muted-foreground",
  };

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading applicants...</p>;
  if (applications.length === 0) return <p className="text-xs text-muted-foreground">No applications yet</p>;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{applications.length} applicant{applications.length !== 1 ? "s" : ""}</p>
      {applications.map((app) => (
        <div key={app.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border">
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {app.talent_profile?.employee?.forename} {app.talent_profile?.employee?.surname_initial}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {app.talent_profile?.preferred_roles?.join(", ") || "No roles specified"}
              {app.talent_profile?.years_experience ? ` • ${app.talent_profile.years_experience}y exp` : ""}
            </p>
          </div>
          <Badge variant="outline" className={`text-[10px] shrink-0 capitalize ${statusColors[app.status] || ""}`}>
            {app.status.replace(/_/g, " ")}
          </Badge>
        </div>
      ))}
    </div>
  );
}

export default Vacancies;
