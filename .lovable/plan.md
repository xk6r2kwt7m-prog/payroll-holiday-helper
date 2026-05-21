# Contract Amendment & Versioning System

Signed contracts become **legally immutable**. Changes flow through new versions linked to the original via a parent chain. Original signed PDFs and signatures are preserved forever.

---

## 1. Contract lifecycle states

Replace the loose `contract_send_status` values with a strict lifecycle stored on `employee_documents`:

| State | Meaning | Editable? |
|---|---|---|
| `draft` | Being prepared, never sent | Fully editable |
| `issued` | Sent for signature, not yet fully signed | Editable but any material change invalidates existing signatures and forces re-issue |
| `signed` | Fully signed by both parties | **Locked** — no edits, amendments only |
| `superseded` | Replaced by a newer version | Locked, read-only history |
| `terminated` | Contract ended (resignation, dismissal, mutual) | Locked, read-only history |

Material fields (trigger signature invalidation on `issued`): salary, hours, role, workplace, start date, probation length, notice period.

---

## 2. Database schema changes

### Migration 1 — Add lifecycle + versioning columns to `employee_documents`

```sql
ALTER TABLE public.employee_documents
  ADD COLUMN contract_state text,                  -- draft | issued | signed | superseded | terminated
  ADD COLUMN version_number int NOT NULL DEFAULT 1,
  ADD COLUMN parent_contract_id uuid REFERENCES public.employee_documents(id),
  ADD COLUMN root_contract_id uuid REFERENCES public.employee_documents(id),  -- top of chain, for fast history queries
  ADD COLUMN superseded_by uuid REFERENCES public.employee_documents(id),
  ADD COLUMN superseded_at timestamptz,
  ADD COLUMN effective_date date,
  ADD COLUMN amendment_type text,                  -- salary | hours | role | workplace | probation | clauses | other
  ADD COLUMN amendment_summary text,
  ADD COLUMN amendment_reason text,
  ADD COLUMN terminated_at timestamptz,
  ADD COLUMN terminated_reason text;

-- Backfill state from existing contract_send_status / final_signed_pdf_url
UPDATE public.employee_documents
SET contract_state = CASE
  WHEN final_signed_pdf_url IS NOT NULL THEN 'signed'
  WHEN contract_send_status IN ('sent','partially_signed') THEN 'issued'
  ELSE 'draft'
END
WHERE document_type = 'contract';

-- Backfill root_contract_id = self for existing rows
UPDATE public.employee_documents SET root_contract_id = id WHERE document_type = 'contract' AND root_contract_id IS NULL;
```

### Migration 2 — Lock signed contracts via trigger

```sql
CREATE FUNCTION public.protect_signed_contracts() RETURNS trigger ...
-- Blocks UPDATE/DELETE on employee_documents where contract_state IN ('signed','superseded','terminated')
-- Allowed transitions:
--   signed → superseded (only when superseded_by is being set)
--   signed → terminated (only when terminated_at is being set)
-- Blocks any change to file_path, final_signed_pdf_url, final_document_hash, extracted_data on locked rows
```

### Migration 3 — Amendment audit table

```sql
CREATE TABLE public.contract_amendments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  previous_contract_id uuid NOT NULL REFERENCES employee_documents(id),
  new_contract_id uuid NOT NULL REFERENCES employee_documents(id),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  amendment_type text NOT NULL,
  field_changes jsonb NOT NULL,    -- [{field, previous_value, new_value}]
  reason text,
  effective_date date NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  employee_resigned_at timestamptz,
  employer_resigned_at timestamptz
);
ALTER TABLE public.contract_amendments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant admins manage amendments" ON public.contract_amendments
  FOR ALL TO authenticated USING (is_tenant_admin(tenant_id)) WITH CHECK (is_tenant_admin(tenant_id));
```

Original signed PDFs stay in `employee-documents` storage bucket untouched. Each version is a separate `employee_documents` row pointing to its own file_path.

---

## 3. Frontend / component changes

### New files
- `src/hooks/useContractAmendments.ts` — list amendments, create amendment, terminate contract
- `src/components/contracts/CreateAmendmentDialog.tsx` — pre-fills from current contract, lets admin change material fields, captures reason + effective_date
- `src/components/contracts/ContractVersionTimeline.tsx` — vertical timeline (v1 signed → v2 amendment pending → v3 active) with status badges
- `src/components/contracts/ContractStateBadge.tsx` — colour-coded badge for the 5 states
- `src/lib/contract-amendments.ts` — pure helpers: `diffContractFields()`, `isMaterialChange()`, `nextVersionNumber()`

### Edited files
- `src/components/contracts/SignedContractsList.tsx` — show state badge, version label, "Create Amendment" / "Terminate" buttons; group by `root_contract_id`
- `src/components/contracts/ContractFormDialog.tsx` — when launched as an amendment, freeze immutable fields (employee, original start date) and show a "what's changing" diff before sending
- `src/components/contracts/ContractPDF.tsx` — render "Amendment #N to contract dated …" header for v>1
- `src/pages/Contracts.tsx` — wire the version timeline into the employee filter view
- `src/components/employees/` profile contracts tab — surface the timeline
- `supabase/functions/sign-contract/index.ts` — on full signature, set `contract_state='signed'`; when amendment is signed, set previous version `contract_state='superseded'`, `superseded_by=new.id`, `superseded_at=now()` in a single transaction

---

## 4. How amendments + signatures work

1. Admin clicks **Create Amendment** on a signed contract.
2. System creates a new `employee_documents` row:
   - `parent_contract_id` = previous version id
   - `root_contract_id` = original v1 id
   - `version_number` = parent.version_number + 1
   - `contract_state` = `draft`
   - `amendment_type`, `amendment_summary`, `effective_date` captured in dialog
3. Admin edits, previews, sends. Same signing flow as a fresh contract.
4. On full signature (both parties), edge function:
   - sets new row to `signed`
   - sets previous row to `superseded`, fills `superseded_by`, `superseded_at`
   - inserts `contract_amendments` row with field diff
5. Material-field changes on an `issued` (not-yet-signed) contract: existing signatures are invalidated (`contract_signatures.invalidated_at` — added in Migration 1), contract returns to `draft`, must be re-issued.

All previous signed PDFs (`final_signed_pdf_url`) and `contract_signatures` rows are **never deleted or mutated**.

---

## 5. UI on employee profile → Contracts

```text
Contract history
─────────────────────────────────────────────
●  v3  Active        Signed 12 May 2026   [View PDF]
│       Amendment: salary £28k → £31k
│
●  v2  Superseded    Signed 03 Jan 2026   [View PDF]
│       Amendment: role Server → Supervisor
│
●  v1  Superseded    Signed 14 Aug 2024   [View PDF]
        Original contract
─────────────────────────────────────────────
[ Create Amendment ]   [ Terminate Contract ]
```

States rendered with `ContractStateBadge`: Draft (grey), Issued / Pending Signature (amber), Active (green), Superseded (slate), Terminated (red outline).

---

## 6. Legal protection

Material amendments (salary, contracted hours, workplace, role) **cannot become active without the employee re-signing** — enforced by:
- The new version starts in `draft`, must reach `signed` via the normal two-party flow
- Until that happens, the previous version remains `signed` and active
- Frontend never silently mutates the previous version; the trigger rejects it at the DB level

Non-material clarifications (typo fixes, clause wording with no operational change) still create a new version but admin can mark `amendment_type='clauses'` and skip employee re-sign only if no material field changed — UI surfaces a clear warning.

---

## 7. Migration requirements (order)

1. Schema migration (columns + amendments table + invalidation column on `contract_signatures`)
2. Backfill `contract_state` and `root_contract_id` for existing contracts
3. Lock trigger on `employee_documents`
4. Deploy frontend + edge function updates together (state transitions must match)

No data loss: existing contracts become v1 with `contract_state` derived from current status, original signatures untouched.

---

## 8. Out of scope (not in this change)

- Bulk amendments across multiple employees
- Counter-offer / negotiation UI
- Automated payroll sync on salary amendments (kept manual; flagged in next iteration)
