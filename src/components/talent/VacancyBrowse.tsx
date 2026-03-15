import { useState } from "react";
import { Search, Filter, Briefcase, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { usePublishedVacancies, type Vacancy } from "@/hooks/useVacancies";
import { useMyApplications } from "@/hooks/useVacancies";
import { VacancyCard } from "@/components/talent/VacancyCard";
import { ApplyDialog } from "@/components/talent/ApplyDialog";

export function VacancyBrowse() {
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [applyVacancy, setApplyVacancy] = useState<Vacancy | null>(null);

  const { data: vacancies = [], isLoading } = usePublishedVacancies({
    country: countryFilter !== "all" ? countryFilter : undefined,
    employment_type: typeFilter !== "all" ? typeFilter : undefined,
  });
  const { data: myApplications = [] } = useMyApplications();

  const appliedVacancyIds = new Set(myApplications.map((a) => a.vacancy_id));

  const filtered = vacancies.filter((v) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.title.toLowerCase().includes(q) ||
      v.location?.toLowerCase().includes(q) ||
      v.company_name?.toLowerCase().includes(q) ||
      v.description?.toLowerCase().includes(q)
    );
  });

  const countries = [...new Set(vacancies.map((v) => v.country).filter(Boolean))].sort();

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by role, company, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" /> Filters
              {(countryFilter !== "all" || typeFilter !== "all") && (
                <Badge variant="secondary" className="ml-1 text-xs">Active</Badge>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="flex flex-wrap gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Country" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map((c) => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="temporary">Temporary</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                </SelectContent>
              </Select>
              {(countryFilter !== "all" || typeFilter !== "all") && (
                <Button variant="ghost" size="sm" onClick={() => { setCountryFilter("all"); setTypeFilter("all"); }}>
                  Clear
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} vacanc{filtered.length !== 1 ? "ies" : "y"} found
      </p>

      {isLoading && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4"><div className="h-5 w-32 bg-muted rounded mb-2" /><div className="h-4 w-24 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center">
            <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No vacancies match your search</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        {filtered.map((v) => (
          <VacancyCard
            key={v.id}
            vacancy={v}
            onApply={() => setApplyVacancy(v)}
            applied={appliedVacancyIds.has(v.id)}
          />
        ))}
      </div>

      {applyVacancy && (
        <ApplyDialog
          open={true}
          onOpenChange={() => setApplyVacancy(null)}
          vacancy={applyVacancy}
        />
      )}
    </div>
  );
}
