ALTER TABLE public.contract_signatures ADD COLUMN IF NOT EXISTS signatory_title text;

ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS default_signatory_title text;

COMMENT ON COLUMN public.contract_signatures.signatory_title IS 'Job title of the signatory (primarily used for employer signers)';
COMMENT ON COLUMN public.company_settings.default_signatory_title IS 'Default job title for the employer signatory';