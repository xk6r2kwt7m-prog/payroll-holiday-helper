import { useState } from "react";
import { Search, Briefcase, Filter, Globe, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTalentProfiles, type TalentProfile } from "@/hooks/useTalentPool";
import { useAuth } from "@/hooks/useAuth";
import { ContactCandidateSheet } from "./ContactCandidateSheet";
import { TalentConversation } from "./TalentConversation";

const STATUS_COLORS: Record<string, string> = {
  available_now: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  open_to_work: "bg-blue-500/10 text-blue-700 border-blue-200",
  available_from_date: "bg-amber-500/10 text-amber-700 border-amber-200",
};

const STATUS_LABELS: Record<string, string> = {
  available_now: "Available Now",
  open_to_work: "Open to Work",
  available_from_date: "Available Soon",
};

export function TalentSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [contactProfile, setContactProfile] = useState<TalentProfile | null>(null);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  const { data: profiles = [], isLoading } = useTalentProfiles({
    country: countryFilter !== "all" ? countryFilter : undefined,
  });

  const { isAdmin } = useAuth();

  const filteredProfiles = profiles.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const emp = p.employee;
    return (
      emp?.forename?.toLowerCase().includes(q) ||
      emp?.surname_initial?.toLowerCase().includes(q) ||
      p.preferred_roles?.some((r) => r.toLowerCase().includes(q)) ||
      p.preferred_locations?.some((l) => l.toLowerCase().includes(q)) ||
      p.profile_summary?.toLowerCase().includes(q)
    );
  });

  const countries = [...new Set(profiles.flatMap((p) => p.preferred_countries || []))].sort();

  // If viewing a conversation after unlock
  if (activeConvId) {
    return (
      <TalentConversation
        conversationId={activeConvId}
        otherPartyName={contactProfile?.employee?.forename || "Candidate"}
        senderType="employer"
        onBack={() => { setActiveConvId(null); setContactProfile(null); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, role, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {countryFilter !== "all" && (
                <Badge variant="secondary" className="ml-1 text-xs">Active</Badge>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="flex flex-wrap gap-3 p-4 rounded-lg border border-border bg-muted/30">
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {countryFilter !== "all" && (
                <Button variant="ghost" size="sm" onClick={() => setCountryFilter("all")}>
                  Clear filters
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <p className="text-sm text-muted-foreground">
        {filteredProfiles.length} talent profile{filteredProfiles.length !== 1 ? "s" : ""} found
      </p>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5">
                <div className="h-6 w-32 bg-muted rounded mb-3" />
                <div className="h-4 w-24 bg-muted rounded mb-2" />
                <div className="h-4 w-full bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredProfiles.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mx-auto">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">No talent profiles found</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                {searchQuery || countryFilter !== "all"
                  ? "No profiles match your current search or filters. Try broadening your criteria."
                  : "There are no visible talent profiles yet. Profiles appear here when former staff opt in via their Staff Portal and set their visibility to public."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && filteredProfiles.length > 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProfiles.map((profile) => (
            <TalentProfileCard
              key={profile.id}
              profile={profile}
              isAdmin={isAdmin}
              onContact={() => setContactProfile(profile)}
            />
          ))}
        </div>
      )}

      {/* Contact sheet */}
      {contactProfile && (
        <ContactCandidateSheet
          open={!!contactProfile}
          onOpenChange={(open) => { if (!open) setContactProfile(null); }}
          profile={contactProfile}
          onContactOpened={(convId) => setActiveConvId(convId)}
        />
      )}
    </div>
  );
}

function TalentProfileCard({
  profile,
  isAdmin,
  onContact,
}: {
  profile: TalentProfile;
  isAdmin: boolean;
  onContact: () => void;
}) {
  const emp = profile.employee;
  const statusClass = STATUS_COLORS[profile.talent_pool_status] || "bg-muted text-muted-foreground";
  const statusLabel = STATUS_LABELS[profile.talent_pool_status] || profile.talent_pool_status;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">
              {emp?.forename} {emp?.surname_initial}
            </CardTitle>
            {profile.preferred_roles?.length > 0 && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {profile.preferred_roles[0]}
              </p>
            )}
          </div>
          <Badge variant="outline" className={`shrink-0 text-xs ${statusClass}`}>
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {(profile.preferred_locations?.length > 0 || profile.preferred_countries?.length > 0) && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Globe className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {[...(profile.preferred_locations || []), ...(profile.preferred_countries || [])].join(", ")}
            </span>
          </div>
        )}

        {profile.preferred_roles?.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{profile.preferred_roles.join(", ")}</span>
          </div>
        )}

        {profile.employment_type_preference?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {profile.employment_type_preference.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs capitalize">
                {t}
              </Badge>
            ))}
          </div>
        )}

        {profile.profile_summary && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {profile.profile_summary}
          </p>
        )}

        {profile.available_from && (
          <p className="text-xs text-muted-foreground">
            Available from: {new Date(profile.available_from).toLocaleDateString()}
          </p>
        )}

        {/* Primary CTA: Contact Candidate (employer only) */}
        {isAdmin && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              className="flex-1 text-xs gap-1.5"
              onClick={onContact}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Contact Candidate
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
