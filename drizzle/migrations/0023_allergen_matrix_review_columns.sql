-- Additive only: records how each flavour compares with the approved allergen matrix
-- and the management decision for it. No existing column is changed or dropped.

ALTER TABLE public.allergen_dish_reference
  ADD COLUMN IF NOT EXISTS matrix_source_id uuid REFERENCES public.allergen_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS matrix_declaration text,
  ADD COLUMN IF NOT EXISTS garnish_only_allergens text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS removable_components text,
  ADD COLUMN IF NOT EXISTS dough_sauce_allergens text,
  ADD COLUMN IF NOT EXISTS comparison_note text,
  ADD COLUMN IF NOT EXISTS recommended_status text,
  ADD COLUMN IF NOT EXISTS management_decision text,
  ADD COLUMN IF NOT EXISTS decision_note text,
  ADD COLUMN IF NOT EXISTS decided_by uuid,
  ADD COLUMN IF NOT EXISTS decided_at timestamptz;

ALTER TABLE public.allergen_dish_reference
  ADD CONSTRAINT allergen_dish_recommended_status_check
  CHECK (recommended_status IS NULL OR recommended_status = ANY (ARRAY[
    'ready_to_confirm','needs_correction','reference_only','needs_evidence'
  ]));

ALTER TABLE public.allergen_dish_reference
  ADD CONSTRAINT allergen_dish_management_decision_check
  CHECK (management_decision IS NULL OR management_decision = ANY (ARRAY[
    'confirm','correct','reference_only','needs_evidence'
  ]));

CREATE INDEX IF NOT EXISTS allergen_dish_reference_decision_idx
  ON public.allergen_dish_reference (tenant_id, management_decision);