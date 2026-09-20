ALTER TABLE public.training_records
  ADD COLUMN IF NOT EXISTS review_due_date date;

COMMENT ON COLUMN public.training_records.review_due_date IS
  'Refresher review date for qualifications that carry no legal expiry (for example Level 2 Food Safety, where environmental health officers expect a refresher every three years). Never implies the certificate has expired.';