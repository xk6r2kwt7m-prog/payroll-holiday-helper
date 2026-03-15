import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  BookOpen, GraduationCap, Shield, Sparkles, FileText,
  Search, Clock, Copy, CheckCircle2, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WhyThisMattersPanel } from "@/components/training/WhyThisMattersPanel";
import type { StandardsMetadata } from "@/data/training-standards/types";
import { usePlatformModules, useAdaptModule, COMPLETION_TYPES } from "@/hooks/useTrainingModules";
import { LIBRARY_CATEGORIES, useQuizQuestions } from "@/hooks/useTrainingLibrary";
import { usePermission } from "@/hooks/useRolePermissions";

export function PlatformModuleBrowser() {
  const { data: modules = [], isLoading } = usePlatformModules();
  const adaptModule = useAdaptModule();
  const canManage = usePermission("manage_training");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<any>(null);

  const filtered = modules.filter(m =>
    !searchQuery || m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div className="text-center py-12 text-sm text-muted-foreground">Loading UGLŌ standard library…</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">UGLŌ Standard Library</h2>
        <p className="text-xs text-muted-foreground">
          {modules.length} professional training modules maintained by UGLŌ. Adapt any module for your company.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search modules..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-9" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map(mod => {
          const catLabel = LIBRARY_CATEGORIES.find(c => c.value === mod.category)?.label || mod.category;
          const compLabel = COMPLETION_TYPES.find(c => c.value === mod.completion_type)?.label;
          return (
            <div key={mod.id}
              className="p-4 rounded-xl bg-card border border-border shadow-sm cursor-pointer hover:border-primary/30 transition-all"
              onClick={() => setSelectedModule(mod)}
            >
              <div className="flex items-start gap-3">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                  mod.completion_type === "quiz" ? "bg-accent/10" :
                  mod.completion_type === "blended" ? "bg-primary/10" :
                  mod.completion_type === "practical_signoff" ? "bg-warning/10" : "bg-muted"
                )}>
                  {mod.completion_type === "quiz" ? <GraduationCap className="h-5 w-5 text-accent-foreground" /> :
                   mod.completion_type === "blended" ? <Sparkles className="h-5 w-5 text-primary" /> :
                   mod.completion_type === "practical_signoff" ? <Shield className="h-5 w-5 text-warning" /> :
                   <FileText className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{mod.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{mod.summary}</p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{catLabel}</Badge>
                    {compLabel && <Badge className="text-[10px] bg-muted text-muted-foreground">{compLabel}</Badge>}
                    {mod.estimated_minutes && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />{mod.estimated_minutes}m
                      </span>
                    )}
                    {mod.is_mandatory && <Badge className="text-[10px] bg-destructive/10 text-destructive">Mandatory</Badge>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No matching modules found</p>
        </div>
      )}

      {/* Detail Sheet */}
      {selectedModule && (
        <PlatformModuleDetail
          module={selectedModule}
          open={!!selectedModule}
          onOpenChange={open => !open && setSelectedModule(null)}
          onAdapt={() => {
            adaptModule.mutate(selectedModule.id, {
              onSuccess: () => setSelectedModule(null),
            });
          }}
          isAdapting={adaptModule.isPending}
          canManage={canManage}
        />
      )}
    </div>
  );
}

function PlatformModuleDetail({ module, open, onOpenChange, onAdapt, isAdapting, canManage }: {
  module: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdapt: () => void;
  isAdapting: boolean;
  canManage: boolean;
}) {
  const { data: questions = [] } = useQuizQuestions(module.id);
  const catLabel = LIBRARY_CATEGORIES.find(c => c.value === module.category)?.label || module.category;
  const compLabel = COMPLETION_TYPES.find(c => c.value === module.completion_type)?.label;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base pr-6">{module.title}</SheetTitle>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <Badge className="text-[10px] bg-primary/10 text-primary">UGLŌ Standard</Badge>
            <Badge variant="outline" className="text-[10px]">{catLabel}</Badge>
            {compLabel && <Badge variant="outline" className="text-[10px]">{compLabel}</Badge>}
          </div>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {module.summary && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Summary</p>
              <p className="text-sm text-foreground">{module.summary}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            {module.estimated_minutes && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground uppercase">Duration</p>
                <p className="font-semibold">{module.estimated_minutes} min</p>
              </div>
            )}
            {module.refresher_days && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground uppercase">Refresher</p>
                <p className="font-semibold">Every {module.refresher_days}d</p>
              </div>
            )}
            {module.pass_mark && module.requires_quiz && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground uppercase">Pass Mark</p>
                <p className="font-semibold">{module.pass_mark}%</p>
              </div>
            )}
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-[10px] text-muted-foreground uppercase">Version</p>
              <p className="font-semibold">v{module.version}</p>
            </div>
          </div>

          {/* Quiz Questions Preview */}
          {questions.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Quiz Questions ({questions.length})
              </p>
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <div key={q.id} className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs font-medium text-foreground">{i + 1}. {q.question}</p>
                    <div className="mt-1.5 space-y-0.5">
                      {(q.options || []).map((opt: string, oi: number) => (
                        <p key={oi} className={cn("text-[11px] pl-3",
                          oi === q.correct_option ? "text-success font-medium" : "text-muted-foreground"
                        )}>
                          {oi === q.correct_option ? "✓" : "○"} {opt}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin-only standards metadata */}
          {canManage && module.standards_metadata && (
            <WhyThisMattersPanel metadata={module.standards_metadata as StandardsMetadata} />
          )}

          {canManage && (
            <div className="pt-2 border-t border-border">
              <Button onClick={onAdapt} disabled={isAdapting} className="w-full gap-2">
                <Copy className="h-4 w-4" />
                {isAdapting ? "Creating copy..." : "Adapt for My Company"}
              </Button>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                Creates an editable copy in your library. You can customise content, quiz questions, and settings before publishing to your team.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
