
ALTER TABLE public.employee_documents
ADD COLUMN IF NOT EXISTS employer_signatory_name text,
ADD COLUMN IF NOT EXISTS employer_signatory_email text,
ADD COLUMN IF NOT EXISTS employer_signatory_source text DEFAULT 'default';

COMMENT ON COLUMN public.employee_documents.employer_signatory_name IS 'The employer signatory name used for this specific contract';
COMMENT ON COLUMN public.employee_documents.employer_signatory_email IS 'The employer signatory email used for this specific contract';
COMMENT ON COLUMN public.employee_documents.employer_signatory_source IS 'Whether default or override was used: default, override';
