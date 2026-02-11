
-- Table to store contract signatures (employee + employer)
CREATE TABLE public.contract_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_document_id UUID NOT NULL REFERENCES public.employee_documents(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  signer_type TEXT NOT NULL CHECK (signer_type IN ('employee', 'employer')),
  signer_name TEXT NOT NULL,
  consent_text TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to store secure signing tokens (unique links)
CREATE TABLE public.signing_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  employee_document_id UUID NOT NULL REFERENCES public.employee_documents(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  signer_type TEXT NOT NULL CHECK (signer_type IN ('employee', 'employer')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signing_tokens ENABLE ROW LEVEL SECURITY;

-- Admins can manage signatures
CREATE POLICY "Admins can manage contract signatures"
  ON public.contract_signatures FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Only admins can view contract signatures"
  ON public.contract_signatures FOR SELECT
  USING (is_admin());

-- Admins can manage signing tokens
CREATE POLICY "Admins can manage signing tokens"
  ON public.signing_tokens FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Only admins can view signing tokens"
  ON public.signing_tokens FOR SELECT
  USING (is_admin());

-- Index for fast token lookups
CREATE INDEX idx_signing_tokens_token ON public.signing_tokens(token);
CREATE INDEX idx_contract_signatures_document ON public.contract_signatures(employee_document_id);
