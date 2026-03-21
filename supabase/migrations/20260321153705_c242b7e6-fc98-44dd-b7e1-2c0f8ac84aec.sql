
-- Add missing fields to contract_signatures
ALTER TABLE public.contract_signatures
  ADD COLUMN IF NOT EXISTS signing_token_id uuid REFERENCES public.signing_tokens(id),
  ADD COLUMN IF NOT EXISTS signed_by_email text,
  ADD COLUMN IF NOT EXISTS signature_type text DEFAULT 'drawn',
  ADD COLUMN IF NOT EXISTS typed_name text,
  ADD COLUMN IF NOT EXISTS consent_given boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS document_hash text;

-- Add missing fields to signing_tokens
ALTER TABLE public.signing_tokens
  ADD COLUMN IF NOT EXISTS used_by_ip text,
  ADD COLUMN IF NOT EXISTS used_by_user_agent text;

-- Add missing fields to employee_documents
ALTER TABLE public.employee_documents
  ADD COLUMN IF NOT EXISTS final_signed_pdf_url text,
  ADD COLUMN IF NOT EXISTS final_document_hash text;
