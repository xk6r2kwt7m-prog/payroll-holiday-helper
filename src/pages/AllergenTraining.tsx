/**
 * Staff page for Ugly Dumpling Allergen Safety — the page the shared link
 * points to.
 *
 * Opens only when the course is published AND the signed-in person has an
 * active assignment. Everyone else sees a plain explanation, never an error
 * and never anyone else's data. Progress saves as they go; the assessment
 * unlocks when the required reading is done. Nothing here sends messages,
 * issues certificates or touches test/preview records.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ClipboardCheck, Lock, ShieldAlert } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AllergenLessonReader } from "@/components/training/allergen/AllergenLessonReader";
import { AllergenAssessmentRunner } from "@/components/training/allergen/AllergenAssessmentRunner";
import {
  usePublishedAllergenVersion,
  useMyAllergenAssignment,
} from "@/hooks/useAllergenStaffAccess";
import { useBranchLocations } from "@/hooks/useSchedule";

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <AppLayout>
      <div className="mx-auto max-w-xl px-4 py-10">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{children}</CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

export default function AllergenTraining() {
  const { data: published, isLoading: versionLoading } = usePublishedAllergenVersion();
  const { data: assignment, isLoading: assignmentLoading } = useMyAllergenAssignment();
  const { data: branches = [] } = useBranchLocations();
  const [view, setView] = useState<"lessons" | "assessment">("lessons");

  if (versionLoading || assignmentLoading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-xl px-4 py-10 text-sm text-muted-foreground">
          Loading your training…
        </div>
      </AppLayout>
    );
  }

  if (!published) {
    return (
      <Notice title="Allergen training is not open yet">
        This course has not been published by management yet. When it is, your manager will let you
        know and it will appear here.
      </Notice>
    );
  }

  if (!assignment) {
    return (
      <Notice title="This training has not been assigned to you yet">
        The allergen safety course is currently being rolled out to a small group. If you think you
        should have access, please speak to your manager.
      </Notice>
    );
  }

  const versionLabel = `Version ${assignment.course_version ?? published.version}`;
  const branchName =
    (branches as any[]).find((b) => b.id === assignment.branch_id)?.display_name ??
    (branches as any[]).find((b) => b.id === assignment.branch_id)?.branch ??
    null;

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 py-6 md:py-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={view === "lessons" ? "default" : "outline"}
            className="gap-1"
            onClick={() => setView("lessons")}
          >
            <BookOpen className="h-3.5 w-3.5" /> Lessons
          </Button>
          <Button
            size="sm"
            variant={view === "assessment" ? "default" : "outline"}
            className="gap-1"
            onClick={() => setView("assessment")}
          >
            <ClipboardCheck className="h-3.5 w-3.5" /> Assessment
          </Button>
          <Badge variant="outline" className="gap-1">
            <Lock className="h-3 w-3" /> Your own record — private to you
          </Badge>
        </div>

        {view === "lessons" ? (
          <AllergenLessonReader
            isTest={false}
            courseVersionLabel={versionLabel}
            employeeId={assignment.employee_id}
            dueDate={assignment.due_date}
            onAssessmentOpen={() => setView("assessment")}
          />
        ) : (
          <AllergenAssessmentRunner
            isTest={false}
            branchId={assignment.branch_id}
            branchName={branchName ?? undefined}
            courseVersionLabel={versionLabel}
            employeeId={assignment.employee_id}
          />
        )}
      </div>
    </AppLayout>
  );
}
