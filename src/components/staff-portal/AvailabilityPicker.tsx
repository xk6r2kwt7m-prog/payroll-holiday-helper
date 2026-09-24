import { Input } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";
import { DAY_NAMES } from "@/hooks/useAvailability";
import { cn } from "@/lib/utils";

export function AvailabilityPicker({ availability, setAvailability }: {
  availability: { day_of_week: number; is_available: boolean; available_from: string; available_to: string }[];
  setAvailability: (a: any) => void;
}) {
  const toggle = (dayIndex: number) => {
    setAvailability((prev: any[]) => prev.map((a: any) =>
      a.day_of_week === dayIndex ? { ...a, is_available: !a.is_available } : a
    ));
  };
  const updateTime = (dayIndex: number, field: string, value: string) => {
    setAvailability((prev: any[]) => prev.map((a: any) =>
      a.day_of_week === dayIndex ? { ...a, [field]: value } : a
    ));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">Availability</h2>
        <p className="text-sm text-muted-foreground">Let your manager know when you're available to work.</p>
      </div>
      <div className="space-y-2">
        {availability.map(day => (
          <div key={day.day_of_week} className={cn(
            "rounded-xl border p-3 transition-all",
            day.is_available ? "border-primary/20 bg-primary/5" : "border-border bg-card opacity-60"
          )}>
            <div className="flex items-center justify-between">
              <button onClick={() => toggle(day.day_of_week)} className="flex items-center gap-2">
                <div className={cn(
                  "h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors",
                  day.is_available ? "bg-primary border-primary" : "border-border"
                )}>
                  {day.is_available && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                </div>
                <span className="text-sm font-medium">{DAY_NAMES[day.day_of_week]}</span>
              </button>
              {day.is_available && (
                <div className="flex items-center gap-1.5">
                  <Input type="time" value={day.available_from} onChange={e => updateTime(day.day_of_week, "available_from", e.target.value)} className="h-8 w-24 text-xs" />
                  <span className="text-xs text-muted-foreground">–</span>
                  <Input type="time" value={day.available_to} onChange={e => updateTime(day.day_of_week, "available_to", e.target.value)} className="h-8 w-24 text-xs" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
