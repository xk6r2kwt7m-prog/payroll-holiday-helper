
-- Create storage bucket for payroll spreadsheets
INSERT INTO storage.buckets (id, name, public) VALUES ('payroll-files', 'payroll-files', false);

-- Only admins can view payroll files
CREATE POLICY "Admins can view payroll files"
ON storage.objects FOR SELECT
USING (bucket_id = 'payroll-files' AND public.is_admin());

-- Only admins can upload payroll files
CREATE POLICY "Admins can upload payroll files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payroll-files' AND public.is_admin());

-- Only admins can delete payroll files
CREATE POLICY "Admins can delete payroll files"
ON storage.objects FOR DELETE
USING (bucket_id = 'payroll-files' AND public.is_admin());
