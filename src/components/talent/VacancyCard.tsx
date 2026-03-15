import { useState } from "react";
import { MapPin, Clock, Briefcase, Building2, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Vacancy } from "@/hooks/useVacancies";

const URGENCY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-blue-500/10 text-blue-700 border-blue-200",
  high: "bg-amber-500/10 text-amber-700 border-amber-200",
  urgent: "bg-destructive/10 text-destructive border-destructive/20",
};

const TYPE_LABELS: Record<string, string> = {
  permanent: "Permanent",
  temporary: "Temporary",
  casual: "Casual",
  contract: "Contract",
};

interface VacancyCardProps {
  vacancy: Vacancy;
  onApply?: () => void;
  showApply?: boolean;
  applied?: boolean;
}

export function VacancyCard({ vacancy, onApply, showApply = true, applied = false }: VacancyCardProps) {
  const [expanded, setExpanded] = useState(false);

  const rateDisplay = vacancy.hourly_rate_min
    ? vacancy.hourly_rate_max
      ? `£${vacancy.hourly_rate_min}–£${vacancy.hourly_rate_max}/hr`
      : `£${vacancy.hourly_rate_min}/hr`
    : null;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-4 px-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm text-foreground">{vacancy.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Building2 className="h-3 w-3 shrink-0" />
              {vacancy.company_name || "Company"}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {vacancy.urgency === "urgent" && (
              <Badge variant="outline" className={`text-[10px] ${URGENCY_COLORS.urgent}`}>
                <Zap className="h-3 w-3 mr-0.5" /> Urgent
              </Badge>
            )}
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-4 pb-4 space-y-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {vacancy.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {vacancy.location}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Briefcase className="h-3 w-3" /> {TYPE_LABELS[vacancy.employment_type] || vacancy.employment_type}
          </span>
          {rateDisplay && (
            <span className="font-medium text-foreground">{rateDisplay}</span>
          )}
        </div>

        {/* Always show 2-line preview; expanded shows full */}
        {vacancy.description && (
          <p className={`text-xs text-muted-foreground ${expanded ? "whitespace-pre-wrap" : "line-clamp-2"}`}>
            {vacancy.description}
          </p>
        )}

        {expanded && (
          <div className="space-y-2 pt-1">
            {vacancy.start_date && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Start: {new Date(vacancy.start_date).toLocaleDateString()}
              </p>
            )}
            {vacancy.country && (
              <p className="text-[11px] text-muted-foreground">
                📍 {vacancy.country}
              </p>
            )}
          </div>
        )}

        {showApply && (
          <Button
            size="sm"
            className="w-full text-xs h-10 mt-1"
            variant={applied ? "secondary" : "default"}
            disabled={applied}
            onClick={(e) => {
              e.stopPropagation();
              onApply?.();
            }}
          >
            {applied ? "Applied ✓" : "Apply Now — Free"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
