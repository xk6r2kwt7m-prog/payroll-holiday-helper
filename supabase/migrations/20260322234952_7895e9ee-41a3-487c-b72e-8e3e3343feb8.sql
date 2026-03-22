-- Add import aliases for employees that appear with different names in Deputy CSV
UPDATE public.employees SET import_aliases = ARRAY['Jinan'] WHERE id = '2338b75c-5355-4f2c-9c93-10b96a05fedf';
UPDATE public.employees SET import_aliases = ARRAY['Larry'] WHERE id = '24603141-dfb1-4635-a4fa-316c91956b76';
UPDATE public.employees SET import_aliases = ARRAY['Paige Murchison'] WHERE id = '84027393-e8b5-40ba-b90c-d4ab8eea4698';
UPDATE public.employees SET import_aliases = ARRAY['Talap'] WHERE id = '16935c1f-924b-42ed-89ab-96a7996c03d2';
UPDATE public.employees SET import_aliases = ARRAY['Joselin Chala'] WHERE id = '1fe0a79c-a84e-43cc-8a00-57ab8d16e1bf';