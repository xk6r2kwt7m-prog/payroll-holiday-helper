import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListOrdered } from "lucide-react";

const STEPS = [
  { num: 1, label: "Create sandbox", hint: "Pick a scenario or configure manually" },
  { num: 2, label: "Impersonate admin", hint: "Configure tenant settings, add branches" },
  { num: 3, label: "Configure tenant", hint: "Set up payroll, departments, leave rules" },
  { num: 4, label: "Impersonate worker", hint: "Test self-service, clock in/out, apply for jobs" },
  { num: 5, label: "Apply to job", hint: "Browse vacancies, submit application" },
  { num: 6, label: "Return as admin", hint: "Check inbox, view applicant" },
  { num: 7, label: "Reply to applicant", hint: "Free reply inside conversation" },
  { num: 8, label: "Test billing", hint: "Purchase credits, unlock passive candidate" },
  { num: 9, label: "Reset sandbox", hint: "Clean data, re-run if needed" },
];

export function RunOrderBlock() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ListOrdered className="h-4 w-4 text-primary" />
          Recommended QA Sequence
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-1.5">
          {STEPS.map((s) => (
            <li key={s.num} className="flex items-start gap-2.5 text-xs">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">
                {s.num}
              </span>
              <div>
                <span className="font-medium text-foreground">{s.label}</span>
                <span className="text-muted-foreground ml-1.5">— {s.hint}</span>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
