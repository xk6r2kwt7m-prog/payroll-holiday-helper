# Save certificate-expiry rule to project memory

## What
Record one permanent memory rule: Level 2 Food Safety (and similar environmental-health) certificates have **no legal expiry** in the UK. Record them with `expiry_date = NULL` and a 3-year refresher `review_due_date`, never as an expiry date. The refresher review date drives reminders only.

## Why
The user stated "remember this does not expire" after filing Hafiz Rahim's Level 2 Food Safety certificate. The existing record already uses the no-expiry + refresher-review pattern; this locks the rule into project memory so future certificates are handled consistently and never incorrectly marked expired.

## Changes
1. Create memory file `mem://features/training-records/certificate-expiry` describing the no-expiry + 3-year refresher rule and the correct field values (`expiry_date` NULL, `review_due_date` = award + 3 years, badge "No expiry — refresher review due {date}").
2. Add a one-line reference to `mem://index.md` under Memories.

## Out of scope
- No database, code, record, email, or notification changes.
- No re-filing of existing certificates.
- The memory rule applies going forward to any UK environmental-health certification with no legal expiry; verify the specific certification's rules before applying to other cert types.
