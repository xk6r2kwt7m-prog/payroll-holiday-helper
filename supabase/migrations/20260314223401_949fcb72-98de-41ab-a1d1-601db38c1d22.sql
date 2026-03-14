ALTER TABLE public.training_library
  ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'document',
  ADD COLUMN IF NOT EXISTS content_url text;

COMMENT ON COLUMN public.training_library.content_type IS 'document | internal_page | external_link';
COMMENT ON COLUMN public.training_library.content_url IS 'Route path for internal_page, URL for external_link, null for document';