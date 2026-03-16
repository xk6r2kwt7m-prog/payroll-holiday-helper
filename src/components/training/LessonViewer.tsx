/**
 * LessonViewer — staff-facing lesson content renderer.
 *
 * Renders source-backed lesson sections with classification badges.
 * Hides admin-only sections (staff_visible: false).
 * Shows source traceability per point via classification labels.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen, ShieldAlert, AlertTriangle, CheckCircle2, ListChecks,
  ChevronDown, ChevronUp, Scale, Info, Siren, Users, Eye, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  LessonContent,
  LessonSection,
  LessonSectionType,
  SourceClassification,
} from "@/data/training-standards/lesson-types";
import {
  SOURCE_CLASSIFICATION_LABELS,
  SOURCE_CLASSIFICATION_COLORS,
} from "@/data/training-standards/lesson-types";

// ─── Section icon map ───

const SECTION_ICONS: Record<LessonSectionType, React.ReactNode> = {
  overview: <BookOpen className="h-4 w-4" />,
  why_this_matters: <AlertTriangle className="h-4 w-4" />,
  key_rules: <Scale className="h-4 w-4" />,
  step_by_step: <ListChecks className="h-4 w-4" />,
  common_mistakes: <ShieldAlert className="h-4 w-4" />,
  scenarios: <Eye className="h-4 w-4" />,
  expected_behaviours: <CheckCircle2 className="h-4 w-4" />,
  manager_notes: <Users className="h-4 w-4" />,
  learning_outcomes: <Target className="h-4 w-4" />,
  emergency_response: <Siren className="h-4 w-4" />,
};

// ─── Classification badge ───

function ClassificationBadge({ classification }: { classification: SourceClassification }) {
  return (
    <Badge
      variant="outline"
      className={cn("text-[9px] font-semibold px-1.5 py-0 leading-4 shrink-0 border", SOURCE_CLASSIFICATION_COLORS[classification])}
    >
      {SOURCE_CLASSIFICATION_LABELS[classification]}
    </Badge>
  );
}

// ─── Section renderer ───

function LessonSectionBlock({ section, index }: { section: LessonSection; index: number }) {
  const [expanded, setExpanded] = useState(true);
  const icon = SECTION_ICONS[section.type] ?? <Info className="h-4 w-4" />;

  const isEmergency = section.type === "emergency_response";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        "rounded-xl border overflow-hidden",
        isEmergency
          ? "border-destructive/30 bg-destructive/5"
          : "border-border/50 bg-card"
      )}
    >
      {/* Section header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-secondary/30 transition-colors"
      >
        <div className={cn(
          "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
          isEmergency ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
        )}>
          {icon}
        </div>
        <span className="text-sm font-semibold text-foreground flex-1">{section.heading}</span>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        }
      </button>

      {/* Section content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Paragraphs */}
          {section.paragraphs?.map((p, i) => (
            <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
          ))}

          {/* Points with classification */}
          {section.points?.map((point, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-2.5 rounded-lg p-3 text-sm",
                point.classification === "legal_requirement"
                  ? "bg-destructive/5 border border-destructive/10"
                  : point.classification === "official_guidance"
                    ? "bg-primary/5 border border-primary/10"
                    : "bg-accent/5 border border-accent/10"
              )}
            >
              <div className="flex-1 space-y-1.5">
                <p className="text-foreground leading-relaxed">{point.text}</p>
                <ClassificationBadge classification={point.classification} />
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Main viewer ───

interface LessonViewerProps {
  lesson: LessonContent;
  onLessonComplete?: () => void;
}

export function LessonViewer({ lesson, onLessonComplete }: LessonViewerProps) {
  const [showSources, setShowSources] = useState(false);

  // Filter to staff-visible sections only
  const staffSections = lesson.sections.filter(s => s.staff_visible !== false);

  return (
    <div className="space-y-3">
      {/* Lesson header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">v{lesson.version}</Badge>
          <span className="text-[10px] text-muted-foreground">
            Reviewed {lesson.last_reviewed}
          </span>
        </div>
        <button
          onClick={() => setShowSources(!showSources)}
          className="text-[10px] text-primary hover:underline"
        >
          {showSources ? "Hide sources" : "View sources"}
        </button>
      </div>

      {/* Source list (collapsible) */}
      {showSources && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Verified Sources
          </p>
          {lesson.sources.map(src => (
            <div key={src.id} className="flex items-start gap-2">
              <ClassificationBadge classification={src.type} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{src.name}</p>
                {src.jurisdiction && (
                  <p className="text-[10px] text-muted-foreground">{src.jurisdiction}</p>
                )}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Classification legend */}
      <div className="flex flex-wrap gap-1.5">
        <ClassificationBadge classification="legal_requirement" />
        <ClassificationBadge classification="official_guidance" />
        <ClassificationBadge classification="internal_standard" />
      </div>

      {/* Sections */}
      {staffSections.map((section, i) => (
        <LessonSectionBlock key={i} section={section} index={i} />
      ))}

      {/* Completion action */}
      {onLessonComplete && (
        <div className="pt-2">
          <Button onClick={onLessonComplete} className="w-full" size="lg">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            I've read the lesson — continue
          </Button>
        </div>
      )}
    </div>
  );
}
