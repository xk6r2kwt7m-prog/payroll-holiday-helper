-- Additive only: allows a controlled pilot assignment to be identified.
-- No existing row, status, value or policy is changed.
alter table public.allergen_assignments
  drop constraint if exists allergen_assignments_assignment_source_check;

alter table public.allergen_assignments
  add constraint allergen_assignments_assignment_source_check
  check (assignment_source = any (array[
    'management_test','direct','role','branch','all_staff','retrain','new_starter','controlled_pilot'
  ]));