ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS contract_send_mode text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS default_signature_data text,
  ADD COLUMN IF NOT EXISTS default_signature_updated_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_settings_contract_send_mode_chk'
  ) THEN
    ALTER TABLE public.company_settings
      ADD CONSTRAINT company_settings_contract_send_mode_chk
      CHECK (contract_send_mode IN ('manual', 'after_employer_signs'));
  END IF;
END $$;

ALTER TABLE public.employee_documents
  ADD COLUMN IF NOT EXISTS contract_scheduled_send_at timestamptz,
  ADD COLUMN IF NOT EXISTS signed_scan_file_path text,
  ADD COLUMN IF NOT EXISTS signed_scan_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS signed_scan_uploaded_by_signer text;