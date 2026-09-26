# Financial rule boundaries

- This directory holds pure decisions and reconciliation only. Pass evidence in and return results; no React, database calls, storage, network, emails or mutation of input records.
- Each rule owns one responsibility. Source reconciliation detects disagreement; it does not repair it or determine legal entitlement.
- Changing a rule requires tests of both its intended change and unchanged neighbouring rules. Explain all consumers in the PR.
- Unknown states or incomplete evidence require review; they must not create spendable entitlement.
- Preserve signed ledger movements and historical opening balances. Never infer an entitlement reset from the first import date.
- Run `npm run check:financial-boundaries` as well as the application tests/typecheck/build. Do not weaken this check to permit a UI/database dependency.
