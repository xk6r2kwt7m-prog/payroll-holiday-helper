# Licensing documents for all three sites, with signatures

Fitzrovia already has four paper documents: the premises licence, the DPS written authorisation to sell alcohol, the Section 57 notice and the Challenge 25 notice. This creates the same set for Carnaby and Brixton, and turns the two that need signing into proper signed records instead of paper.

## What gets built

### 1. Premises licence record per site (Branch compliance)

A licence card inside the Branch compliance tab for each site: licence number, holder, issuing council, DPS and personal licence number, issue and latest variation date, licensed activities and hours, plus the licence documents attached from the document library.

- **Fitzrovia** is filled in from your documents: 30 Rathbone Place, London W1T 1JQ; licence 21/05993/LIPN; holder UD Restaurants Limited; DPS Philipp Chaykin, personal licence 17/05171/LIPERS; City of Westminster Council; source licence date 24 January 2022. Marked "Current document uploaded — confirmation of later variations required". The four uploaded files are attached to it.
- **Carnaby and Brixton** get their own cards with Philipp Chaykin as DPS, and every field that only you can confirm (licence number, council, hours, variation date) left blank and clearly flagged "Awaiting confirmation". Nothing is copied across from Fitzrovia as if it were confirmed.

Licence conditions stay per site — a Fitzrovia condition is never presented as a Carnaby or Brixton requirement.

### 2. Site documents generated per site

Two documents produced per site from the Fitzrovia wording, with that site's name, address and licence details filled in automatically:

- **DPS written authorisation to sell alcohol** — the authorisation Philipp signs, followed by the list of staff he authorises.
- **Section 57 notice** — who knows where Part A of the licence is kept and can produce it. Named people are per site; I'll leave Carnaby and Brixton blank for you to fill in on screen, since you didn't give names yet.

The **Challenge 25 notice** is the same at all three sites, so it's added once to the library and marked as required on display at each site, with the physical display check (where it's displayed, last checked, by whom, photo, replacement needed).

The Section 57 notice you uploaded describes Philipp Chaykin as the premises licence holder, while the licence names UD Restaurants Limited. The generated version says "premises licence holder: UD Restaurants Limited" and names Philipp as signing on its behalf. Your original file stays untouched in the library, marked Draft — requires correction.

### 3. Philipp signs by secure link

For each site's DPS authorisation and Section 57 notice you press Send for signature and choose Philipp. He gets a private email link, no login: he reads the document in full, ticks that he has read it, then signs on his phone. He can also stop and come back later — the same behaviour as staff contracts.

His name, personal licence number, signature, date, time and device are stored on the record, and the signed PDF is filed in the document library against that site. A signed authorisation cannot be edited — a change means a new version, and the old one is kept.

### 4. Staff sign their alcohol authorisation on its own

Today staff only sign as part of an induction. Adding: from the Alcohol sales authorisations panel, pick existing staff at a site and send the authorisation on its own, by secure link. They read what they are being authorised to do and the conditions, sign, and it lands as a pending authorisation for you or Philipp to approve as DPS — the existing approve/revoke rules are unchanged.

Each site then has a **signing sheet PDF**: the DPS authorisation with Philipp's signature at the bottom and every staff member who has signed listed above it, exactly like the paper version, downloadable for an inspection.

## Technical notes

- New tables `premises_licences` and `premises_licence_conditions` (tenant-scoped RLS, GRANTs, `branch_location_id` FK), plus `licence_signature_requests` for the token-based signing of licensing documents. `alcohol_authorisations` gains a nullable `request_id` so a standalone send is distinguishable from an induction-generated one.
- Signing reuses the existing pattern: token link, public portal route, read-then-sign step, IP/user-agent capture, audit entry per view and signature. No changes to contract signing or induction logic.
- Document generation via `@react-pdf/renderer`, same as the existing letter and incident PDFs; generated files stored in the document library with the Phase 1 fields (classification "premises licence condition", approval status, owner, reference number).
- Every create, edit, send, view, signature and version change writes to the existing `audit_log`. Nothing is overwritten.
- Existing induction, alcohol approval, certificates, branch compliance and inspection features are untouched.

## Left for you to confirm

- Carnaby and Brixton licence numbers, issuing councils, licensed hours and latest variation dates.
- Names and job titles for the Carnaby and Brixton Section 57 notices.
- Philipp's email address for the signature request.
