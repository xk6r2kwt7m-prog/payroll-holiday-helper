import { MapPin, Clock, Briefcase, Building2, Zap } from "lucide-react";
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
  onView?: () => void;
  showApply?: boolean;
  applied?: boolean;
}

export function VacancyCard({ vacancy, onApply, onView, showApply = true, applied = false }: VacancyCardProps) {
  const rateDisplay = vacancy.hourly_rate_min
    ? vacancy.hourly_rate_max
      ? `£${vacancy.hourly_rate_min}–£${vacancy.hourly_rate_max}/hr`
      : `£${vacancy.hourly_rate_min}/hr`
    : null;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onView}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm text-foreground truncate">{vacancy.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Building2 className="h-3 w-3 shrink-0" />
              {vacancy.company_name || "Company"}
            </p>
          </div>
          {vacancy.urgency === "urgent" && (
            <Badge variant="outline" className={`shrink-0 text-[10px] ${URGENCY_COLORS.urgent}`}>
              <Zap className="h-3 w-3 mr-0.5" /> Urgent
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-4 pb-4 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {vacancy.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {vacancy.location}
              {vacancy.country && `, ${vacancy.country}`}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Briefcase className="h-3 w-3" /> {TYPE_LABELS[vacancy.employment_type] || vacancy.employment_type}
          </span>
          {rateDisplay && (
            <span className="font-medium text-foreground">{rateDisplay}</span>
          )}
        </div>

        {vacancy.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{vacancy.description}</p>
        )}

        {vacancy.start_date && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Start: {new Date(vacancy.start_date).toLocaleDateString()}
          </p>
        )}

        {showApply && (
          <Button
            size="sm"
            className="w-full text-xs mt-1"
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
