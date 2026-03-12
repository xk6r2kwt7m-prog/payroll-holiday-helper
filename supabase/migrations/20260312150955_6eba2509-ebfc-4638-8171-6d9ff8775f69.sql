
-- Step 1: Convert branch_type enum columns to text across all tables
-- This allows each tenant to define their own branch/location names

-- branch_locations.branch
ALTER TABLE public.branch_locations ALTER COLUMN branch TYPE text USING branch::text;

-- employee_branches.branch  
ALTER TABLE public.employee_branches ALTER COLUMN branch TYPE text USING branch::text;

-- location_settings.branch
ALTER TABLE public.location_settings ALTER COLUMN branch TYPE text USING branch::text;

-- shifts.branch
ALTER TABLE public.shifts ALTER COLUMN branch TYPE text USING branch::text;

-- time_entries.branch
ALTER TABLE public.time_entries ALTER COLUMN branch TYPE text USING branch::text;

-- employees.department (keep as-is for now, department_type is more universal: FOH/BOH/CPU)

-- Drop the old enum type (no longer needed)
DROP TYPE IF EXISTS public.branch_type;

-- Add tenant_id filter index on location_settings for performance
CREATE INDEX IF NOT EXISTS idx_location_settings_tenant ON public.location_settings(tenant_id);

-- Add tenant_id filter index on branch_locations for performance  
CREATE INDEX IF NOT EXISTS idx_branch_locations_tenant ON public.branch_locations(tenant_id);
