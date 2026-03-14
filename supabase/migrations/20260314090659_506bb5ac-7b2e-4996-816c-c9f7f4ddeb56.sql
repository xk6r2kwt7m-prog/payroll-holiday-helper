
-- Add extraction metadata columns to employee_documents
ALTER TABLE public.employee_documents
  ADD COLUMN IF NOT EXISTS extracted_data jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS extraction_source text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS extraction_confidence numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS extraction_warnings jsonb DEFAULT NULL;

-- Add 'extracted' to document_status options (it's a text column, no enum change needed)
-- The document_status column is already a text column so we just use new values

-- Update document_status default comment: uploaded, extracted, pending_verification, verified, rejected, expired
COMMENT ON COLUMN public.employee_documents.document_status IS 'Status: uploaded, extracted, pending_review, verified, rejected, expired';
COMMENT ON COLUMN public.employee_documents.extracted_data IS 'JSON of AI-extracted fields from document';
COMMENT ON COLUMN public.employee_documents.extraction_source IS 'Source of extraction: ai_vision, mrz, manual';
COMMENT ON COLUMN public.employee_documents.extraction_confidence IS 'Confidence score 0-1 from extraction';
COMMENT ON COLUMN public.employee_documents.extraction_warnings IS 'JSON array of quality/risk warnings';
