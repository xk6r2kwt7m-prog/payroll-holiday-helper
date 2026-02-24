import { useState, useMemo } from "react";
import { useEmployees } from "@/hooks/useEmployees";
import { useOnboardingTemplates, useOnboardingProgress, useInitOnboarding, useToggleOnboardingItem, OnboardingTemplate } from "@/hooks/useOnboarding";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck, UserPlus, ChevronDown, ChevronUp, FileText, GraduationCap, Wrench, LayoutList } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const categoryIcons: Record<string, any> = {
  documents: FileText,
  training: GraduationCap,
  equipment: Wrench,
  general: LayoutList,
};

const categoryLabels: Record<string, string> = {
  documents: "Documents",
  training: "Training",
  equipment: "Equipment",
  general: "General",
};

export default function Onboarding() {
  const { data: employees = [] } = useEmployees();
  const { data: templates = [] } = useOnboardingTemplates();
  const starters = employees.filter(e => e.status === "starter");
  const [selectedId, setSelectedId] = useState<string>("");
  const initOnboarding = useInitOnboarding();

  // Auto-select first starter
  const activeId = selectedId || starters[0]?.id || "";

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Onboarding</h1>
            <p className="text-muted-foreground">Track new starter checklists and progress</p>
          </div>
        </div>

        {starters.length === 0 ? (
          <div className="rounded-xl bg-card border border-border shadow-card p-8 text-center">
            <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-card-foreground mb-2">No New Starters</h3>
            <p className="text-muted-foreground">Add a new employee with 'starter' status to begin onboarding.</p>
          </div>
        ) : (
          <>
            {/* Starter selector */}
            <div className="flex items-center gap-3">
              <Select value={activeId} onValueChange={setSelectedId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select starter..." />
                </SelectTrigger>
                <SelectContent>
                  {starters.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.forename} {s.surname} ({s.department})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => activeId && initOnboarding.mutate(activeId)} disabled={!activeId || initOnboarding.isPending}>
                <ClipboardCheck className="h-4 w-4 mr-1.5" />
                {initOnboarding.isPending ? "Creating..." : "Init Checklist"}
              </Button>
            </div>

            {activeId && <StarterChecklist employeeId={activeId} templates={templates} />}

            {/* All starters overview */}
            <div className="rounded-xl bg-card border border-border shadow-card p-5">
              <h3 className="font-semibold text-card-foreground mb-4">All Starters Overview</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {starters.map(s => (
                  <StarterOverviewCard key={s.id} employee={s} onSelect={() => setSelectedId(s.id)} isSelected={activeId === s.id} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function StarterChecklist({ employeeId, templates }: { employeeId: string; templates: OnboardingTemplate[] }) {
  const { data: progress = [] } = useOnboardingProgress(employeeId);
  const toggle = useToggleOnboardingItem();
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  if (progress.length === 0) {
    return (
      <div className="rounded-xl bg-card border border-border shadow-card p-6 text-center">
        <p className="text-muted-foreground">No checklist items yet. Click "Init Checklist" to create one from the template.</p>
      </div>
    );
  }

  // Group by category
  const grouped = progress.reduce((acc, item) => {
    const cat = (item.onboarding_templates as any)?.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, typeof progress>);

  const completedCount = progress.filter(p => p.completed).length;
  const pct = Math.round((completedCount / progress.length) * 100);

  return (
    <div className="rounded-xl bg-card border border-border shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-card-foreground">Checklist Progress</h3>
          <Badge variant={pct === 100 ? "default" : "secondary"} className={cn(pct === 100 && "bg-success text-success-foreground")}>
            {completedCount}/{progress.length} ({pct}%)
          </Badge>
        </div>
        <Progress value={pct} className="h-2" />
      </div>
      <div className="divide-y divide-border">
        {Object.entries(grouped).sort(([a], [b]) => {
          const order = ["documents", "training", "equipment", "general"];
          return order.indexOf(a) - order.indexOf(b);
        }).map(([cat, items]) => {
          const CatIcon = categoryIcons[cat] || LayoutList;
          const catCompleted = items.filter(i => i.completed).length;
          const isExpanded = expandedCat === cat || expandedCat === null;
          return (
            <div key={cat}>
              <button
                className="flex items-center justify-between w-full px-5 py-3 hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedCat(expandedCat === cat ? null : cat)}
              >
                <div className="flex items-center gap-2">
                  <CatIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm text-card-foreground">{categoryLabels[cat] || cat}</span>
                  <Badge variant="outline" className="text-[10px]">{catCompleted}/{items.length}</Badge>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    {items.sort((a, b) => ((a.onboarding_templates as any)?.sort_order || 0) - ((b.onboarding_templates as any)?.sort_order || 0)).map(item => {
                      const tmpl = item.onboarding_templates as any;
                      return (
                        <label key={item.id} className="flex items-start gap-3 px-5 py-2.5 hover:bg-muted/20 cursor-pointer transition-colors">
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={(checked) => toggle.mutate({ id: item.id, completed: !!checked })}
                            className="mt-0.5"
                          />
                          <div className="min-w-0">
                            <p className={cn("text-sm font-medium", item.completed ? "text-muted-foreground line-through" : "text-card-foreground")}>{tmpl?.title}</p>
                            {tmpl?.description && <p className="text-xs text-muted-foreground">{tmpl.description}</p>}
                            {item.completed && item.completed_at && (
                              <p className="text-[10px] text-success mt-0.5">✓ Completed {new Date(item.completed_at).toLocaleDateString()}</p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StarterOverviewCard({ employee, onSelect, isSelected }: { employee: any; onSelect: () => void; isSelected: boolean }) {
  const { data: progress = [] } = useOnboardingProgress(employee.id);
  const completed = progress.filter(p => p.completed).length;
  const total = progress.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "rounded-xl border p-4 text-left transition-all hover:shadow-elevated hover:-translate-y-0.5",
        isSelected ? "border-primary bg-primary/5" : "border-border bg-card"
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary/10 text-primary text-sm">{employee.forename[0]}{employee.surname[0]}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-card-foreground text-sm">{employee.forename} {employee.surname}</p>
          <p className="text-xs text-muted-foreground">{employee.department} · {employee.start_date ? new Date(employee.start_date).toLocaleDateString() : "No start date"}</p>
        </div>
      </div>
      {total > 0 ? (
        <>
          <Progress value={pct} className="h-1.5 mb-1" />
          <p className="text-[11px] text-muted-foreground">{completed}/{total} tasks · {pct}%</p>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">No checklist yet</p>
      )}
    </button>
  );
}
