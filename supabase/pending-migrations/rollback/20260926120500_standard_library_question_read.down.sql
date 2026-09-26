-- Removes only the standard-library read policy added by the 20260926120500 amendment. No rows touched.
BEGIN;
DROP POLICY IF EXISTS assessment_authors_read_standard ON public.training_quiz_questions;
COMMIT;
