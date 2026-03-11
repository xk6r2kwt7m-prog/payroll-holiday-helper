import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";

export interface TalentProfile {
  id: string;
  employee_id: string;
  tenant_id: string;
  talent_pool_status: string;
  seeking_visibility: string;
  visibility_mode: string;
  available_from: string | null;
  preferred_roles: string[];
  preferred_locations: string[];
  preferred_countries: string[];
  preferred_regions: string[];
  employment_type_preference: string[];
  contact_visibility: boolean;
  profile_summary: string | null;
  years_experience: number | null;
  languages: string[];
  work_eligibility_countries: string[];
  willing_to_relocate: boolean;
  willing_to_travel: boolean;
  preferred_work_radius_km: number | null;
  open_to_work_flag: boolean;
  opted_in_at: string | null;
  opted_out_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  employee?: {
    forename: string;
    surname: string;
    department: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
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

// Fetch visible talent profiles for the current tenant
export function useTalentProfiles(filters?: {
  country?: string;
  region?: string;
  department?: string;
  status?: string;
  role?: string;
}) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["talent-profiles", tenantId, filters],
    queryFn: async () => {
      // Query profiles visible to this tenant
      const query = supabase
        .from("talent_profiles")
        .select("*, employees!inner(forename, surname, department, status, start_date, end_date)")
        .in("talent_pool_status", ["open_to_work", "available_now", "available_from_date"] as any[]);

      if (filters?.country) {
        query = query.contains("preferred_countries", [filters.country]);
      }
      if (filters?.department) {
        query = query.eq("employees.department" as any, filters.department);
      }

      const { data, error } = await query.order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        employee: d.employees,
      })) as TalentProfile[];
    },
    enabled: !!tenantId,
  });
}

// Fetch own talent profile (for self-service)
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
      return data as TalentProfile | null;
    },
    enabled: !!user?.id,
  });
}

// Create or update talent profile
export function useUpsertTalentProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: Partial<TalentProfile> & { employee_id: string; tenant_id: string }) => {
      // Check existing
      const { data: existing } = await supabase
        .from("talent_profiles")
        .select("id")
        .eq("employee_id", profile.employee_id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("talent_profiles")
          .update(profile)
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

// Talent request matches
export function useTalentMatches(requestId: string) {
  return useQuery({
    queryKey: ["talent-matches", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("talent_request_matches")
        .select("*, talent_profiles(*, employees!inner(forename, surname, department, status))")
        .eq("talent_request_id", requestId)
        .order("match_score", { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        talent_profile: d.talent_profiles ? {
          ...d.talent_profiles,
          employee: d.talent_profiles.employees,
        } : undefined,
      })) as TalentMatch[];
    },
    enabled: !!requestId,
  });
}

// Interest actions
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

// Visibility permissions
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
      // Delete existing and replace
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
