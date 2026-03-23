ALTER TABLE public.signing_tokens
DROP CONSTRAINT IF EXISTS signing_tokens_signer_type_check;

ALTER TABLE public.signing_tokens
ADD CONSTRAINT signing_tokens_signer_type_check
CHECK (signer_type = ANY (ARRAY['employee'::text, 'employer'::text, 'download'::text]));