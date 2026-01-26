-- Create document type enum
CREATE TYPE public.document_type AS ENUM (
  'contract',
  'id_document',
  'passport',
  'right_to_work',
  'visa',
  'driving_license',
  'bank_statement',
  'p45',
  'p60',
  'other'
);

-- Create employee documents table
CREATE TABLE public.employee_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  document_type public.document_type NOT NULL,
  document_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  expires_at DATE,
  notes TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage employee documents"
  ON public.employee_documents
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Authenticated users can view employee documents"
  ON public.employee_documents
  FOR SELECT
  USING (has_any_role());

-- Create updated_at trigger
CREATE TRIGGER update_employee_documents_updated_at
  BEFORE UPDATE ON public.employee_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for employee documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-documents',
  'employee-documents',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Storage RLS policies
CREATE POLICY "Admins can upload employee documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'employee-documents' AND is_admin());

CREATE POLICY "Admins can update employee documents"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'employee-documents' AND is_admin());

CREATE POLICY "Admins can delete employee documents"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'employee-documents' AND is_admin());

CREATE POLICY "Authenticated users can view employee documents"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'employee-documents' AND has_any_role());