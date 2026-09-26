# Independent review of release preparation

Reviewed repository `2407c3a3f925d65adc42eceb290706beca2d4191`, including the prepared migrations, manager panel, release report and isolated test scripts. No live database access, migrations, staff messages or publishing performed. This is a focused code review and regression check, not independent reproduction of every reported release test.

## Two release defects reproduced and corrected

### A2: protected submissions still reached the manager browser

`ManagerStaffChangesReview` calls `useStaffDetailChanges`, which selects complete submission rows. The existing `Read submitted changes in scope` policy permits non-sensitive flagged rows in branch scope. Date of birth and settlement status can be flagged false. The isolated manager test explicitly expected those fields in the manager SELECT result, despite the report describing them as withheld.

Add `20260926160000_manager_submission_read_boundary.proposed.sql` immediately after the manager amendment. Its restrictive SELECT policy requires an active company administrator, or an active in-branch manager reading one of the five ordinary fields and an explicitly false sensitive flag. Other permissive policies cannot widen this boundary. Service-role submission processing is unchanged. No stored records change.

### B: archived overpayment originals remained editable

The archive guard checked period links on UPDATE but did not protect the original estimated amount, hourly rate, employee, tenant or notes. Editing the original debt was therefore possible after archiving.

Add `20260926161000_archived_overpayment_integrity.proposed.sql` immediately after the archive proposal. Original columns are immutable; only recovered amount, recovery period, method, status and updated timestamp may change. Existing checks still reject recovery moves into an archived period. This preserves the deliberate ability to recover an old debt in a later period. Future columns default to protected. Installing this archives nothing.

## Verification

18 PGlite synthetic PostgreSQL regression checks passed, including reproductions of the original failures, manager/admin/other-tenant/inactive/supervisor access, an additional broad permissive policy, original debt edits, legitimate later recovery and rollback of a combined debt/recovery update.

Run:

```
PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node supabase/pending-migrations/tests/release-review-regressions.mjs
```

The manager and archive tests in `tests/isolated` now install these amendments and assert the missing cases. They must be rerun in Lovable's rebuilt PostgreSQL environment: this workspace does not have its PostgreSQL server or `/tmp/iso` setup. The app source is unchanged, so no new app-suite/build result is claimed. SQL tests use synthetic minimal tables; they do not prove complete-schema compatibility or concurrent archive safety.

## Handover to Lovable

1. Apply this draft to the codebase only. Keep both amendments outside automatic migrations.
2. Rerun manager/archive tests against the rebuilt schema, including real RLS and triggers. Verify the manager browser network response excludes protected rows, rather than only hiding them visually. Verify original overpayment edits fail as administrator and service role while a valid later recovery succeeds.
3. Rerun archive-versus-child-write concurrency checks before declaring the archive ready; this review did not validate that race.
4. Update release manifests/fingerprints and readiness conclusions. Deploy each amendment as part of its corresponding release, before making its UI/action available. H2 remains held. No blanket pending-directory install.
5. Report results and exact SQL for production approval. No live migration, publishing or actual February archival is authorised by this draft.

## Recovery caveats

The existing numbering `.down.sql` deliberately restores unchecked allocation and signed-out execute permission. That restores the known vulnerability: it is not a safe routine rollback. Prefer a forward fix or suspend allocation while retaining authorisation checks; review any recovery SQL separately.

The A2 rollback restores the earlier mutation function with broader manager decision powers. Leaving this read restriction in place does not make that mutation rollback safe: a known submission ID could still be used. Do not automatically execute it as part of an app rollback.

The archive rollback removes read-only guards but retains archive evidence. Retention of evidence does not mean the period remains protected after rollback. Reinstall the original archive guards AND this amendment before allowing access again.

No undo scripts that silently reintroduce these two defects are supplied. During an incident, suspend affected actions and prepare a reviewed forward correction; do not remove database safeguards simply to make old UI work.

Backup verification and user production approval remain outstanding. Other reported test counts remain Lovable-reported; this review neither supersedes nor independently certifies them.
