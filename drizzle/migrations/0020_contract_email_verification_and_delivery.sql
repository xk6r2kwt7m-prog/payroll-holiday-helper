-- 0. Extend the record-level labelling allowance on locked contracts so a truthful
-- wording-provenance note may be set once. Files, hashes, terms and wording are still
-- immutable; nothing here can alter a signed PDF.
CREATE OR REPLACE FUNCTION public.protect_locked_contracts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _old_rest jsonb;
  _new_rest jsonb;
BEGIN
  IF COALESCE(OLD.document_type::text, '') <> 'contract' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.contract_state IN ('signed','superseded','terminated') THEN
      RAISE EXCEPTION 'Contract is locked (state=%) and cannot be deleted. Create an amendment or terminate instead.', OLD.contract_state;
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.contract_state = 'signed' THEN
    IF NEW.contract_state = 'superseded' AND NEW.superseded_by IS NOT NULL AND OLD.superseded_by IS NULL THEN
      IF NEW.file_path IS DISTINCT FROM OLD.file_path
         OR NEW.final_signed_pdf_url IS DISTINCT FROM OLD.final_signed_pdf_url
         OR NEW.final_document_hash IS DISTINCT FROM OLD.final_document_hash
         OR NEW.terms_snapshot IS DISTINCT FROM OLD.terms_snapshot
         OR NEW.extracted_data IS DISTINCT FROM OLD.extracted_data THEN
        RAISE EXCEPTION 'Cannot modify immutable fields on a signed contract.';
      END IF;
      RETURN NEW;
    ELSIF NEW.contract_state = 'terminated' AND NEW.terminated_at IS NOT NULL AND OLD.terminated_at IS NULL THEN
      IF NEW.file_path IS DISTINCT FROM OLD.file_path
         OR NEW.final_signed_pdf_url IS DISTINCT FROM OLD.final_signed_pdf_url
         OR NEW.final_document_hash IS DISTINCT FROM OLD.final_document_hash
         OR NEW.terms_snapshot IS DISTINCT FROM OLD.terms_snapshot THEN
        RAISE EXCEPTION 'Cannot modify immutable fields on a signed contract.';
      END IF;
      RETURN NEW;
    END IF;

    -- Record-level labelling only: reference, legacy note and wording provenance may be set once.
    _old_rest := (to_jsonb(OLD) - 'contract_reference' - 'legacy_origin_note' - 'wording_provenance' - 'updated_at');
    _new_rest := (to_jsonb(NEW) - 'contract_reference' - 'legacy_origin_note' - 'wording_provenance' - 'updated_at');

    IF _old_rest = _new_rest
       AND (OLD.contract_reference IS NULL OR NEW.contract_reference IS NOT DISTINCT FROM OLD.contract_reference)
       AND (OLD.legacy_origin_note IS NULL OR NEW.legacy_origin_note IS NOT DISTINCT FROM OLD.legacy_origin_note)
       AND (OLD.wording_provenance IS NULL OR NEW.wording_provenance IS NOT DISTINCT FROM OLD.wording_provenance) THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Contract is signed and locked. Create an amendment to make changes.';
  END IF;

  IF OLD.contract_state IN ('superseded','terminated') THEN
    IF NEW.contract_state IS DISTINCT FROM OLD.contract_state
       OR NEW.file_path IS DISTINCT FROM OLD.file_path
       OR NEW.final_signed_pdf_url IS DISTINCT FROM OLD.final_signed_pdf_url
       OR NEW.final_document_hash IS DISTINCT FROM OLD.final_document_hash
       OR NEW.terms_snapshot IS DISTINCT FROM OLD.terms_snapshot
       OR NEW.extracted_data IS DISTINCT FROM OLD.extracted_data THEN
      RAISE EXCEPTION 'Contract is % and is read-only.', OLD.contract_state;
    END IF;

    IF OLD.contract_reference IS NOT NULL AND NEW.contract_reference IS DISTINCT FROM OLD.contract_reference THEN
      RAISE EXCEPTION 'The contract reference cannot be changed once assigned.';
    END IF;

    IF OLD.wording_provenance IS NOT NULL AND NEW.wording_provenance IS DISTINCT FROM OLD.wording_provenance THEN
      RAISE EXCEPTION 'The wording provenance note cannot be changed once recorded.';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 1. One-time code verification of a changed signer email address.
CREATE TABLE IF NOT EXISTS public.contract_email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  employee_document_id uuid NOT NULL REFERENCES public.employee_documents(id) ON DELETE CASCADE,
  signing_token_id uuid REFERENCES public.signing_tokens(id) ON DELETE SET NULL,
  signer_type text NOT NULL,
  email text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_email_verifications_lookup
  ON public.contract_email_verifications (signing_token_id, email);

GRANT SELECT ON public.contract_email_verifications TO authenticated;
GRANT ALL ON public.contract_email_verifications TO service_role;
ALTER TABLE public.contract_email_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins read contract email verifications"
ON public.contract_email_verifications FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tenant_members m
  WHERE m.tenant_id = contract_email_verifications.tenant_id
    AND m.user_id = auth.uid()
    AND m.is_active = true
    AND m.role IN ('company_admin','manager')
));

-- 2. Every delivery attempt of a completed contract, success or failure.
CREATE TABLE IF NOT EXISTS public.contract_delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  employee_document_id uuid NOT NULL REFERENCES public.employee_documents(id) ON DELETE CASCADE,
  recipient_role text NOT NULL,
  recipient_email text NOT NULL,
  delivery_method text NOT NULL DEFAULT 'secure_link',
  status text NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  error_message text,
  trigger_source text NOT NULL DEFAULT 'automatic',
  attempted_by uuid,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_delivery_attempts_doc
  ON public.contract_delivery_attempts (employee_document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contract_delivery_attempts_open_failures
  ON public.contract_delivery_attempts (tenant_id, status) WHERE resolved_at IS NULL;

GRANT SELECT, UPDATE ON public.contract_delivery_attempts TO authenticated;
GRANT ALL ON public.contract_delivery_attempts TO service_role;
ALTER TABLE public.contract_delivery_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins read contract delivery attempts"
ON public.contract_delivery_attempts FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tenant_members m
  WHERE m.tenant_id = contract_delivery_attempts.tenant_id
    AND m.user_id = auth.uid()
    AND m.is_active = true
    AND m.role IN ('company_admin','manager')
));

CREATE POLICY "Tenant admins resolve contract delivery failures"
ON public.contract_delivery_attempts FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tenant_members m
  WHERE m.tenant_id = contract_delivery_attempts.tenant_id
    AND m.user_id = auth.uid()
    AND m.is_active = true
    AND m.role IN ('company_admin','manager')
));

-- 3. Truthful wording provenance. Nothing is back-dated: contracts generated before
-- template versioning existed are labelled as legacy, with the signed PDF authoritative.
ALTER TABLE public.employee_documents
  ADD COLUMN IF NOT EXISTS wording_provenance text;

UPDATE public.employee_documents
SET wording_provenance = 'Legacy contract — authoritative wording contained in the preserved signed PDF; no contemporaneous template-version record.'
WHERE document_type::text = 'contract'
  AND wording_provenance IS NULL
  AND template_version IS NULL
  AND terms_snapshot IS NULL;

-- 4. Ownership of a changed signer address is proven by a one-time code, never by typing it.
ALTER TABLE public.contract_signatures
  ADD COLUMN IF NOT EXISTS email_ownership_verified boolean NOT NULL DEFAULT false;