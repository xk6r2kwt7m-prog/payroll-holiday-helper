
-- =============================================
-- 1. RETURN-TO-WORK FORMS
-- =============================================
CREATE TABLE public.return_to_work_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  absence_record_id UUID NOT NULL REFERENCES public.absence_records(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  completed_by UUID,
  completed_at TIMESTAMP WITH TIME ZONE,
  fit_to_return BOOLEAN DEFAULT true,
  reason_for_absence TEXT,
  doctor_consulted BOOLEAN DEFAULT false,
  doctor_note_provided BOOLEAN DEFAULT false,
  adjustments_needed TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  follow_up_notes TEXT,
  manager_comments TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.return_to_work_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage RTW forms" ON public.return_to_work_forms FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Only admins can view RTW forms" ON public.return_to_work_forms FOR SELECT USING (is_admin());

-- =============================================
-- 2. TRAINING RECORDS
-- =============================================
CREATE TABLE public.training_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  certification_name TEXT NOT NULL,
  certification_type TEXT NOT NULL DEFAULT 'other',
  provider TEXT,
  date_obtained DATE NOT NULL,
  expiry_date DATE,
  certificate_file_path TEXT,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.training_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage training records" ON public.training_records FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Only admins can view training records" ON public.training_records FOR SELECT USING (is_admin());

-- =============================================
-- 3. STAFF ANNOUNCEMENTS
-- =============================================
CREATE TABLE public.staff_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  target_branches TEXT[] DEFAULT '{}',
  target_departments TEXT[] DEFAULT '{}',
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage announcements" ON public.staff_announcements FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Staff can view published announcements" ON public.staff_announcements FOR SELECT USING (has_any_role() AND published_at IS NOT NULL AND (expires_at IS NULL OR expires_at > now()));

CREATE TABLE public.announcement_read_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.staff_announcements(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, employee_id)
);

ALTER TABLE public.announcement_read_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage read receipts" ON public.announcement_read_receipts FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Staff can insert own read receipts" ON public.announcement_read_receipts FOR INSERT WITH CHECK (employee_id IN (SELECT e.id FROM employees e WHERE e.user_id = auth.uid()));
CREATE POLICY "Staff can view own read receipts" ON public.announcement_read_receipts FOR SELECT USING (employee_id IN (SELECT e.id FROM employees e WHERE e.user_id = auth.uid()));

-- =============================================
-- 4. DISCIPLINARY & GRIEVANCE LOG
-- =============================================
CREATE TABLE public.disciplinary_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL DEFAULT 'disciplinary',
  category TEXT NOT NULL DEFAULT 'verbal_warning',
  incident_date DATE NOT NULL,
  description TEXT NOT NULL,
  witnesses TEXT,
  meeting_date DATE,
  meeting_notes TEXT,
  outcome TEXT,
  appeal_deadline DATE,
  appeal_received BOOLEAN DEFAULT false,
  appeal_outcome TEXT,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  issued_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.disciplinary_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage disciplinary records" ON public.disciplinary_records FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Only admins can view disciplinary records" ON public.disciplinary_records FOR SELECT USING (is_admin());
