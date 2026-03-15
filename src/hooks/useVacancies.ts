import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";

export interface Vacancy {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  location: string | null;
  country: string | null;
  employment_type: string;
  hourly_rate_min: number | null;
  hourly_rate_max: number | null;
  salary_min: number | null;
  salary_max: number | null;
  start_date: string | null;
  urgency: string;
  status: string;
  published_at: string | null;
  closes_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  company_name?: string;
}

// Browse published vacancies (all companies)
export function usePublishedVacancies(filters?: { country?: string; employment_type?: string }) {
  return useQuery({
    queryKey: ["published-vacancies", filters],
    queryFn: async () => {
      let query = supabase
        .from("talent_vacancies")
        .select("*, tenants!inner(id)")
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (filters?.country) {
        query = query.eq("country", filters.country);
      }
      if (filters?.employment_type) {
        query = query.eq("employment_type", filters.employment_type);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch company names for display
      const tenantIds = [...new Set((data || []).map((v: any) => v.tenant_id))];
      let companyMap: Record<string, string> = {};
      if (tenantIds.length > 0) {
        const { data: settings } = await supabase
          .from("company_settings")
          .select("tenant_id, company_name")
          .in("tenant_id", tenantIds);
        companyMap = Object.fromEntries((settings || []).map((s: any) => [s.tenant_id, s.company_name]));
      }

      return (data || []).map((v: any) => ({
        ...v,
        company_name: companyMap[v.tenant_id] || "Company",
      })) as Vacancy[];
    },
  });
}

// Employer's own vacancies
export function useOwnVacancies() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["own-vacancies", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("talent_vacancies")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Vacancy[];
    },
    enabled: !!tenantId,
  });
}

// CRUD
export function useCreateVacancy() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (vacancy: Partial<Vacancy>) => {
      const { data, error } = await supabase
        .from("talent_vacancies")
        .insert({
          ...vacancy,
          tenant_id: tenantId!,
          created_by: user?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["own-vacancies"] });
      qc.invalidateQueries({ queryKey: ["published-vacancies"] });
    },
  });
}

export function useUpdateVacancy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Vacancy> & { id: string }) => {
      const { data, error } = await supabase
        .from("talent_vacancies")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["own-vacancies"] });
      qc.invalidateQueries({ queryKey: ["published-vacancies"] });
    },
  });
}

// Applications
export interface Application {
  id: string;
  vacancy_id: string;
  talent_profile_id: string;
  applicant_user_id: string;
  cover_message: string | null;
  status: string;
  applied_at: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  talent_profile?: {
    id: string;
    profile_summary: string | null;
    preferred_roles: string[];
    years_experience: number | null;
    languages: string[];
    employee?: { forename: string; surname_initial: string };
  };
  vacancy?: Vacancy;
}

export function useVacancyApplications(vacancyId: string) {
  return useQuery({
    queryKey: ["vacancy-applications", vacancyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("talent_applications")
        .select(`*, talent_profiles(
          id, profile_summary, preferred_roles, years_experience, languages,
          employees!inner(forename, surname)
        )`)
        .eq("vacancy_id", vacancyId)
        .order("applied_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((a: any) => ({
        ...a,
        talent_profile: a.talent_profiles ? {
          id: a.talent_profiles.id,
          profile_summary: a.talent_profiles.profile_summary,
          preferred_roles: a.talent_profiles.preferred_roles || [],
          years_experience: a.talent_profiles.years_experience,
          languages: a.talent_profiles.languages || [],
          employee: {
            forename: a.talent_profiles.employees?.forename || "",
            surname_initial: a.talent_profiles.employees?.surname
              ? a.talent_profiles.employees.surname.charAt(0) + "."
              : "",
          },
        } : undefined,
      })) as Application[];
    },
    enabled: !!vacancyId,
  });
}

export function useMyApplications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-applications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("talent_applications")
        .select("*, talent_vacancies(*)")
        .eq("applicant_user_id", user!.id)
        .order("applied_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((a: any) => ({
        ...a,
        vacancy: a.talent_vacancies || undefined,
      })) as Application[];
    },
    enabled: !!user?.id,
  });
}

export function useApplyToVacancy() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      vacancy_id,
      talent_profile_id,
      cover_message,
    }: {
      vacancy_id: string;
      talent_profile_id: string;
      cover_message?: string;
    }) => {
      // 1. Create application
      const { data: app, error: appError } = await supabase
        .from("talent_applications")
        .insert({
          vacancy_id,
          talent_profile_id,
          applicant_user_id: user!.id,
          cover_message: cover_message || null,
        } as any)
        .select()
        .single();
      if (appError) throw appError;

      // 2. Get vacancy tenant_id for conversation
      const { data: vacancy } = await supabase
        .from("talent_vacancies")
        .select("tenant_id")
        .eq("id", vacancy_id)
        .single();

      // 3. Create conversation thread
      if (vacancy) {
        await supabase.from("talent_conversations").insert({
          conversation_type: "application",
          application_id: app.id,
          talent_profile_id,
          employer_tenant_id: vacancy.tenant_id,
        } as any);
      }

      return app;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-applications"] });
      qc.invalidateQueries({ queryKey: ["vacancy-applications"] });
      qc.invalidateQueries({ queryKey: ["published-vacancies"] });
    },
  });
}

export function useUpdateApplicationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status !== "applied") updates.reviewed_at = new Date().toISOString();
      const { data, error } = await supabase
        .from("talent_applications")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vacancy-applications"] });
      qc.invalidateQueries({ queryKey: ["my-applications"] });
    },
  });
}
