import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";

// Privacy-safe public profile shape — no tenant_id, no employee_id in browse results
export interface TalentProfile {
  id: string;
  talent_pool_status: string;
  available_from: string | null;
  preferred_roles: string[];
  preferred_locations: string[];
  preferred_countries: string[];
  preferred_regions: string[];
  employment_type_preference: string[];
  profile_summary: string | null;
  years_experience: number | null;
  languages: string[];
  work_eligibility_countries: string[];
  willing_to_relocate: boolean;
  willing_to_travel: boolean;
  // Joined fields — privacy-safe subset only
  employee?: {
    forename: string;
    surname_initial: string;
  };
}

export interface TalentRequest {
  id: string;
  tenant_id: string;
  role: string;
  department: string | null;
  location: string | null;
  region: string | null;
  country: string | null;
  employment_type: string | null;
  urgency: string;
  required_skills: string[];
  required_training: string[];
  notes: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TalentMatch {
  id: string;
  talent_request_id: string;
  talent_profile_id: string;
  match_score: number;
  geography_match: boolean;
  visibility_match: boolean;
  skill_match: boolean;
  match_reasoning: string | null;
  status: string;
  created_at: string;
  talent_profile?: TalentProfile;
}

// Privacy-safe browse query — strips tenant_id, employee_id, internal fields
export function useTalentProfiles(filters?: {
  country?: string;
}) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["talent-profiles", tenantId, filters],
    queryFn: async () => {
      let query: any = supabase
        .from("talent_profiles")
        .select(`
          id, talent_pool_status, available_from,
          preferred_roles, preferred_locations, preferred_countries, preferred_regions,
          employment_type_preference, profile_summary, years_experience, languages,
          work_eligibility_countries, willing_to_relocate, willing_to_travel,
          employees!inner(forename, surname)
        `)
        .in("talent_pool_status", ["open_to_work", "available_now", "available_from_date"])
        .neq("visibility_mode", "hidden");

      if (filters?.country) {
        query = query.contains("preferred_countries", [filters.country]);
      }

      const { data, error } = await query.order("updated_at", { ascending: false });
      if (error) throw error;
      // Strip to privacy-safe shape — no tenant_id, no employee_id
      return (data || []).map((d: any) => ({
        id: d.id,
        talent_pool_status: d.talent_pool_status,
        available_from: d.available_from,
        preferred_roles: d.preferred_roles || [],
        preferred_locations: d.preferred_locations || [],
        preferred_countries: d.preferred_countries || [],
        preferred_regions: d.preferred_regions || [],
        employment_type_preference: d.employment_type_preference || [],
        profile_summary: d.profile_summary,
        years_experience: d.years_experience,
        languages: d.languages || [],
        work_eligibility_countries: d.work_eligibility_countries || [],
        willing_to_relocate: d.willing_to_relocate,
        willing_to_travel: d.willing_to_travel,
        employee: {
          forename: d.employees?.forename || "",
          surname_initial: d.employees?.surname ? d.employees.surname.charAt(0) + "." : "",
        },
      })) as TalentProfile[];
    },
    enabled: !!tenantId,
  });
}

// Fetch own talent profile (for self-service) — full fields for the owner
export function useOwnTalentProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["own-talent-profile", user?.id],
    queryFn: async () => {
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!employee) return null;

      const { data, error } = await supabase
        .from("talent_profiles")
        .select("*")
        .eq("employee_id", employee.id)
        .maybeSingle();

      if (error) throw error;
      return data as any | null;
    },
    enabled: !!user?.id,
  });
}

// Create or update talent profile
export function useUpsertTalentProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: Record<string, any> & { employee_id: string; tenant_id: string }) => {
      const { data: existing } = await supabase
        .from("talent_profiles")
        .select("id")
        .eq("employee_id", profile.employee_id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("talent_profiles")
          .update(profile as any)
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("talent_profiles")
          .insert(profile as any)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["talent-profiles"] });
      qc.invalidateQueries({ queryKey: ["own-talent-profile"] });
    },
  });
}

// Talent requests
export function useTalentRequests() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["talent-requests", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("talent_requests")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TalentRequest[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateTalentRequest() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (request: Omit<TalentRequest, "id" | "created_at" | "updated_at" | "tenant_id">) => {
      const { data, error } = await supabase
        .from("talent_requests")
        .insert({ ...request, tenant_id: tenantId! } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["talent-requests"] });
    },
  });
}

// Talent request matches — privacy-safe: no tenant_id/employee_id in profile
export function useTalentMatches(requestId: string) {
  return useQuery({
    queryKey: ["talent-matches", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("talent_request_matches")
        .select(`*, talent_profiles(
          id, talent_pool_status, preferred_roles, preferred_locations,
          preferred_countries, profile_summary, years_experience, languages,
          employment_type_preference, available_from,
          willing_to_relocate, willing_to_travel,
          work_eligibility_countries,
          employees!inner(forename, surname)
        )`)
        .eq("talent_request_id", requestId)
        .order("match_score", { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id,
        talent_request_id: d.talent_request_id,
        talent_profile_id: d.talent_profile_id,
        match_score: d.match_score,
        geography_match: d.geography_match,
        visibility_match: d.visibility_match,
        skill_match: d.skill_match,
        match_reasoning: d.match_reasoning,
        status: d.status,
        created_at: d.created_at,
        talent_profile: d.talent_profiles ? {
          id: d.talent_profiles.id,
          talent_pool_status: d.talent_profiles.talent_pool_status,
          preferred_roles: d.talent_profiles.preferred_roles || [],
          preferred_locations: d.talent_profiles.preferred_locations || [],
          preferred_countries: d.talent_profiles.preferred_countries || [],
          profile_summary: d.talent_profiles.profile_summary,
          years_experience: d.talent_profiles.years_experience,
          languages: d.talent_profiles.languages || [],
          employment_type_preference: d.talent_profiles.employment_type_preference || [],
          available_from: d.talent_profiles.available_from,
          willing_to_relocate: d.talent_profiles.willing_to_relocate,
          willing_to_travel: d.talent_profiles.willing_to_travel,
          work_eligibility_countries: d.talent_profiles.work_eligibility_countries || [],
          employee: {
            forename: d.talent_profiles.employees?.forename || "",
            surname_initial: d.talent_profiles.employees?.surname ? d.talent_profiles.employees.surname.charAt(0) + "." : "",
          },
        } as TalentProfile : undefined,
      })) as TalentMatch[];
    },
    enabled: !!requestId,
  });
}

// Interest actions — uses talent_profile_id (safe public identifier)
export function useCreateInterestAction() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (action: {
      talent_profile_id: string;
      talent_request_id?: string;
      action_type: string;
      notes?: string;
      created_by?: string;
    }) => {
      const { data, error } = await supabase
        .from("talent_interest_actions")
        .insert({ ...action, tenant_id: tenantId! } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["talent-interest-actions"] });
    },
  });
}

// Visibility permissions — employee self-service only
export function useVisibilityPermissions(profileId: string) {
  return useQuery({
    queryKey: ["talent-visibility-permissions", profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("talent_visibility_permissions")
        .select("*")
        .eq("talent_profile_id", profileId);
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
}

export function useManageVisibilityPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      profileId,
      permissions,
    }: {
      profileId: string;
      permissions: Array<{
        allowed_tenant_id?: string;
        allowed_country?: string;
        allowed_region?: string;
        visibility_level?: string;
      }>;
    }) => {
      await supabase
        .from("talent_visibility_permissions")
        .delete()
        .eq("talent_profile_id", profileId);

      if (permissions.length > 0) {
        const { error } = await supabase
          .from("talent_visibility_permissions")
          .insert(
            permissions.map((p) => ({
              talent_profile_id: profileId,
              ...p,
            })) as any
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["talent-visibility-permissions"] });
    },
  });
}
