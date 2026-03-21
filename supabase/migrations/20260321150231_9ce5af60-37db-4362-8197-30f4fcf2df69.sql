ALTER TABLE public.employee_documents
  ADD COLUMN IF NOT EXISTS contract_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_sent_to text,
  ADD COLUMN IF NOT EXISTS contract_send_status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS contract_send_error text,
  ADD COLUMN IF NOT EXISTS contract_last_token_id uuid;