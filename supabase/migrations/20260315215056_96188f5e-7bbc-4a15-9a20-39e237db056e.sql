
ALTER TABLE public.training_library 
ADD COLUMN IF NOT EXISTS standards_metadata jsonb DEFAULT NULL;

COMMENT ON COLUMN public.training_library.standards_metadata IS 'UGLŌ Standards Framework metadata: evidence_basis, operational_area, service_risk_level, customer_impact_areas, review_insight_tags, learning_outcomes, quiz_themes, scenario_examples, why_this_matters';
