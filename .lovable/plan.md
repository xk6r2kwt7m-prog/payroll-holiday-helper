# Allergen training: controlled source library with approval before publishing

Goal: the app reads the uploaded allergen and food-safety material, works out what the course should say, and puts every proposed change in front of you for approval. Nothing publishes on its own, nothing is learned silently from an old document, and every course statement and question keeps a link back to the document it came from.

## What you will see

**1. Allergen source library (new screen under Documents & Compliance)**
Lists every document already uploaded under allergy training, food safety, ingredient lists, recipes, allergen matrices, service procedures and emergency guidance. Nothing is deleted, renamed or overwritten. Each document gets, for review:

- a source rank you can change: packaging/supplier specification, approved allergen matrix, current recipes and preparation methods, approved operational procedures, older material kept as history
- its date and version as recorded
- whether it is marked current or historical

Older ingredient lists and presentations stay in the library as history and can never override a higher-ranked source.

**2. Dish and flavour reference**
Every documented flavour is kept, including unavailable, seasonal, branch-only and extra-charge items, with the allergens recorded against it and the document each line came from. Each dish is marked, per branch, as active on the menu and till, or not. Scored dish-specific questions are generated only for dishes marked active at that branch; everything else stays as reference reading.

**3. Conflict review**
Where two documents disagree, the app never picks one quietly. Each conflict shows: the dish or procedure affected, exactly what each document says, the date and version of each source, the recommended current wording (from the priority order), and which lessons and questions would need changing.

**4. Proposed changes screen (approval gate)**
One screen with: proposed additions, proposed corrections, conflicts still open, affected lessons, affected questions and answers, and the source document behind each item. Buttons are Approve, Reject, Send back with a note — per item and for the whole set. Nothing reaches staff until you approve and press Publish version.

**5. Publishing**
On approval the app writes a new course version and updates the staff lessons, the assessment question bank, the manager practical sign-off, the ingredient and flavour reference, branch-specific allergen information, the emergency procedure, and the version and review date. The previous version, all completion records and all issued certificates stay exactly as they are and stay readable.

## Course content the review will propose

Drafted from the document you uploaded, each point carrying its source link:

- the 14 regulated allergens, with restaurant examples
- allergies outside the 14, including garlic, onion and mushrooms, recorded in the guest's own words
- peanuts and tree nuts treated as separate allergens, with the "does that include peanuts, tree nuts or both?" question
- Satay Chicken contains peanuts, not tree nuts under the current approved recipe and matrix
- Tempura Aubergine peanut garnish may be omitted only when the allergy is declared before preparation and the dish has not been contaminated
- once an allergen has touched a dish it is discarded and remade; removing a topping is never enough
- Nutella contains hazelnut, Ugly Dumpling adds mixed nuts, and both peanuts and tree nuts are currently declared
- the shared dessert fryer and the resulting peanut and tree-nut cross-contact risk on fried desserts
- shared oils, equipment, utensils, surfaces and preparation areas
- gluten-free equipment, black plates and ramekins as the control route, not a guarantee on their own
- asking every table about allergies
- recording the exact allergen, the affected guest and the affected dishes
- till allergy tags and the same-table "no allergy" control
- printing a fresh kitchen ticket after any change, and no handwritten allergen notes on printed tickets
- kitchen, front of house and manager acknowledgement
- repeating the whole procedure for desserts, sides and later orders
- emergency response and suspected anaphylaxis

Assessment: general questions for everyone, plus dish questions only for dishes active at that branch. Critical questions stay marked critical. The pass rule, attempts, validity and retained evidence follow the settings in your document.

## Defaults I have assumed (say if you want them changed)

- Dish availability per branch is a list you manage in the app; no till connection is assumed. A later menu or till export can be added as a proposal source.
- Until you upload the approved July 2026 matrix as a file, every dish line drafted from the course document is marked "unconfirmed — awaiting approved matrix" and no dish question is scored against it.
- The reviewed course lives as a versioned record in the app, so approving a change publishes a new version without needing me.
- No staff are contacted and no assignments are issued by this work; assigning the new version stays a separate action you take.

## Technical notes

- New tables: `allergen_sources` (document link, rank, version, date, current/historical), `allergen_dish_reference` (dish, allergens, per-branch active flag, source link, confirmed flag), `allergen_conflicts` (dish/procedure, competing statements with source and date, recommended wording, affected lessons and questions, status), `allergen_change_proposals` (type addition/correction, target lesson or question, current text, proposed text, supporting source ids, status, decided by/at), `allergen_course_versions` (version, review date, published by/at, full content snapshot). All tenant-scoped with RLS plus GRANTs; proposals and conflicts readable by managers, approvable by admins only; published versions and prior snapshots never updated or deleted.
- Existing `training_library`, `training_quiz_questions`, `training_assignments`, `training_records` and certificates are extended, not replaced: course content gains a `source_refs` field per statement and per question, and completions keep their existing `module_version` so old certificates still resolve to the version taken.
- An extraction step (edge function, reusing `extract-document`) reads the library documents into candidate statements; it only ever writes proposals, never course content.
- Source priority is deterministic code, not inference: lower-ranked sources can only ever raise a conflict, never overwrite. Where ranks tie or dates are missing, the item is marked "needs your decision".
- Existing pages `FohAllergyTraining` / `FohPrintableTraining` keep working and start reading the published version.
- Tests: priority ordering, conflict detection with dated sources, dish questions suppressed for inactive or unconfirmed dishes, publish preserves prior version and certificates, nothing publishes without an admin approval record, every statement and question resolves to a source.
