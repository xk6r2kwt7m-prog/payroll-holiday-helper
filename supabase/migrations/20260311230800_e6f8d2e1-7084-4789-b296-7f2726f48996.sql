
-- Talent pool status enum
CREATE TYPE public.talent_pool_status AS ENUM (
  'not_available', 'open_to_work', 'available_now', 'available_from_date', 'hidden', 'archived'
);

-- Visibility mode enum
CREATE TYPE public.talent_visibility_mode AS ENUM (
  'hidden', 'previous_employer_only', 'selected_companies', 'approved_country_region', 'all_approved'
);

-- Job seeking visibility enum
CREATE TYPE public.talent_seeking_visibility AS ENUM (
  'not_looking', 'discreetly_open', 'actively_available', 'selected_employers', 'specific_country_region'
);

-- Talent interest action type enum
CREATE TYPE public.talent_action_type AS ENUM (
  'view_profile', 'shortlist', 'express_interest', 'request_contact', 'reject', 'withdraw'
);

-- Core talent profiles table
CREATE TABLE public.talent_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  talent_pool_status public.talent_pool_status NOT NULL DEFAULT 'not_available',
  seeking_visibility public.talent_seeking_visibility NOT NULL DEFAULT 'not_looking',
  visibility_mode public.talent_visibility_mode NOT NULL DEFAULT 'hidden',
  available_from DATE,
  preferred_roles TEXT[] DEFAULT '{}',
  preferred_locations TEXT[] DEFAULT '{}',
  preferred_countries TEXT[] DEFAULT '{}',
  preferred_regions TEXT[] DEFAULT '{}',
  employment_type_preference TEXT[] DEFAULT '{}',
  contact_visibility BOOLEAN NOT NULL DEFAULT false,
  profile_summary TEXT,
  years_experience INTEGER,
  languages TEXT[] DEFAULT '{}',
  work_eligibility_countries TEXT[] DEFAULT '{}',
  willing_to_relocate BOOLEAN DEFAULT false,
  willing_to_travel BOOLEAN DEFAULT false,
  preferred_work_radius_km INTEGER,
  open_to_work_flag BOOLEAN NOT NULL DEFAULT false,
  opted_in_at TIMESTAMPTZ,
  opted_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id)
);

-- Visibility permissions table
CREATE TABLE public.talent_visibility_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  talent_profile_id UUID NOT NULL REFERENCES public.talent_profiles(id) ON DELETE CASCADE,
  allowed_tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  allowed_country TEXT,
  allowed_region TEXT,
  visibility_level TEXT NOT NULL DEFAULT 'full',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Talent requests from companies
CREATE TABLE public.talent_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  department TEXT,
  location TEXT,
  region TEXT,
  country TEXT,
  employment_type TEXT,
  urgency TEXT DEFAULT 'normal',
  required_skills TEXT[] DEFAULT '{}',
  required_training TEXT[] DEFAULT '{}',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI-powered matches
CREATE TABLE public.talent_request_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  talent_request_id UUID NOT NULL REFERENCES public.talent_requests(id) ON DELETE CASCADE,
  talent_profile_id UUID NOT NULL REFERENCES public.talent_profiles(id) ON DELETE CASCADE,
  match_score NUMERIC DEFAULT 0,
  geography_match BOOLEAN DEFAULT false,
  visibility_match BOOLEAN DEFAULT false,
  skill_match BOOLEAN DEFAULT false,
  match_reasoning TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Interest/action tracking
CREATE TABLE public.talent_interest_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  talent_profile_id UUID NOT NULL REFERENCES public.talent_profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  talent_request_id UUID REFERENCES public.talent_requests(id) ON DELETE SET NULL,
  action_type public.talent_action_type NOT NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log for talent pool changes
CREATE TABLE public.talent_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  talent_profile_id UUID NOT NULL REFERENCES public.talent_profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  performed_by UUID,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.talent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_visibility_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_request_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_interest_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS: talent_profiles - owner tenant admin can manage, other tenants can view if permitted
CREATE POLICY "Tenant admins can manage own talent profiles"
  ON public.talent_profiles FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

-- Staff can manage their own profile via user_id on employee
CREATE POLICY "Employees can manage own talent profile"
  ON public.talent_profiles FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = talent_profiles.employee_id
        AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = talent_profiles.employee_id
        AND e.user_id = auth.uid()
    )
  );

-- Cross-tenant visibility: companies can see profiles where visibility permits
CREATE POLICY "Companies can view permitted talent profiles"
  ON public.talent_profiles FOR SELECT TO authenticated
  USING (
    talent_pool_status IN ('open_to_work', 'available_now', 'available_from_date')
    AND visibility_mode != 'hidden'
    AND (
      visibility_mode = 'all_approved'
      OR EXISTS (
        SELECT 1 FROM public.talent_visibility_permissions tvp
        JOIN public.tenant_members tm ON tm.user_id = auth.uid() AND tm.is_active = true
        WHERE tvp.talent_profile_id = talent_profiles.id
          AND (tvp.allowed_tenant_id = tm.tenant_id OR tvp.allowed_tenant_id IS NULL)
      )
    )
  );

-- Visibility permissions RLS
CREATE POLICY "Profile owner can manage visibility"
  ON public.talent_visibility_permissions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.talent_profiles tp
      JOIN public.employees e ON e.id = tp.employee_id
      WHERE tp.id = talent_visibility_permissions.talent_profile_id
        AND (e.user_id = auth.uid() OR is_tenant_admin(tp.tenant_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.talent_profiles tp
      JOIN public.employees e ON e.id = tp.employee_id
      WHERE tp.id = talent_visibility_permissions.talent_profile_id
        AND (e.user_id = auth.uid() OR is_tenant_admin(tp.tenant_id))
    )
  );

-- Talent requests - tenant admins manage
CREATE POLICY "Tenant admins can manage talent requests"
  ON public.talent_requests FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

-- Talent request matches - tenant admins of requesting company
CREATE POLICY "Tenant admins can manage matches"
  ON public.talent_request_matches FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.talent_requests tr
      WHERE tr.id = talent_request_matches.talent_request_id
        AND is_tenant_admin(tr.tenant_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.talent_requests tr
      WHERE tr.id = talent_request_matches.talent_request_id
        AND is_tenant_admin(tr.tenant_id)
    )
  );

-- Interest actions - tenant admins of acting company
CREATE POLICY "Tenant admins can manage interest actions"
  ON public.talent_interest_actions FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

-- Audit log - tenant admins can view
CREATE POLICY "Tenant admins can view talent audit log"
  ON public.talent_audit_log FOR SELECT TO authenticated
  USING (is_tenant_admin(tenant_id));

CREATE POLICY "System can insert talent audit log"
  ON public.talent_audit_log FOR INSERT TO authenticated
  WITH CHECK (true);

-- Updated_at triggers
CREATE TRIGGER update_talent_profiles_updated_at
  BEFORE UPDATE ON public.talent_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_talent_requests_updated_at
  BEFORE UPDATE ON public.talent_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
