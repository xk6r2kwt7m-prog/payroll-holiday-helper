-- Protect audit_log from any modifications (even by admins)
-- This ensures audit integrity and prevents evidence tampering

-- Create restrictive policy to prevent UPDATE on audit_log
CREATE POLICY "No one can update audit log"
ON public.audit_log
AS RESTRICTIVE
FOR UPDATE
USING (false);

-- Create restrictive policy to prevent DELETE on audit_log  
CREATE POLICY "No one can delete audit log"
ON public.audit_log
AS RESTRICTIVE
FOR DELETE
USING (false);