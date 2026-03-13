
-- 1. Create country-aware accrual function
-- Resolves: employee.contract_country → tenant.country → 'GB' fallback
-- Then checks tenant_leave_settings override → country_leave_rules → returns 0 if no rule found
CREATE OR REPLACE FUNCTION public.calculate_country_holiday_accrual(
  _hours_worked numeric,
  _employee_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _contract_country text;
  _tenant_id uuid;
  _entitlement_method text;
  _accrual_rate numeric;
  _tenant_override_rate numeric;
BEGIN
  -- 1. Get employee context
  SELECT e.contract_country, e.tenant_id, e.holiday_entitlement_method
  INTO _contract_country, _tenant_id, _entitlement_method
  FROM employees e
  WHERE e.id = _employee_id;

  -- No employee found → safe zero
  IF _tenant_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Fixed-days entitlement does not accrue from hours worked
  IF _entitlement_method = 'fixed_days' THEN
    RETURN 0;
  END IF;

  -- 2. Resolve country: employee contract_country → tenant country → 'GB'
  IF _contract_country IS NULL OR _contract_country = '' THEN
    SELECT t.country INTO _contract_country
    FROM tenants t WHERE t.id = _tenant_id;
  END IF;

  IF _contract_country IS NULL OR _contract_country = '' THEN
    _contract_country := 'GB';
  END IF;

  -- 3. Check tenant override first (explicit admin configuration wins)
  SELECT tls.accrual_rate INTO _tenant_override_rate
  FROM tenant_leave_settings tls
  WHERE tls.tenant_id = _tenant_id
    AND tls.accrual_rate IS NOT NULL;

  IF _tenant_override_rate IS NOT NULL THEN
    RETURN ROUND(_hours_worked * _tenant_override_rate, 2);
  END IF;

  -- 4. Look up country rule
  SELECT clr.accrual_rate INTO _accrual_rate
  FROM country_leave_rules clr
  WHERE clr.country_code = _contract_country;

  IF _accrual_rate IS NOT NULL THEN
    RETURN ROUND(_hours_worked * _accrual_rate, 2);
  END IF;

  -- 5. No rule found → return 0 (do NOT silently apply UK 12.07%)
  RETURN 0;
END;
$$;

-- 2. Update the trigger function to use country-aware accrual
CREATE OR REPLACE FUNCTION public.set_holiday_accrual()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.holiday_accrued_hours = public.calculate_country_holiday_accrual(
    COALESCE(NEW.imported_hours, NEW.timesheet_hours),
    NEW.employee_id
  );
  RETURN NEW;
END;
$$;

-- 3. Keep the old function for backward compatibility but mark with comment
COMMENT ON FUNCTION public.calculate_holiday_accrual(numeric) IS 'DEPRECATED: Use calculate_country_holiday_accrual(numeric, uuid) for country-aware accrual. Kept for backward compatibility only.';
