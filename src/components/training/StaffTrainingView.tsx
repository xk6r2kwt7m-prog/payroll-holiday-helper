import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  FileText, Shield, GraduationCap, CheckCircle2, Clock,
  AlertTriangle, ChevronRight, BookOpen, ExternalLink, Sparkles,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useMyTrainingAssignments,
  useUpdateAssignment,
  LIBRARY_CATEGORIES,
  type TrainingAssignment,
} from "@/hooks/useTrainingLibrary";
import { COMPLETION_TYPES } from "@/hooks/useTrainingModules";
import { QuizTaker } from "@/components/training/QuizTaker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const anim = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

interface StaffTrainingViewProps {
  employeeId: string;
}

export function StaffTrainingView({ employeeId }: StaffTrainingViewProps) {
  const { data: assignments = [], isLoading } = useMyTrainingAssignments(employeeId);
  const updateAssignment = useUpdateAssignment();
  const [selectedAssignment, setSelectedAssignment] = useState<TrainingAssignment | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);

  if (isLoading) return <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>;

  // Only show published training (staff should never see draft/archived)
  const visibleAssignments = assignments.filter(a => {
    const lib = a.training_library;
    return lib && lib.status === "published";
  });

  const pending = visibleAssignments.filter(a => !["completed", "acknowledged", "cancelled"].includes(a.status));
  const completed = visibleAssignments.filter(a => ["completed", "acknowledged"].includes(a.status));
  const overdue = pending.filter(a => a.due_date && differenceInDays(new Date(), parseISO(a.due_date)) > 0);

  const completionRate = visibleAssignments.length > 0
    ? Math.round((completed.length / visibleAssignments.length) * 100)
    : 100;

  const handleMarkViewed = (a: TrainingAssignment) => {
    if (a.status !== "assigned") return;
    updateAssignment.mutate({
      id: a.id, updates: { status: "viewed", viewed_at: new Date().toISOString() },
      action: "document_viewed", employeeId, documentId: a.document_id,
    });
  };

  const handleAcknowledge = (a: TrainingAssignment) => {
    updateAssignment.mutate({
      id: a.id, updates: { status: "acknowledged", acknowledged_at: new Date().toISOString() },
      action: "document_acknowledged", employeeId, documentId: a.document_id,
    }, { onSuccess: () => toast.success("Document acknowledged") });
  };

  const handleComplete = (a: TrainingAssignment) => {
    updateAssignment.mutate({
      id: a.id, updates: { status: "completed", completed_at: new Date().toISOString() },
      action: "document_completed", employeeId, documentId: a.document_id,
    }, { onSuccess: () => toast.success("Training completed") });
  };

  return (
    <div className="space-y-4">
      {visibleAssignments.length > 0 && (
        <motion.div {...anim}>
          <div className="rounded-xl bg-card border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">My Progress</p>
              <span className="text-sm font-bold text-primary tabular-nums">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-1.5 mb-2" />
            <div className="flex gap-4 text-[10px] text-muted-foreground uppercase tracking-wider">
              <span>{completed.length} done</span>
              <span>{pending.length} pending</span>
              {overdue.length > 0 && <span className="text-destructive font-medium">{overdue.length} overdue</span>}
            </div>
          </div>
        </motion.div>
      )}

      {overdue.length > 0 && (
        <motion.div {...anim} transition={{ delay: 0.04 }}>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-xs text-destructive font-medium">{overdue.length} item{overdue.length > 1 ? "s" : ""} overdue</p>
          </div>
        </motion.div>
      )}

      {pending.length > 0 && (
        <motion.div {...anim} transition={{ delay: 0.06 }}>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">To Do ({pending.length})</h3>
          <div className="space-y-2">
            {pending.map(a => (
              <AssignmentCard key={a.id} assignment={a} onOpen={() => { handleMarkViewed(a); setSelectedAssignment(a); setShowQuiz(false); }} />
            ))}
          </div>
        </motion.div>
      )}

      {completed.length > 0 && (
        <motion.div {...anim} transition={{ delay: 0.1 }}>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Completed ({completed.length})</h3>
          <div className="space-y-1.5">
            {completed.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border shadow-sm opacity-70">
                <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.training_library?.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {a.completed_at ? format(parseISO(a.completed_at), "d MMM yyyy") :
                     a.acknowledged_at ? format(parseISO(a.acknowledged_at), "d MMM yyyy") : ""}
                    {a.score != null && ` · Score: ${a.score}%`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {visibleAssignments.length === 0 && (
        <div className="text-center py-12 px-4">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">No training assigned yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            When your manager assigns training, policies, or quizzes, they'll appear here.
          </p>
        </div>
      )}

      {selectedAssignment && (
        <AssignmentDetailDialog
          assignment={selectedAssignment}
          employeeId={employeeId}
          open={!!selectedAssignment}
          onOpenChange={open => { if (!open) { setSelectedAssignment(null); setShowQuiz(false); } }}
          onAcknowledge={() => handleAcknowledge(selectedAssignment)}
          onComplete={() => handleComplete(selectedAssignment)}
          isPending={updateAssignment.isPending}
          showQuiz={showQuiz}
          onStartQuiz={() => setShowQuiz(true)}
        />
      )}
    </div>
  );
}

function AssignmentCard({ assignment, onOpen }: { assignment: TrainingAssignment; onOpen: () => void }) {
  const doc = assignment.training_library;
  const isOverdue = assignment.due_date && differenceInDays(new Date(), parseISO(assignment.due_date)) > 0;
  const catLabel = LIBRARY_CATEGORIES.find(c => c.value === doc?.category)?.label || doc?.category;

  return (
    <button onClick={onOpen}
      className={cn("w-full flex items-center gap-3 p-3.5 rounded-xl border shadow-sm text-left transition-all active:bg-muted",
        isOverdue ? "bg-destructive/5 border-destructive/15" : "bg-card border-border"
      )}>
      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
        doc?.completion_type === "quiz" ? "bg-accent/10" :
        doc?.completion_type === "blended" ? "bg-primary/10" :
        doc?.completion_type === "practical_signoff" ? "bg-warning/10" : "bg-muted"
      )}>
        {doc?.completion_type === "quiz" ? <GraduationCap className="h-5 w-5 text-accent-foreground" /> :
         doc?.completion_type === "blended" ? <Sparkles className="h-5 w-5 text-primary" /> :
         doc?.completion_type === "practical_signoff" ? <Shield className="h-5 w-5 text-warning" /> :
         <FileText className="h-5 w-5 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{doc?.title || "Document"}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="outline" className="text-[10px]">{catLabel}</Badge>
          {assignment.is_mandatory && <Badge className="text-[10px] bg-destructive/10 text-destructive">Required</Badge>}
          {assignment.due_date && (
            <span className={cn("text-[10px]", isOverdue ? "text-destructive font-medium" : "text-muted-foreground")}>
              {isOverdue ? "Overdue" : `Due ${format(parseISO(assignment.due_date), "d MMM")}`}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
    </button>
  );
}

function AssignmentDetailDialog({ assignment, employeeId, open, onOpenChange, onAcknowledge, onComplete, isPending, showQuiz, onStartQuiz }: {
  assignment: TrainingAssignment;
  employeeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAcknowledge: () => void;
  onComplete: () => void;
  isPending: boolean;
  showQuiz: boolean;
  onStartQuiz: () => void;
}) {
  const navigate = useNavigate();
  const doc = assignment.training_library;
  const needsAck = doc?.requires_acknowledgement && !assignment.acknowledged_at;
  const needsCompletion = doc?.requires_completion && !assignment.completed_at;
  const needsQuiz = doc?.requires_quiz && !assignment.quiz_passed;
  const isInternalPage = doc?.content_type === "internal_page" && doc?.content_url;
  const needsSignoff = assignment.signoff_required && !assignment.signed_off_at;

  const handleOpenContent = () => {
    if (isInternalPage) navigate(doc.content_url!);
    else if (doc?.content_type === "external_link" && doc?.content_url)
      window.open(doc.content_url, "_blank", "noopener,noreferrer");
  };

  // If showing quiz
  if (showQuiz && needsQuiz && doc) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{doc.title} — Quiz</DialogTitle></DialogHeader>
          <QuizTaker
            moduleId={doc.id}
            assignmentId={assignment.id}
            employeeId={employeeId}
            passMark={doc.pass_mark || 80}
            retryLimit={doc.retry_limit || 3}
            onComplete={() => onOpenChange(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{doc?.title || "Document"}</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          {doc?.summary && <p className="text-sm text-muted-foreground">{doc.summary}</p>}

          {(isInternalPage || (doc?.content_type === "external_link" && doc?.content_url)) && (
            <Button onClick={handleOpenContent} variant="outline" className="w-full gap-2">
              {isInternalPage ? <><BookOpen className="h-4 w-4" /> Open Training Module</> :
               <><ExternalLink className="h-4 w-4" /> Open External Resource</>}
            </Button>
          )}

          <div className="space-y-2 text-sm">
            {doc?.category && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <Badge variant="outline" className="text-xs">{LIBRARY_CATEGORIES.find(c => c.value === doc.category)?.label}</Badge>
              </div>
            )}
            {doc?.completion_type && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <Badge variant="outline" className="text-xs">{COMPLETION_TYPES.find(c => c.value === doc.completion_type)?.label}</Badge>
              </div>
            )}
            {doc?.estimated_minutes && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Est. Time</span>
                <span className="font-medium">{doc.estimated_minutes} min</span>
              </div>
            )}
            {assignment.due_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date</span>
                <span className="font-medium">{format(parseISO(assignment.due_date), "d MMMM yyyy")}</span>
              </div>
            )}
          </div>

          {/* Requirements checklist */}
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Requirements</p>
            <div className="space-y-1.5">
              <RequirementRow label={isInternalPage ? "View training module" : "Read document"} done={!!assignment.viewed_at} />
              {doc?.requires_acknowledgement && <RequirementRow label="Acknowledge policy" done={!!assignment.acknowledged_at} />}
              {doc?.requires_quiz && <RequirementRow label={`Pass quiz (${doc.pass_mark || 80}%)`} done={!!assignment.quiz_passed} />}
              {doc?.requires_completion && <RequirementRow label="Complete training" done={!!assignment.completed_at} />}
              {assignment.signoff_required && <RequirementRow label="Manager sign-off" done={!!assignment.signed_off_at} />}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            {needsQuiz && (
              <Button onClick={onStartQuiz} className="w-full gap-2">
                <GraduationCap className="h-4 w-4" /> Take Quiz
              </Button>
            )}
            {needsAck && !needsQuiz && (
              <Button onClick={onAcknowledge} disabled={isPending} className="w-full">
                <Shield className="h-4 w-4 mr-2" />
                {isPending ? "Processing..." : "I Acknowledge This Document"}
              </Button>
            )}
            {needsCompletion && !needsAck && !needsQuiz && !needsSignoff && (
              <Button onClick={onComplete} disabled={isPending} className="w-full">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {isPending ? "Processing..." : "Mark as Completed"}
              </Button>
            )}
            {needsSignoff && !needsQuiz && !needsAck && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/5 border border-warning/10">
                <Clock className="h-5 w-5 text-warning" />
                <p className="text-sm text-warning font-medium">Awaiting manager sign-off</p>
              </div>
            )}
            {!needsAck && !needsCompletion && !needsQuiz && !needsSignoff && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/5 border border-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <p className="text-sm font-medium text-success">All requirements met</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RequirementRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {done ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> : <Clock className="h-4 w-4 text-muted-foreground shrink-0" />}
      <span className={cn("text-sm", done ? "text-foreground" : "text-muted-foreground")}>{label}</span>
    </div>
  );
}
