
-- Training Module Enhancement: Schema + Platform Seed
-- 1. Make tenant_id nullable for platform content
ALTER TABLE public.training_library ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.training_quiz_questions ALTER COLUMN tenant_id DROP NOT NULL;

-- 2. Add new columns to training_library
ALTER TABLE public.training_library
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'tenant',
  ADD COLUMN IF NOT EXISTS source_module_id uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS completion_type text NOT NULL DEFAULT 'read_acknowledge',
  ADD COLUMN IF NOT EXISTS audience_scope text DEFAULT 'all_staff',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS change_log text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS refresher_days integer,
  ADD COLUMN IF NOT EXISTS estimated_minutes integer,
  ADD COLUMN IF NOT EXISTS is_mandatory boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pass_mark integer DEFAULT 80,
  ADD COLUMN IF NOT EXISTS retry_limit integer DEFAULT 3;

-- 3. Extend quiz questions
ALTER TABLE public.training_quiz_questions
  ADD COLUMN IF NOT EXISTS question_type text NOT NULL DEFAULT 'multiple_choice',
  ADD COLUMN IF NOT EXISTS explanation text;

-- 4. Extend assignments for signoff and versioning
ALTER TABLE public.training_assignments
  ADD COLUMN IF NOT EXISTS signoff_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS signoff_status text,
  ADD COLUMN IF NOT EXISTS signed_off_by uuid,
  ADD COLUMN IF NOT EXISTS signed_off_at timestamptz,
  ADD COLUMN IF NOT EXISTS signoff_checklist jsonb,
  ADD COLUMN IF NOT EXISTS module_version integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_mandatory boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS score numeric;

-- 5. Signoff templates table
CREATE TABLE IF NOT EXISTS public.training_signoff_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.training_library(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id),
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.training_signoff_templates ENABLE ROW LEVEL SECURITY;

-- 6. Training files table
CREATE TABLE IF NOT EXISTS public.training_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.training_library(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size integer,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.training_files ENABLE ROW LEVEL SECURITY;

-- 7. RLS for new tables
CREATE POLICY "select_signoff_templates" ON public.training_signoff_templates
  FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));
CREATE POLICY "insert_signoff_templates" ON public.training_signoff_templates
  FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin() OR (tenant_id IS NOT NULL AND public.is_tenant_admin(tenant_id)));
CREATE POLICY "update_signoff_templates" ON public.training_signoff_templates
  FOR UPDATE TO authenticated USING (public.is_platform_admin() OR (tenant_id IS NOT NULL AND public.is_tenant_admin(tenant_id)));
CREATE POLICY "delete_signoff_templates" ON public.training_signoff_templates
  FOR DELETE TO authenticated USING (public.is_platform_admin() OR (tenant_id IS NOT NULL AND public.is_tenant_admin(tenant_id)));

CREATE POLICY "select_training_files" ON public.training_files
  FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));
CREATE POLICY "insert_training_files" ON public.training_files
  FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin() OR (tenant_id IS NOT NULL AND public.is_tenant_admin(tenant_id)));
CREATE POLICY "update_training_files" ON public.training_files
  FOR UPDATE TO authenticated USING (public.is_platform_admin() OR (tenant_id IS NOT NULL AND public.is_tenant_admin(tenant_id)));
CREATE POLICY "delete_training_files" ON public.training_files
  FOR DELETE TO authenticated USING (public.is_platform_admin() OR (tenant_id IS NOT NULL AND public.is_tenant_admin(tenant_id)));

-- 8. Update training_library SELECT RLS to include platform modules
DROP POLICY IF EXISTS "Authenticated users can view training library" ON public.training_library;
DROP POLICY IF EXISTS "tenant_member_select_training_library" ON public.training_library;
DROP POLICY IF EXISTS "Tenant members can read library" ON public.training_library;
DROP POLICY IF EXISTS "Members can read library items" ON public.training_library;
CREATE POLICY "select_training_library_v2" ON public.training_library
  FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));

-- Platform admin full access for platform modules
DROP POLICY IF EXISTS "platform_admin_insert_training_library" ON public.training_library;
CREATE POLICY "platform_admin_insert_training_library" ON public.training_library
  FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin() OR (tenant_id IS NOT NULL AND public.is_tenant_admin(tenant_id)));

DROP POLICY IF EXISTS "platform_admin_update_training_library" ON public.training_library;
CREATE POLICY "platform_admin_update_training_library" ON public.training_library
  FOR UPDATE TO authenticated USING (public.is_platform_admin() OR (tenant_id IS NOT NULL AND public.is_tenant_admin(tenant_id)));

-- 9. Update quiz questions RLS
DROP POLICY IF EXISTS "Authenticated users can view quiz questions" ON public.training_quiz_questions;
DROP POLICY IF EXISTS "tenant_member_select_quiz" ON public.training_quiz_questions;
CREATE POLICY "select_quiz_questions_v2" ON public.training_quiz_questions
  FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "manage_quiz_questions" ON public.training_quiz_questions;
CREATE POLICY "insert_quiz_questions" ON public.training_quiz_questions
  FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin() OR (tenant_id IS NOT NULL AND public.is_tenant_admin(tenant_id)));
DROP POLICY IF EXISTS "update_quiz_questions" ON public.training_quiz_questions;
CREATE POLICY "update_quiz_questions" ON public.training_quiz_questions
  FOR UPDATE TO authenticated USING (public.is_platform_admin() OR (tenant_id IS NOT NULL AND public.is_tenant_admin(tenant_id)));
DROP POLICY IF EXISTS "delete_quiz_questions" ON public.training_quiz_questions;
CREATE POLICY "delete_quiz_questions" ON public.training_quiz_questions
  FOR DELETE TO authenticated USING (public.is_platform_admin() OR (tenant_id IS NOT NULL AND public.is_tenant_admin(tenant_id)));

-- 10. Seed platform standard modules with quiz questions
DO $$
DECLARE
  _mod_id uuid;
BEGIN
  -- Company Induction Basics
  INSERT INTO public.training_library (tenant_id, title, description, summary, category, content_type, source_type, status, completion_type, audience_scope, requires_acknowledgement, requires_completion, requires_quiz, counts_toward_readiness, is_mandatory, is_active, version, target_roles, target_departments, target_locations, refresher_days, estimated_minutes, pass_mark, published_at)
  VALUES (NULL, 'Company Induction Basics', 'Essential information for all new team members.', 'Covers company values, policies, dress code, communication channels, and expectations for your first week.', 'induction', 'document', 'platform', 'published', 'blended', 'all_staff', true, true, true, true, true, true, 1, '{}', '{}', '{}', 365, 30, 70, now())
  RETURNING id INTO _mod_id;
  INSERT INTO public.training_quiz_questions (document_id, tenant_id, question, question_type, options, correct_option, explanation, display_order) VALUES
  (_mod_id, NULL, 'What should you do if you are running late for your shift?', 'multiple_choice', '["Just arrive when you can","Notify your manager as soon as possible","Ask a colleague to cover without telling anyone","Skip the shift"]', 1, 'Always notify your manager as early as possible if you will be late.', 1),
  (_mod_id, NULL, 'Company uniform must be clean and presentable at all times.', 'multiple_choice', '["True","False"]', 0, 'Maintaining a professional appearance is part of company policy.', 2),
  (_mod_id, NULL, 'Who should you report a workplace concern to first?', 'multiple_choice', '["A customer","Your direct manager or supervisor","Social media","Nobody"]', 1, 'Your direct manager or supervisor is your first point of contact.', 3),
  (_mod_id, NULL, 'Mobile phones are allowed during service.', 'multiple_choice', '["True","False"]', 1, 'Mobile phone use during service is restricted to emergencies only.', 4),
  (_mod_id, NULL, 'What is the purpose of a probation period?', 'multiple_choice', '["To make staff nervous","To assess mutual fit","To reduce pay","It has no purpose"]', 1, 'Probation allows both parties to assess whether the role is a good fit.', 5);

  -- Allergen Awareness
  INSERT INTO public.training_library (tenant_id, title, description, summary, category, content_type, source_type, status, completion_type, audience_scope, requires_acknowledgement, requires_completion, requires_quiz, counts_toward_readiness, is_mandatory, is_active, version, target_roles, target_departments, target_locations, refresher_days, estimated_minutes, pass_mark, published_at)
  VALUES (NULL, 'Allergen Awareness', 'Understanding the 14 major allergens and safe communication.', 'Covers all 14 allergens, cross-contamination risks, customer communication, and legal requirements under UK food law.', 'compliance', 'document', 'platform', 'published', 'quiz', 'all_staff', true, true, true, true, true, true, 1, '{}', '{}', '{}', 180, 25, 80, now())
  RETURNING id INTO _mod_id;
  INSERT INTO public.training_quiz_questions (document_id, tenant_id, question, question_type, options, correct_option, explanation, display_order) VALUES
  (_mod_id, NULL, 'How many major allergens must be declared under UK food law?', 'multiple_choice', '["10","12","14","16"]', 2, 'There are 14 major allergens that must be declared.', 1),
  (_mod_id, NULL, 'Which is NOT one of the 14 major allergens?', 'multiple_choice', '["Celery","Strawberry","Lupin","Mustard"]', 1, 'Strawberry is not one of the 14 major allergens.', 2),
  (_mod_id, NULL, 'What should you do if a customer asks about allergens?', 'multiple_choice', '["Guess based on what you think","Check with kitchen and allergen matrix","Say it is probably fine","Suggest something else"]', 1, 'Always check with the kitchen and use the allergen matrix.', 3),
  (_mod_id, NULL, 'Cross-contamination can occur through shared equipment.', 'multiple_choice', '["True","False"]', 0, 'Shared equipment can transfer allergens between dishes.', 4),
  (_mod_id, NULL, 'Allergen information must be available:', 'multiple_choice', '["Only if asked","At all times","Only for pre-packed food","Only at dinner"]', 1, 'Allergen information must be available at all times.', 5);

  -- Food Safety & Hygiene
  INSERT INTO public.training_library (tenant_id, title, description, summary, category, content_type, source_type, status, completion_type, audience_scope, requires_acknowledgement, requires_completion, requires_quiz, counts_toward_readiness, is_mandatory, is_active, version, target_roles, target_departments, target_locations, refresher_days, estimated_minutes, pass_mark, published_at)
  VALUES (NULL, 'Food Safety & Hygiene', 'Fundamental food safety for all staff.', 'Covers temperature control, personal hygiene, cleaning schedules, pest awareness, and HACCP principles.', 'compliance', 'document', 'platform', 'published', 'quiz', 'all_staff', true, true, true, true, true, true, 1, '{}', '{}', '{}', 365, 30, 80, now())
  RETURNING id INTO _mod_id;
  INSERT INTO public.training_quiz_questions (document_id, tenant_id, question, question_type, options, correct_option, explanation, display_order) VALUES
  (_mod_id, NULL, 'What is the danger zone temperature range?', 'multiple_choice', '["0-5°C","5-63°C","63-75°C","75-100°C"]', 1, 'The danger zone is 5°C to 63°C.', 1),
  (_mod_id, NULL, 'How long should you wash your hands for?', 'multiple_choice', '["5 seconds","10 seconds","20 seconds","1 minute"]', 2, 'Wash hands for at least 20 seconds.', 2),
  (_mod_id, NULL, 'What does FIFO stand for?', 'multiple_choice', '["First In First Out","Food Inspection For Operations","Fresh Items From Outside","Final Inventory"]', 0, 'FIFO ensures older stock is used first.', 3),
  (_mod_id, NULL, 'When must you wash your hands?', 'multiple_choice', '["Only before work","After raw meat, toilet, touching face, handling waste","Only when dirty","Once per hour"]', 1, 'Wash after any contamination risk activity.', 4),
  (_mod_id, NULL, 'Reheated food must reach at least:', 'multiple_choice', '["55°C","63°C","70°C","75°C"]', 3, 'Reheated food must reach 75°C core temperature.', 5);

  -- Health & Safety Basics
  INSERT INTO public.training_library (tenant_id, title, description, summary, category, content_type, source_type, status, completion_type, audience_scope, requires_acknowledgement, requires_completion, requires_quiz, counts_toward_readiness, is_mandatory, is_active, version, target_roles, target_departments, target_locations, refresher_days, estimated_minutes, pass_mark, published_at)
  VALUES (NULL, 'Health & Safety Basics', 'Core health and safety responsibilities.', 'Covers slip/trip prevention, manual handling, COSHH basics, reporting, and PPE.', 'health_and_safety', 'document', 'platform', 'published', 'quiz', 'all_staff', true, true, true, true, true, true, 1, '{}', '{}', '{}', 365, 20, 75, now())
  RETURNING id INTO _mod_id;
  INSERT INTO public.training_quiz_questions (document_id, tenant_id, question, question_type, options, correct_option, explanation, display_order) VALUES
  (_mod_id, NULL, 'What does COSHH stand for?', 'multiple_choice', '["Control Of Substances Hazardous to Health","Cleaning Of Surfaces","Certificate Of Safety","Control Of Staff Health"]', 0, 'COSHH: Control Of Substances Hazardous to Health.', 1),
  (_mod_id, NULL, 'A wet floor sign should be placed:', 'multiple_choice', '["Only during mopping","Whenever the floor is wet","Only in kitchen","Only at closing"]', 1, 'Display whenever there is a slip risk.', 2),
  (_mod_id, NULL, 'Correct lifting technique:', 'multiple_choice', '["Bend at waist","Bend knees, straight back, lift with legs","Twist while lifting","Lift fast"]', 1, 'Bend knees, keep back straight.', 3),
  (_mod_id, NULL, 'Who is responsible for H&S?', 'multiple_choice', '["Only the manager","Only H&S officer","Everyone","Only new starters"]', 2, 'Health and safety is everyone''s responsibility.', 4),
  (_mod_id, NULL, 'Near-misses should be reported:', 'multiple_choice', '["Only if someone injured","Always","Only if manager saw","Never if no damage"]', 1, 'Always report near-misses.', 5);

  -- Fire Safety & Evacuation
  INSERT INTO public.training_library (tenant_id, title, description, summary, category, content_type, source_type, status, completion_type, audience_scope, requires_acknowledgement, requires_completion, requires_quiz, counts_toward_readiness, is_mandatory, is_active, version, target_roles, target_departments, target_locations, refresher_days, estimated_minutes, pass_mark, published_at)
  VALUES (NULL, 'Fire Safety & Evacuation', 'Fire prevention, detection, and evacuation.', 'Covers fire triangle, extinguisher types, evacuation routes, assembly points, and responsibilities.', 'health_and_safety', 'document', 'platform', 'published', 'blended', 'all_staff', true, true, true, true, true, true, 1, '{}', '{}', '{}', 365, 20, 80, now())
  RETURNING id INTO _mod_id;
  INSERT INTO public.training_quiz_questions (document_id, tenant_id, question, question_type, options, correct_option, explanation, display_order) VALUES
  (_mod_id, NULL, 'What are the three elements of the fire triangle?', 'multiple_choice', '["Water, smoke, heat","Heat, fuel, oxygen","Electricity, gas, wood","Flame, spark, wind"]', 1, 'Heat, fuel, and oxygen.', 1),
  (_mod_id, NULL, 'First action when you discover a fire?', 'multiple_choice', '["Put it out","Raise the alarm","Continue working","Call a colleague"]', 1, 'Always raise the alarm first.', 2),
  (_mod_id, NULL, 'CO2 extinguisher colour band?', 'multiple_choice', '["Red","Cream","Blue","Black"]', 3, 'CO2 extinguishers have a black band.', 3),
  (_mod_id, NULL, 'Use the lift during fire evacuation.', 'multiple_choice', '["True","False"]', 1, 'Never use lifts. Always use stairs.', 4),
  (_mod_id, NULL, 'After evacuating go to:', 'multiple_choice', '["Back inside","Nearest pub","Assembly point","Your car"]', 2, 'Go to the designated assembly point.', 5);

  -- Customer Service Foundations (no quiz)
  INSERT INTO public.training_library (tenant_id, title, description, summary, category, content_type, source_type, status, completion_type, audience_scope, requires_acknowledgement, requires_completion, requires_quiz, counts_toward_readiness, is_mandatory, is_active, version, target_roles, target_departments, target_locations, refresher_days, estimated_minutes, pass_mark, published_at)
  VALUES (NULL, 'Customer Service Foundations', 'Building excellent customer experiences.', 'Covers greeting standards, body language, active listening, special requests, and memorable moments.', 'training', 'document', 'platform', 'published', 'read_acknowledge', 'all_staff', true, true, false, false, false, true, 1, '{}', '{"FOH"}', '{}', 180, 20, 70, now());

  -- Handling Complaints Professionally
  INSERT INTO public.training_library (tenant_id, title, description, summary, category, content_type, source_type, status, completion_type, audience_scope, requires_acknowledgement, requires_completion, requires_quiz, counts_toward_readiness, is_mandatory, is_active, version, target_roles, target_departments, target_locations, refresher_days, estimated_minutes, pass_mark, published_at)
  VALUES (NULL, 'Handling Complaints Professionally', 'Managing complaints with confidence.', 'Covers LAST method, de-escalation, empowerment boundaries, escalation procedures, and recovery.', 'training', 'document', 'platform', 'published', 'blended', 'all_staff', true, true, true, true, false, true, 1, '{}', '{"FOH"}', '{}', 180, 25, 75, now())
  RETURNING id INTO _mod_id;
  INSERT INTO public.training_quiz_questions (document_id, tenant_id, question, question_type, options, correct_option, explanation, display_order) VALUES
  (_mod_id, NULL, 'What does LAST stand for?', 'multiple_choice', '["Listen Apologise Solve Thank","Look Ask Send Tell","Leave Accept Stop Transfer","Listen Act Support Track"]', 0, 'LAST: Listen, Apologise, Solve, Thank.', 1),
  (_mod_id, NULL, 'When a customer complains, first:', 'multiple_choice', '["Explain why","Listen without interrupting","Offer discount","Call manager"]', 1, 'Listen first. Let them express their concern.', 2),
  (_mod_id, NULL, 'Take complaints personally.', 'multiple_choice', '["True","False"]', 1, 'Never take complaints personally.', 3),
  (_mod_id, NULL, 'When to escalate?', 'multiple_choice', '["Always","When beyond your authority or customer asks","Never","Only if angry"]', 1, 'Escalate when beyond your empowerment level.', 4),
  (_mod_id, NULL, 'After resolving a complaint:', 'multiple_choice', '["Forget about it","Follow up to ensure satisfaction","Avoid the customer","Complain to colleagues"]', 1, 'Follow up to ensure the resolution was effective.', 5);

  -- Upselling Without Pressure (no quiz)
  INSERT INTO public.training_library (tenant_id, title, description, summary, category, content_type, source_type, status, completion_type, audience_scope, requires_acknowledgement, requires_completion, requires_quiz, counts_toward_readiness, is_mandatory, is_active, version, target_roles, target_departments, target_locations, refresher_days, estimated_minutes, pass_mark, published_at)
  VALUES (NULL, 'Upselling Without Pressure', 'Suggestive selling that enhances the experience.', 'Covers reading the table, menu knowledge, pairing suggestions, timing, and conversation techniques.', 'training', 'document', 'platform', 'published', 'read_acknowledge', 'all_staff', true, true, false, false, false, true, 1, '{}', '{"FOH"}', '{}', 90, 15, 70, now());

  -- Delay Communication (no quiz)
  INSERT INTO public.training_library (tenant_id, title, description, summary, category, content_type, source_type, status, completion_type, audience_scope, requires_acknowledgement, requires_completion, requires_quiz, counts_toward_readiness, is_mandatory, is_active, version, target_roles, target_departments, target_locations, refresher_days, estimated_minutes, pass_mark, published_at)
  VALUES (NULL, 'Delay Communication Standards', 'Managing and communicating delays.', 'Covers proactive communication, timing expectations, kitchen coordination, and positive experiences.', 'sop', 'document', 'platform', 'published', 'read_acknowledge', 'all_staff', true, false, false, false, false, true, 1, '{}', '{"FOH"}', '{}', 180, 10, 70, now());

  -- Food Presentation (practical signoff)
  INSERT INTO public.training_library (tenant_id, title, description, summary, category, content_type, source_type, status, completion_type, audience_scope, requires_acknowledgement, requires_completion, requires_quiz, counts_toward_readiness, is_mandatory, is_active, version, target_roles, target_departments, target_locations, refresher_days, estimated_minutes, pass_mark, published_at)
  VALUES (NULL, 'Food Presentation Standards', 'Visual standards for plating and presentation.', 'Covers plate composition, garnishing, portion consistency, temperature checks, and photo standards.', 'sop', 'document', 'platform', 'published', 'practical_signoff', 'all_staff', false, true, false, true, false, true, 1, '{}', '{"BOH"}', '{}', 90, 15, 70, now());

  -- Opening and Closing
  INSERT INTO public.training_library (tenant_id, title, description, summary, category, content_type, source_type, status, completion_type, audience_scope, requires_acknowledgement, requires_completion, requires_quiz, counts_toward_readiness, is_mandatory, is_active, version, target_roles, target_departments, target_locations, refresher_days, estimated_minutes, pass_mark, published_at)
  VALUES (NULL, 'Opening and Closing Discipline', 'Standard opening and closing procedures.', 'Covers pre-service checks, equipment startup, closing cleaning, cash handling, and security.', 'sop', 'document', 'platform', 'published', 'blended', 'all_staff', true, true, true, true, true, true, 1, '{}', '{}', '{}', 180, 20, 75, now())
  RETURNING id INTO _mod_id;
  INSERT INTO public.training_quiz_questions (document_id, tenant_id, question, question_type, options, correct_option, explanation, display_order) VALUES
  (_mod_id, NULL, 'Before opening, check:', 'multiple_choice', '["Nothing","Cleanliness, equipment, stock, safety","Music playlist","Weather"]', 1, 'Check cleanliness, equipment, stock, and safety.', 1),
  (_mod_id, NULL, 'Cash should be counted:', 'multiple_choice', '["Weekly","At opening and closing","Only when discrepancies","Monthly"]', 1, 'Count at both opening and closing.', 2),
  (_mod_id, NULL, 'Secure all doors and windows at closing.', 'multiple_choice', '["True","False"]', 0, 'Security is critical at closing.', 3);

  -- Cleaning and Sanitation
  INSERT INTO public.training_library (tenant_id, title, description, summary, category, content_type, source_type, status, completion_type, audience_scope, requires_acknowledgement, requires_completion, requires_quiz, counts_toward_readiness, is_mandatory, is_active, version, target_roles, target_departments, target_locations, refresher_days, estimated_minutes, pass_mark, published_at)
  VALUES (NULL, 'Cleaning and Sanitation Basics', 'Cleaning standards and sanitisation.', 'Covers cleaning schedules, chemical safety, sanitiser concentrations, deep cleaning, and documentation.', 'compliance', 'document', 'platform', 'published', 'quiz', 'all_staff', true, true, true, true, true, true, 1, '{}', '{}', '{}', 365, 20, 80, now())
  RETURNING id INTO _mod_id;
  INSERT INTO public.training_quiz_questions (document_id, tenant_id, question, question_type, options, correct_option, explanation, display_order) VALUES
  (_mod_id, NULL, 'Difference between cleaning and sanitising?', 'multiple_choice', '["Same thing","Cleaning removes dirt; sanitising reduces bacteria","Sanitising is only for hands","Cleaning is only for floors"]', 1, 'Cleaning removes dirt; sanitising reduces bacteria to safe levels.', 1),
  (_mod_id, NULL, 'How should chemicals be stored?', 'multiple_choice', '["Next to food","Locked labelled cupboard away from food","Under sink","Anywhere convenient"]', 1, 'Chemicals in locked, labelled area away from food.', 2),
  (_mod_id, NULL, 'A cleaning schedule should specify:', 'multiple_choice', '["What, when, how, who","Only what","Only time","Just the chemical"]', 0, 'Covers what, when, how, who, and chemicals.', 3),
  (_mod_id, NULL, 'Colour-coded cloths prevent:', 'multiple_choice', '["Confusion","Cross-contamination","Using too many","Stock issues"]', 1, 'Colour coding prevents cross-contamination.', 4),
  (_mod_id, NULL, 'Food surfaces should be sanitised:', 'multiple_choice', '["Weekly","Between tasks and every 4 hours minimum","At closing","Only when dirty"]', 1, 'Sanitise between tasks and at regular intervals.', 5);

  -- Incident Reporting (no quiz)
  INSERT INTO public.training_library (tenant_id, title, description, summary, category, content_type, source_type, status, completion_type, audience_scope, requires_acknowledgement, requires_completion, requires_quiz, counts_toward_readiness, is_mandatory, is_active, version, target_roles, target_departments, target_locations, refresher_days, estimated_minutes, pass_mark, published_at)
  VALUES (NULL, 'Incident Reporting Basics', 'Reporting workplace incidents correctly.', 'Covers what constitutes an incident, immediate actions, documentation, RIDDOR basics, and near-miss reporting.', 'health_and_safety', 'document', 'platform', 'published', 'read_acknowledge', 'all_staff', true, true, false, true, true, true, 1, '{}', '{}', '{}', 365, 15, 70, now());

  -- Respectful Workplace (no quiz)
  INSERT INTO public.training_library (tenant_id, title, description, summary, category, content_type, source_type, status, completion_type, audience_scope, requires_acknowledgement, requires_completion, requires_quiz, counts_toward_readiness, is_mandatory, is_active, version, target_roles, target_departments, target_locations, refresher_days, estimated_minutes, pass_mark, published_at)
  VALUES (NULL, 'Respectful Workplace Conduct', 'Professional behaviour standards.', 'Covers anti-harassment, equality, communication standards, social media policy, and grievance procedures.', 'policy', 'document', 'platform', 'published', 'read_acknowledge', 'all_staff', true, false, false, false, true, true, 1, '{}', '{}', '{}', 365, 15, 70, now());
END $$;
