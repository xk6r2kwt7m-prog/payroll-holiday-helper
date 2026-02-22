-- Add sales revenue column to payroll_periods for labour cost analysis
ALTER TABLE public.payroll_periods
ADD COLUMN sales_total numeric DEFAULT 0;

-- Add number of weeks column for normalisation (4-week vs 5-week periods)
ALTER TABLE public.payroll_periods
ADD COLUMN period_weeks numeric DEFAULT 4;