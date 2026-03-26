import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { DatePreset, FinancialFilters as Filters } from "@/hooks/useFinancialData";

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  branches: { branch: string; display_name: string }[];
}

const presets: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "custom", label: "Custom" },
];

export function FinancialFilters({ filters, onChange, branches }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Period preset */}
      <Select value={filters.preset} onValueChange={(v) => onChange({ ...filters, preset: v as DatePreset })}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {presets.map((p) => (
            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Custom date pickers */}
      {filters.preset === "custom" && (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                <CalendarIcon className="h-3 w-3" />
                {filters.dateFrom ? format(parseISO(filters.dateFrom), "d MMM") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateFrom ? parseISO(filters.dateFrom) : undefined}
                onSelect={(d) => d && onChange({ ...filters, dateFrom: format(d, "yyyy-MM-dd") })}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                <CalendarIcon className="h-3 w-3" />
                {filters.dateTo ? format(parseISO(filters.dateTo), "d MMM") : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateTo ? parseISO(filters.dateTo) : undefined}
                onSelect={(d) => d && onChange({ ...filters, dateTo: format(d, "yyyy-MM-dd") })}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </>
      )}

      {/* Site filter */}
      <Select value={filters.site} onValueChange={(v) => onChange({ ...filters, site: v })}>
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <SelectValue placeholder="All sites" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sites</SelectItem>
          {branches.map((b) => (
            <SelectItem key={b.branch} value={b.branch}>{b.display_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Compare toggle */}
      <div className="flex items-center gap-1.5 ml-auto">
        <Switch
          id="compare"
          checked={filters.comparePrevious}
          onCheckedChange={(v) => onChange({ ...filters, comparePrevious: v })}
          className="h-4 w-8"
        />
        <Label htmlFor="compare" className="text-[11px] text-muted-foreground cursor-pointer">
          Compare
        </Label>
      </div>
    </div>
  );
}
