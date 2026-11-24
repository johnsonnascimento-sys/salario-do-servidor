-- Remove the TRT-2 calculator registration and its agency-specific records.
-- Saved payslips and shared PJU rules are independent of these registrations.
DO $migration$
BEGIN
  DELETE FROM public.salary_tables WHERE agency_id IN (SELECT id FROM public.agencies WHERE slug = 'trt2');
  DELETE FROM public.tax_rules WHERE agency_id IN (SELECT id FROM public.agencies WHERE slug = 'trt2');
  DELETE FROM public.agencies WHERE slug = 'trt2';
  DELETE FROM public.org_config WHERE org_slug = 'trt2';
  DELETE FROM public.courts WHERE slug = 'trt2';
END
$migration$;
