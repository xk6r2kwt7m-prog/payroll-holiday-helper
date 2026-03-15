# UGLŌ Platform – Full Audit Report

**Date:** March 2026  
**Scope:** Complete back-to-back product, logic, flow, and consistency audit

---

## 1. Executive Summary

UGLŌ is a multi-tenant HR / workforce management platform targeting hospitality and service businesses. It covers employee management, scheduling, payroll, holidays, training, documents, contracts, attendance, and workforce planning across multiple locations.

### Strengths
- Solid multi-tenant architecture with RLS isolation via `tenant_id` on every table
- Comprehensive module set covering the full employee lifecycle
- Role-based access control (viewer → staff → supervisor → manager → admin → platform admin)
- Module-gating system allowing tenants to enable/disable features (scheduling, payroll, training, documents, analytics)
- Country-aware leave rules with accrual calculations
- Real audit trail infrastructure (`audit_log` table with action enums)
- Platform admin layer with impersonation and sandbox tools

### Critical Issues Found
1. **Holidays.tsx is 1,119 lines** — high-risk monolith mixing staff requests and admin management
2. **Role-gating inconsistencies** — Training module exposes admin library tabs to staff
3. **Navigation overload** — 24+ sidebar items with no grouping
4. **Duplicate staff surfaces** — StaffHome and StaffPortal overlap significantly
5. **Payroll route sprawl** — 6 separate routes that should be tabbed views
6. **Inline Supabase queries** in staff-facing pages instead of using centralised hooks
7. **Side effects in data fetching** — `useEmployees` auto-archives leavers inside a query

---

## 2. Full Module Inventory

### 2.1 Public Pages (No Auth Required)

| Route | Page | Purpose | Status |
|-------|------|---------|--------|
| `/auth` | Auth.tsx | Login / signup | Complete |
| `/reset-password` | ResetPassword.tsx | Password reset | Complete |
| `/onboard` | CompanyOnboarding.tsx | New tenant setup wizard | Complete |
| `/select-workspace` | SelectWorkspace.tsx | Multi-tenant workspace picker | Complete |
| `/sign/:token` | SignContract.tsx | External contract signing via token | Complete |

### 2.2 Dashboard / Home

| Route | Page | Access | Purpose | Status |
|-------|------|--------|---------|--------|
| `/` | Index.tsx | All authenticated | Role-specific home screen | Complete |

- **Staff** → `StaffHome` (mobile) — clock-in, upcoming shifts, quick links
- **Manager** → `ManagerHome` (mobile) / `AdminDesktopDashboard` (desktop)
- **Admin** → `AdminHome` (mobile) / `AdminDesktopDashboard` (desktop)

Dashboard widgets:
- `StatCard` — key metrics
- `EmployeeTable` — quick employee list
- `HolidayRequests` — pending approvals
- `QuickActions` — shortcut buttons
- `SmartAlerts` — AI-generated alerts
- `TodayActions` — daily task list
- `UpcomingPayroll` — next payroll deadline
- `OperationalAlertsPanel` — operational warnings
- `SetupHealthWidget` — onboarding completeness
- `AuditHealthWidget` — compliance status
- `BillingSummaryWidget` — subscription info
- `DocumentRequestsWidget` — pending doc requests
- `ExpiringDocumentsWidget` — expiry warnings
- `PayrollDeadlineWidget` — payroll countdown
- `StaffingInsightsWidget` — workforce analytics
- `TeamReadinessWidget` — team readiness scores
- `LabourCostDashboard` — cost overview

### 2.3 Staff-Facing Pages

| Route | Page | Access | Purpose | Status |
|-------|------|--------|---------|--------|
| `/staff` | StaffPortal.tsx | staff+ | Personal profile, payslips, documents | Complete |
| `/employee-onboarding` | EmployeeOnboarding.tsx | staff+ | Self-service onboarding wizard | Complete |
| `/schedule` | Schedule.tsx | staff+ (module) | View own schedule | Complete |
| `/shift-marketplace` | ShiftMarketplace.tsx | staff+ (module) | Pick up / swap shifts | Complete |
| `/holidays` | Holidays.tsx | staff+ | Request holidays, view balance | Complete but oversized |
| `/training` | TrainingRecords.tsx | staff+ (module) | View training assignments | Partial — role-gating issue |
| `/announcements` | Announcements.tsx | staff+ | Company announcements | Complete |
| `/talent-pool` | TalentPool.tsx | staff+ | Talent opt-in and search | Complete |
| `/foh/service` | FohServiceTraining.tsx | staff+ | FOH service training (Ugly Dumpling) | Complete |
| `/foh/allergy` | FohAllergyTraining.tsx | staff+ | FOH allergy training | Complete |
| `/foh/upselling` | FohUpsellingTraining.tsx | staff+ | FOH upselling training | Complete |
| `/foh/print` | FohPrintableTraining.tsx | staff+ | Printable training reference | Complete |

### 2.4 Manager / Supervisor Pages

| Route | Page | Access | Purpose | Status |
|-------|------|--------|---------|--------|
| `/employees` | Employees.tsx | supervisor+ | Employee directory and management | Complete |
| `/timesheets` | Timesheets.tsx | supervisor+ (module) | Timesheet review | Complete |
| `/schedule/report` | ScheduleReport.tsx | manager+ (module) | Schedule reports | Complete |
| `/schedule/analytics` | ScheduleAnalytics.tsx | manager+ (module) | Schedule analytics | Complete |
| `/schedule/labour-cost` | LabourCostPreview.tsx | manager+ (module) | Labour cost projections | Complete |
| `/absences` | AbsenceTracker.tsx | manager+ | Absence tracking | Complete |
| `/workforce` | Workforce.tsx | manager+ | Workforce planning tools | Complete |
| `/onboarding` | Onboarding.tsx | manager+ | Employee onboarding management | Complete |

### 2.5 Admin Pages

| Route | Page | Access | Purpose | Status |
|-------|------|--------|---------|--------|
| `/payroll` | Payroll.tsx | admin (module) | Payroll period management | Complete |
| `/payroll/calendar` | PayrollCalendar.tsx | admin (module) | Payroll calendar view | Complete |
| `/payroll/analytics` | PayrollAnalytics.tsx | admin (module) | Payroll analytics | Complete |
| `/payroll/comparison` | PayrollComparison.tsx | admin (module) | Period-over-period comparison | Complete |
| `/payroll/overpayments` | PayrollOverpayments.tsx | admin (module) | Overpayment tracking | Complete |
| `/payroll/audit` | PayrollAudit.tsx | admin (module) | Payroll audit trail | Complete |
| `/holidays/audit` | HolidayAudit.tsx | admin | Holiday audit and integrity checks | Complete |
| `/disciplinary` | Disciplinary.tsx | admin | Disciplinary records | Complete |
| `/contracts` | Contracts.tsx | admin (module) | Contract generation and signing | Complete |
| `/locations` | Locations.tsx | admin | Location management | Complete |
| `/locations/:branch` | LocationDashboard.tsx | admin | Per-location dashboard | Complete |
| `/settings` | Settings.tsx | admin | Admin centre / system config | Complete |

### 2.6 Platform Admin

| Route | Page | Access | Purpose | Status |
|-------|------|--------|---------|--------|
| `/platform-admin` | PlatformAdmin.tsx | platform owner | Multi-tenant oversight | Complete |

Includes:
- `PlatformOverview` — tenant stats
- `TenantManagement` — tenant CRUD
- `PlatformAnalytics` — platform metrics
- `SandboxTestingConsole` — sandbox tools
- `PermissionVisualizer` — role/permission matrix
- `ImpersonationBanner` — impersonation indicator

### 2.7 Key Dialogs / Sheets / Drawers

| Component | Trigger | Purpose |
|-----------|---------|---------|
| `EmployeeFormDialog` | Add/edit employee | Full employee form |
| `EmployeeDetailSheet` | Click employee row | Employee detail panel |
| `DocumentUploadDialog` | Upload document | File upload with type selection |
| `DocumentVerificationPanel` | Verify document | Admin document verification |
| `InviteEmployeeDialog` | Invite employee | Email invitation flow |
| `ContractFormDialog` | Generate contract | Contract template builder |
| `CreatePayrollDialog` | New payroll period | Period creation |
| `ImportPayrollDialog` | Import payroll data | CSV/Excel import |
| `AddEmployeeToPeriodDialog` | Add to payroll | Add employee to active period |
| `HolidayRequestForm` | Request holiday | Staff holiday request |
| `AdjustHolidayBalanceDialog` | Adjust balance | Admin balance adjustment |
| `SettleLeaverDialog` | Settle leaver | Final holiday settlement |
| `AddHolidayPaymentDialog` | Add payment | Holiday payment recording |
| `ShiftCellDialog` | Click shift cell | Shift creation/editing |
| `MobileShiftSheet` | Mobile shift tap | Mobile shift editing |
| `MobileShiftWizard` | Mobile add shift | Step-by-step shift creation |
| `MoveShiftDrawer` | Move shift | Drag-free shift moving |
| `PublishConfirmDrawer` | Publish schedule | Schedule publish confirmation |
| `CopyPreviousWeekDialog` | Copy week | Copy prior week's schedule |
| `SaveTemplateDialog` | Save template | Save schedule as template |
| `LoadTemplateDialog` | Load template | Load saved template |
| `FindCoverSheet` | Find cover | Emergency cover finder |
| `StaffTransferDialog` | Transfer staff | Cross-location transfer |
| `LocationSettingsSheet` | Location settings | Per-location config |
| `EvidenceRequestDialog` | Request evidence | Attendance evidence request |
| `CreateDocumentRequestDialog` | Request document | Document request creation |
| `GenerateReferenceLetterDialog` | Generate letter | Reference letter generator |
| ~~`TalentOptInDialog`~~ | ~~Talent opt-in~~ | Removed — replaced by worker self-activation in TalentProfileManager |
| `PlanUpgradeDialog` | Upgrade plan | Subscription upgrade prompt |
| `CommandPalette` | ⌘K | Global search and navigation |

### 2.8 Notification System

- `NotificationBell` — header bell icon with badge
- `useAppNotifications` — notification fetching
- `useNotifications` — notification state
- `useNotifyEvent` — notification dispatch
- `send-notification` edge function — server-side notification sending

### 2.9 Edge Functions

| Function | Purpose |
|----------|---------|
| `ai-setup-recommendations` | AI-powered setup suggestions |
| `archive-leavers` | Archive departed employees |
| `backfill-holiday-ledger` | Backfill holiday ledger entries |
| `clock-in-out` | Attendance clock in/out |
| `extract-document` | AI document data extraction |
| `import-historical-payroll` | Historical payroll import |
| `merge-duplicate-employees` | Duplicate employee merger |
| `provision-tenant` | New tenant provisioning |
| `rebuild-holiday-carryover` | Holiday carryover recalculation |
| `resolve-orphan-payments` | Orphan payment resolution |
| `send-notification` | Push notification dispatch |
| `sign-contract` | Contract signing processor |
| `talent-ai-match` | AI talent matching |

---

## 3. Full Role-Based Flow Map

### 3.1 New Tenant / Company Signup

```
/auth (signup)
  → account created
  → /onboard (CompanyOnboarding)
    → Step 1: Account details
    → Step 2: Workplace type
    → Step 3: Work style
    → Step 4: Team size
    → Step 5: Pay rhythm
    → Step 6: Invite team
    → Step 7: Summary
  → provision-tenant edge function
  → redirect to / (dashboard)
```

**Issues:**
- No progress saving — if user abandons mid-flow, they must restart
- No skip option for optional steps
- Pay rhythm step may confuse new users who haven't decided yet

### 3.2 Company Admin Flow

```
First login → / (AdminDesktopDashboard on desktop, AdminHome on mobile)

Daily actions:
- Review smart alerts
- Check holiday requests (HolidayRequests widget)
- Review payroll deadlines (PayrollDeadlineWidget)
- Check document requests (DocumentRequestsWidget)
- Monitor expiring documents (ExpiringDocumentsWidget)
- Review setup health (SetupHealthWidget)

Navigation (24+ items):
Dashboard → Employees → Schedule → Shift Marketplace → Timesheets →
Schedule Report → Labour Cost → Analytics → Payroll → Payroll Calendar →
Payroll Analytics → Overpayments → Payroll Audit → Holidays → Holiday Audit →
Absences → Workforce → Onboarding → Training → Disciplinary →
Announcements → Contracts → Locations → Talent Pool → Admin Centre

Settings (/settings):
- Company settings
- Department management
- Location management
- Role & permission config
- Leave rules
- Service charge settings
- Employee status config
- Onboarding requirements config
- Module pricing config
- Historical import
- Audit log
- Email test
```

**Issues:**
- 24+ nav items with no grouping = cognitive overload
- Settings page contains too many sections
- No quick access to "most used" actions
- Admin Centre label unclear — could be "Settings" or "Company Settings"

### 3.3 Manager Flow

```
First login → / (ManagerHome on mobile, AdminDesktopDashboard on desktop)

Key actions:
- View team schedule
- Approve holiday requests
- Review timesheets
- Track absences
- Manage workforce
- View schedule reports / analytics

Navigation visible:
Dashboard, Employees, Schedule, Shift Marketplace, Timesheets,
Schedule Report, Labour Cost, Analytics, Holidays, Absences,
Workforce, Onboarding, Training, Announcements, Talent Pool
```

**Issues:**
- Manager sees same desktop dashboard as admin — may see widgets they can't act on
- Schedule Report and Analytics are separate routes that could be tabs
- "Labour Cost" appears under scheduling but is its own route

### 3.4 Supervisor Flow

```
First login → / (StaffHome)

Key actions:
- View employees
- Review timesheets

Navigation visible:
Dashboard, Employees, Timesheets, plus all staff items
```

**Issues:**
- Supervisor sees StaffHome dashboard, not a supervisor-specific view
- Limited differentiation from staff experience

### 3.5 Staff Employee Flow

```
First login → / (StaffHome)

Key actions:
- Clock in/out
- View schedule
- Request holidays
- View announcements
- Access training
- Upload documents
- View payslips (via StaffPortal)

Navigation visible:
Dashboard, Schedule, Shift Marketplace, Holidays, Training,
Announcements, Talent Pool, plus /staff portal
```

**Issues:**
- StaffHome and StaffPortal overlap (both show profile info, announcements)
- Staff sees "Talent Pool" which may be confusing
- FOH training routes not in navigation (must be linked from elsewhere)
- No clear "My Documents" section in nav

### 3.6 Platform Admin Flow

```
First login → / (dashboard) + /platform-admin available

Key actions:
- View all tenants
- Manage tenant subscriptions
- Impersonate users
- Run sandbox tests
- View platform analytics
- Visualise permissions

Navigation:
All standard items + "Platform Admin" at bottom with separator
```

**Issues:**
- Platform admin sees all tenant navigation items even when not impersonating
- No "exit impersonation" shortcut in nav

---

## 4. Feature-by-Feature Audit

### 4.1 Tenant Signup & Onboarding

**Flow:** `/auth` → signup → `/onboard` → 7-step wizard → provision tenant → `/`

**Assessment:**
- Steps are logically ordered
- SelectionCard component provides clean visual choices
- Missing: progress persistence, skip options, back navigation clarity
- The "Invite" step comes before summary — user may not have employee emails yet
- **Recommendation:** Allow skipping invite step, add "you can do this later" messaging

### 4.2 Employee Creation

**Flow:** Admin → Employees page → "Add Employee" → EmployeeFormDialog → save

**Assessment:**
- Form covers essential fields (name, department, hourly rate, dates, country)
- Supports both manual creation and invitation
- InviteEmployeeDialog provides email-based invitation
- BulkActionsBar allows bulk operations on selected employees
- **Issue:** Form may be overwhelming with all fields shown at once
- **Recommendation:** Progressive disclosure — show essential fields first, advanced in accordion

### 4.3 Employee Self-Service Onboarding

**Flow:** Employee receives invite → `/auth` → `/employee-onboarding` → step-by-step form → submit

**Assessment:**
- `EmployeeOnboarding.tsx` provides guided wizard
- `employee_onboarding_data` table stores progress (personal_info, emergency_contact, bank_details)
- `step_completed` field tracks progress
- `OnboardingChecklist` component shows checklist to admin
- **Issue:** No clear connection between invitation token and onboarding data
- **Issue:** Onboarding status may not sync with employee record status
- **Recommendation:** Ensure `onboarding_completed_at` triggers employee status update

### 4.4 Document Upload & Verification

**Flow:** Upload → store in `employee_documents` → admin verifies via `DocumentVerificationPanel`

**Assessment:**
- Supports multiple document types via `document_type` enum
- Extraction via `extract-document` edge function (AI-powered)
- Verification workflow: pending → verified/rejected
- Audit trail via `document_audit_log`
- Expiry tracking with `ExpiringDocumentsWidget`
- **Strength:** Strong audit trail and verification workflow
- **Issue:** No clear staff-facing "My Documents" view in main navigation
- **Recommendation:** Add documents section to StaffPortal or create staff documents route

### 4.5 Document Request Engine

**Flow:** Admin creates request → employee notified → employee uploads → admin verifies

**Assessment:**
- `document_requests` table with full lifecycle (pending → viewed → submitted → verified/rejected)
- Templates via `document_request_templates`
- Staff view via `StaffDocumentRequests`
- Manager view via `DocumentRequestsManager`
- Priority levels and due dates
- Audit trail via `document_request_audit`
- **Strength:** Complete lifecycle management
- **Issue:** Two separate audit tables (document_audit_log and document_request_audit) — may cause confusion

### 4.6 Training System

**Flow:** Admin creates training items → assigns to employees → employees complete → tracked

**Assessment:**
- `TrainingLibraryManager` — admin creates/manages training content
- `StaffTrainingView` — employee views assignments
- `TrainingRecords.tsx` page shows both views
- FOH training is separate static content (not integrated with training records)
- **Critical Issue:** Staff can see the library management tab in TrainingRecords
- **Issue:** FOH training routes are not connected to the training records system
- **Recommendation:** Fix role-gating; consider integrating FOH training with the assignment system

### 4.7 Schedule Creation & Publishing

**Flow:** Manager → Schedule → create shifts in grid → publish → employees notified

**Assessment:**
- `RotaGrid` provides week-view grid with employee rows
- `ShiftCellDialog` for shift creation/editing
- `DraggableShiftCell` + `DroppableCell` for drag-and-drop
- `MobileShiftWizard` for mobile shift creation
- `PublishConfirmDrawer` for publish confirmation
- Template system (save/load) via `useScheduleTemplates`
- `ComplianceWarnings` checks for issues
- `ScheduleFilters` for filtering by location/department
- `CopyPreviousWeekDialog` for copying previous weeks
- `BulkScheduleActions` for bulk operations
- **Strength:** Comprehensive scheduling with templates and compliance
- **Issue:** Schedule.tsx at 637 lines is complex
- **Issue:** DayView exists but unclear when it's used vs week view
- **Recommendation:** Split Schedule.tsx; clarify day vs week view toggle

### 4.8 Shift Marketplace

**Flow:** Employee posts shift → others can pick it up → manager approves

**Assessment:**
- `ShiftMarketplace.tsx` page
- `useShiftMarketplace` hook
- Available to staff+
- **Status:** Functional but may have low discoverability
- **Recommendation:** Surface marketplace notifications on StaffHome

### 4.9 Timesheets & Attendance

**Flow:** Clock in/out → time entries created → supervisor reviews → approves

**Assessment:**
- `clock-in-out` edge function handles clock events
- `TimesheetReviewPanel` for supervisor review
- `EvidenceRequestDialog` for requesting attendance evidence
- `StaffEvidenceUpload` for staff evidence submission
- `AttendanceDashboard` for attendance overview
- `useTimeEntries` hook for time entry data
- `useEvidence` hook for evidence management
- **Strength:** Evidence-based attendance with review workflow
- **Issue:** Timesheet approval status may not clearly feed into payroll
- **Recommendation:** Ensure clear visual link between approved timesheets and payroll data

### 4.10 Holiday Requests & Approval

**Flow:** Staff requests via `HolidayRequestForm` → appears in `HolidayRequestQueue` → manager approves/rejects

**Assessment:**
- `Holidays.tsx` (1,119 lines) handles everything
- Staff view: request form, balance display, history
- Admin view: approval queue, audit tools, ledger, comparison, integrity checks
- `useHolidays` — balance and entitlement calculations
- `useHolidayRequests` — request CRUD
- `useHolidayLedger` — ledger entries
- `HolidayFormulaBreakdown` — shows calculation logic
- `HolidayIntegrityCheck` — data integrity verification
- `HolidayComparisonTable` — compare periods
- `LeaveYearBalanceCard` — balance summary
- `DepartmentHolidaySummary` — department overview
- `EmployeeHolidayLookup` — search employee holidays
- `EmployeeHolidayDetailSheet` — detailed employee view
- `SettleLeaverDialog` — leaver settlement
- Country-aware rules via `country_leave_rules` table
- **Critical Issue:** 1,119 lines in one file mixing staff and admin concerns
- **Strength:** Comprehensive holiday management with audit trail
- **Recommendation:** Split into StaffHolidays.tsx and AdminHolidayManagement.tsx

### 4.11 Payroll

**Flow:** Create period → add employees → review/edit → approve → lock

**Assessment:**
- `CreatePayrollDialog` — period creation
- `EditablePayrollTable` — inline editing of payroll data
- `PayrollApprovalWorkflow` — approval process
- `PayrollHolidaySection` — holiday pay integration
- `PayrollInlineAnalytics` — real-time analytics during editing
- `PayrollSalesInput` — sales data for service charge
- `PayrollReportBuilder` — custom report generation
- `PayrollReminders` — deadline reminders
- `PayrollPDF` — PDF export
- `ImportPayrollDialog` — data import
- `AddEmployeeToPeriodDialog` — add employee to period
- `usePayroll` — payroll CRUD
- `usePayrollAudit` — audit trail
- `useServiceCharge` — service charge calculations
- `useLabourCost` — labour cost tracking
- **Strength:** Comprehensive payroll with audit compliance
- **Issue:** 6 separate routes (payroll, calendar, analytics, comparison, overpayments, audit)
- **Recommendation:** Consolidate into tabbed interface on single `/payroll` route

### 4.12 Service Charge Settings

**Assessment:**
- `ServiceChargeSettings` in admin settings
- `ServiceChargePreview` for previewing distribution
- `useServiceCharge` and `useServiceChargePreview` hooks
- Employee-level `service_charge_eligible` flag
- **Issue:** Service charge UI may appear even when not relevant to tenant
- **Recommendation:** Only show when explicitly enabled

### 4.13 Staff Portal

**Assessment:**
- `/staff` route with `StaffPortal.tsx`
- Shows: profile, documents, payslips, announcements
- Contains inline Supabase queries instead of using hooks
- **Issue:** Overlaps with StaffHome (both show announcements, profile info)
- **Issue:** Inline queries break the hook pattern used elsewhere
- **Recommendation:** Merge unique features into StaffHome or make StaffPortal the single staff hub

### 4.14 Admin Centre (Settings)

**Assessment:**
- `/settings` route
- Contains 12+ configuration sections
- Covers: company info, departments, locations, roles, leave rules, service charge, employee statuses, onboarding requirements, module pricing, historical import, audit log, email testing
- **Issue:** Too many sections in one page
- **Issue:** Some sections (module pricing, historical import) are rarely used
- **Recommendation:** Group into categories with accordion or tabs

### 4.15 Announcements

**Assessment:**
- `/announcements` route
- `staff_announcements` table with read receipts
- Staff can view; managers/admins can create
- **Status:** Complete and clean

### 4.16 Notifications

**Assessment:**
- `NotificationBell` in header
- `useAppNotifications` fetches from database
- `send-notification` edge function
- **Issue:** Notification preferences not visible in staff settings
- **Recommendation:** Add notification preference controls

### 4.17 Sandbox / Impersonation

**Assessment:**
- `SandboxTestingConsole` in platform admin
- `ImpersonationBanner` shows when impersonating
- `useImpersonation` hook manages state
- `useSandbox` hook for sandbox mode
- **Status:** Functional for platform admin use

### 4.18 Multi-Location Logic

**Assessment:**
- `branch_locations` table with geofencing
- `employee_branches` junction table (many-to-many)
- `LocationSettingsSheet` for per-location config
- `LocationDashboard` for per-location view
- `CrossLocationBalancing` in workforce tools
- `StaffTransferDialog` for transfers
- `useLocationSettings` and `useBranches` hooks
- **Strength:** Well-structured multi-location support
- **Issue:** Location context not always visible in schedule/payroll views

### 4.19 Emergency Cover / Workforce Tools

**Assessment:**
- `EmergencyCoverTool` — find emergency cover
- `FindCoverSheet` — cover finder sheet
- `CrossLocationBalancing` — balance staff across locations
- `LiveLabourDashboard` — real-time labour costs
- `AvailabilityEditor` — edit employee availability
- `SkillsEditor` — manage employee skills
- All under `/workforce` route
- **Status:** Complete but may overwhelm managers
- **Recommendation:** Surface emergency cover as a quick action from schedule view

---

## 5. UX Friction Findings

### 5.1 Navigation Overload
- **24+ sidebar items** with no grouping, categorisation, or collapsible sections
- Admin sees everything at once
- Staff sees 10+ items that could be reduced
- No "favourites" or "recent" section

### 5.2 Too Many Clicks for Common Actions
- Creating a shift: Navigate to schedule → find employee row → click cell → fill dialog → save
- Approving a holiday: Navigate to holidays → find request → approve
- No bulk approval from dashboard

### 5.3 Confusing Labels
- "Admin Centre" vs "Settings" — inconsistent naming
- "Timesheets" vs "Attendance" — overlapping concepts
- "Schedule Report" vs "Schedule Analytics" — unclear distinction
- "Labour Cost" under scheduling vs payroll analytics

### 5.4 Dead-End States
- After employee onboarding completion, no clear redirect
- After contract signing, no confirmation page
- After payroll approval, no summary view

### 5.5 Mobile Friction
- Schedule grid is complex on 430px viewport
- `MobileShiftSheet` and `MobileShiftWizard` exist but grid interaction still challenging
- Many dialogs may not be optimised for mobile keyboard
- Dashboard widgets stack vertically with no priority ordering

### 5.6 Form Overload
- Employee creation form shows all fields at once
- Payroll editing table may be overwhelming on first use
- Settings page presents all config sections simultaneously

### 5.7 Duplicate Actions
- Announcements visible on both StaffHome and StaffPortal
- Profile info shown on both StaffHome and StaffPortal
- Holiday balance shown on Holidays page and dashboard widget
- Employee list on dashboard and Employees page

---

## 6. Logic Inconsistency Findings

### 6.1 Training Role-Gating
- `TrainingRecords.tsx` shows `TrainingLibraryManager` component
- Staff can see admin library management tabs
- Should be restricted: staff sees `StaffTrainingView` only

### 6.2 Navigation Drift
- Sidebar shows "Timesheets" requiring `supervisor` role
- MobileBottomNav may show different items
- FOH training routes exist but are not in any navigation menu

### 6.3 Employee Status vs Onboarding Status
- Employee has `status` enum (active, inactive, etc.)
- Onboarding has separate `onboarding_completed_at` and `step_completed`
- These may not sync — employee could be "active" but onboarding incomplete
- Readiness system (`useOnboardingReadiness`) may show conflicting status

### 6.4 Holiday Entitlement Methods
- `holiday_entitlement_method` field on employee (accrual vs fixed)
- Country rules define statutory entitlements
- `HolidayFormulaBreakdown` shows calculations
- But method selection UI may not clearly explain the difference

### 6.5 Service Charge Visibility
- `service_charge_eligible` flag per employee
- `ServiceChargeSettings` in admin centre
- Service charge columns may appear in payroll even when feature is disabled for tenant

### 6.6 Auto-Archive Side Effect
- `useEmployees` hook contains logic to auto-archive leavers
- This runs during data fetching — a query should not have mutation side effects
- Could cause unexpected data changes during normal page loads

### 6.7 Duplicate Audit Tables
- `audit_log` — general audit trail
- `document_audit_log` — document-specific audit
- `document_request_audit` — request-specific audit
- Three separate audit mechanisms for related flows

---

## 7. Redundant / Low-Value Features

### 7.1 Probably Redundant

| Feature | Reason | Recommendation |
|---------|--------|----------------|
| StaffPortal as separate page | Overlaps with StaffHome | Merge into one |
| Schedule Report + Schedule Analytics as separate routes | Same data, different views | Merge into tabs |
| Payroll Calendar as separate route | Could be a tab on payroll | Merge |
| Payroll Comparison as separate route | Could be a tab on payroll | Merge |
| Payroll Overpayments as separate route | Could be a tab on payroll | Merge |
| Payroll Audit as separate route | Could be a tab on payroll | Merge |

### 7.2 Nice to Have / Low Priority

| Feature | Assessment |
|---------|------------|
| Talent Pool | Useful but may distract from core HR |
| AI Setup Recommendations | Helpful but not essential |
| Permission Visualizer | Platform admin tool, low usage |
| Historical Import | One-time use, could be hidden after use |

### 7.3 Potentially Removable

| Feature | Reason |
|---------|--------|
| DayView in schedule | Unclear when used, may duplicate week view |
| PayrollComparison | Limited use case, could be a report |
| ScheduleReport as separate page | Could be a tab or export |

---

## 8. Navigation Issues

### 8.1 Current Sidebar Structure (24+ items, flat list)

```
Dashboard
Employees
Schedule
Shift Marketplace
Timesheets
Schedule Report
Labour Cost
Analytics
Payroll
Payroll Calendar
Payroll Analytics
Overpayments
Payroll Audit
Holidays
Holiday Audit
Absences
Workforce
Onboarding
Training
Disciplinary
Announcements
Contracts
Locations
Talent Pool
Admin Centre
```

### 8.2 Recommended Grouped Structure

```
── Home
   └─ Dashboard

── People
   ├─ Employees
   ├─ Onboarding
   └─ Disciplinary

── Schedule & Time
   ├─ Schedule (with sub-tabs: Grid, Report, Analytics, Labour Cost)
   ├─ Timesheets
   └─ Shift Marketplace

── Leave & Absence
   ├─ Holidays (with sub-tabs for admin: Audit, Integrity)
   └─ Absences

── Pay
   └─ Payroll (with sub-tabs: Periods, Calendar, Analytics, Comparison, Overpayments, Audit)

── Documents & Training
   ├─ Contracts
   └─ Training

── Operations
   ├─ Locations
   ├─ Workforce
   ├─ Announcements
   └─ Talent Pool

── Settings
   └─ Admin Centre
```

This reduces visible top-level items from 24+ to ~10 groups.

### 8.3 Mobile Bottom Nav

- Should show only 4-5 items: Home, Schedule, Holidays, More
- "More" opens a drawer with remaining items
- Currently may show too many items

---

## 9. Mobile Issues

### 9.1 Schedule Grid
- Week-view grid with 7 columns is challenging on 430px
- `MobileShiftSheet` and `MobileShiftWizard` help but grid still loads
- **Recommendation:** Default to day view on mobile, swipe for days

### 9.2 Dashboard Density
- All widgets stack vertically on mobile
- No priority ordering — important alerts may be below fold
- **Recommendation:** Show only top 3-4 widgets on mobile, "Show more" for rest

### 9.3 Form Usability
- Employee creation form may need scroll on mobile
- Multiple select fields may be hard to use
- Date pickers need mobile-optimised versions

### 9.4 Tables
- Employee table, payroll table may overflow on mobile
- Card-based layouts (`EmployeeCard`) exist but may not always be used

### 9.5 Bottom Nav vs Sidebar
- Mobile uses `MobileBottomNav` (good)
- But sidebar still exists and may interfere
- `FloatingActionButton` provides quick add — good pattern

---

## 10. Architectural Pressure Points

### 10.1 High-Risk Files

| File | Lines | Risk | Action |
|------|-------|------|--------|
| Holidays.tsx | ~1,119 | Very High | Split into Staff/Admin views |
| Schedule.tsx | ~637 | High | Extract dialog state, split views |
| Sidebar.tsx | ~284 | Medium | Extract nav items, add grouping |
| useEmployees.ts | Unknown | High | Remove side effects from query |
| Settings.tsx | Unknown | Medium | Group into tabs/accordion |

### 10.2 Tightly Coupled Modules

- `useAuth` → used everywhere, any change is high-risk
- `useTenant` → tenant context injected globally
- `ProtectedRoute` → all route access depends on this
- `AppLayout` → wraps all authenticated pages

### 10.3 State Duplication

- Employee data fetched by `useEmployees`, `useCurrentEmployee`, and inline queries
- Holiday data fetched by `useHolidays`, `useHolidayRequests`, `useHolidayLedger`
- Schedule data managed by `useSchedule` with complex local state

### 10.4 Dangerous Patterns

- Auto-archive in `useEmployees` — mutation in query
- Inline Supabase calls in `StaffPortal.tsx` and `StaffHome.tsx`
- Large component files without code splitting

---

## 11. Top 10 Improvements to Make First

1. **Split Holidays.tsx** into `StaffHolidays.tsx` (request + balance) and `AdminHolidayManagement.tsx` (queue + audit + settings)

2. **Fix Training role-gating** — staff should only see `StaffTrainingView`, not library management

3. **Group sidebar navigation** into collapsible sections (People, Schedule & Time, Pay, etc.)

4. **Consolidate Payroll routes** — merge 6 routes into tabbed interface on single `/payroll` page

5. **Merge StaffHome + StaffPortal** — eliminate duplicate profile/announcement displays

6. **Move auto-archive out of useEmployees** — use dedicated mutation or background function

7. **Refactor inline Supabase queries** in StaffPortal/StaffHome to use existing hooks

8. **Add empty state guidance** across all modules — tell users what to do when there's no data

9. **Improve mobile schedule** — default to day view on small screens

10. **Add navigation "quick access"** — surface most-used actions (approve holidays, review timesheets) prominently

---

## 12. Top 10 Things to Simplify or Hide

1. **Hide Payroll Calendar** — merge into main payroll view as tab
2. **Hide Schedule Report** — merge into schedule page as tab
3. **Hide Schedule Analytics** — merge into schedule page as tab
4. **Hide Labour Cost as separate route** — embed in schedule view
5. **Hide Payroll Comparison** — make it a report option, not a page
6. **Hide Holiday Audit as separate route** — make it a tab in Holidays admin view
7. **Simplify employee creation form** — progressive disclosure, essential fields first
8. **Reduce Settings page sections** — group into 4-5 categories with accordion
9. **Hide Historical Import after first use** — only show when no data exists
10. **Hide Permission Visualizer** — platform admin only, rarely needed

---

## 13. Quick Wins

| Quick Win | Effort | Impact |
|-----------|--------|--------|
| Fix Training role-gating | Low | High — security fix |
| Add FOH training links to staff nav | Low | Medium — discoverability |
| Add "Back to Dashboard" on all pages | Low | Medium — navigation |
| Add empty state messages with CTAs | Low | High — first-time UX |
| Rename "Admin Centre" to "Settings" | Low | Medium — clarity |
| Add keyboard shortcuts to CommandPalette help | Low | Low — power users |
| Add loading skeletons to dashboard widgets | Low | Medium — perceived performance |
| Group sidebar with section headers | Medium | High — navigation clarity |

---

## 14. High-Risk Areas Requiring Careful Handling

### 14.1 Payroll Calculations
- Any changes to payroll must preserve: UK compliance, HMRC RTI support, audit trails, locked period protection
- `usePayroll`, `useServiceCharge`, `useLabourCost` are interconnected
- Never modify historical payroll data without explicit admin approval

### 14.2 Tenant Isolation (RLS)
- Every table has `tenant_id` with RLS policies
- `useTenant` provides context — any changes here affect all data access
- Platform admin impersonation must respect tenant boundaries

### 14.3 Holiday Calculations
- Country-specific rules in `country_leave_rules`
- Accrual vs fixed entitlement methods
- Carryover logic via `rebuild-holiday-carryover`
- Ledger integrity via `HolidayIntegrityCheck`
- Changes here could affect all employee balances

### 14.4 Employee Data
- Employee records are referenced by: payroll, schedules, holidays, documents, training, absences, skills, availability, branches
- Cascading deletes on some foreign keys
- Archive flow must preserve historical references

### 14.5 Authentication & Permissions
- `useAuth` provides role resolution
- `ProtectedRoute` enforces access
- `getRoleLevel` defines hierarchy
- `lib/roles.ts` is the single source of truth for role hierarchy
- Any change to role logic affects all route access

---

## 15. End-to-End Flow Traces

### Trace 1: New Signup → Onboarding → Dashboard

```
1. User visits /auth
2. Fills signup form (email + password)
3. Account created in auth.users
4. Redirected to /onboard (CompanyOnboarding)
5. Step 1 (StepAccount): Company name, admin name
6. Step 2 (StepWorkplace): Select business type (restaurant, cafe, bar, hotel, other)
7. Step 3 (StepWorkStyle): Select work pattern
8. Step 4 (StepTeamSize): Select team size range
9. Step 5 (StepPayRhythm): Select pay frequency (weekly, fortnightly, monthly)
10. Step 6 (StepInvite): Enter employee emails to invite
11. Step 7 (StepSummary): Review and confirm
12. provision-tenant edge function called:
    - Creates tenant record
    - Creates tenant_members record (admin role)
    - Creates company_settings record
    - Creates default department if needed
13. Redirected to / (dashboard)
14. Dashboard loads with SetupHealthWidget showing remaining setup tasks
```

**Gaps:**
- No email verification step shown
- No tenant branding setup
- No location creation prompted
- Setup health widget may not clearly guide next steps

### Trace 2: Admin Adds Employee → Invite → Employee Onboards

```
1. Admin navigates to /employees
2. Clicks "Add Employee" → EmployeeFormDialog opens
3. Fills: forename, surname, department, hourly_rate, email, start_date
4. Saves → employee record created in employees table
5. Admin clicks "Invite" on employee row → InviteEmployeeDialog
6. System generates onboarding_token, sets onboarding_token_expires_at
7. Email sent with onboarding link
8. Employee receives email, clicks link
9. Employee visits /auth, creates account
10. System matches email to employee record, sets user_id
11. Employee redirected to /employee-onboarding
12. Step-by-step form: personal info, emergency contact, bank details
13. Each step saves to employee_onboarding_data
14. On completion: onboarding_completed_at set
15. Employee redirected to / (StaffHome)
```

**Gaps:**
- Token expiry handling unclear
- What if employee email doesn't match?
- Status sync between onboarding completion and employee.status

### Trace 3: Document Upload → Verification

```
1. Staff navigates to /staff (StaffPortal)
2. Uploads document via DocumentUploadDialog
3. File stored in Supabase storage
4. employee_documents record created (status: pending)
5. extract-document edge function called (optional AI extraction)
6. Admin sees document in employee detail or ExpiringDocumentsWidget
7. Admin opens DocumentVerificationPanel
8. Reviews extracted data, checks document
9. Approves/rejects with notes
10. document_audit_log entry created
11. Employee notified of verification result
```

### Trace 4: Schedule Creation → Publish → Employee Views

```
1. Manager navigates to /schedule
2. Selects week using ScheduleHeader date picker
3. RotaGrid loads employees and existing shifts
4. Manager clicks empty cell → ShiftCellDialog opens
5. Sets start time, end time, break, role
6. Saves → shift record created via useSchedule
7. Repeats for all employees
8. Optionally: CopyPreviousWeekDialog to clone last week
9. Optionally: LoadTemplateDialog to use saved template
10. ComplianceWarnings checks for issues (max hours, rest periods)
11. Manager clicks "Publish" → PublishConfirmDrawer
12. Confirms → shifts marked as published
13. Employees notified via send-notification
14. Employee views /schedule → sees published shifts
```

### Trace 5: Holiday Request → Approval

```
1. Staff navigates to /holidays
2. Views balance via LeaveYearBalanceCard
3. Clicks "Request Holiday" → HolidayRequestForm
4. Selects dates, adds notes
5. Submits → holiday_requests record created (status: pending)
6. Manager/admin notified
7. Manager views /holidays → HolidayRequestQueue
8. Reviews request (checks team calendar, balance)
9. Approves/rejects with optional notes
10. holiday_ledger entry created on approval
11. Employee balance updated
12. Employee notified of decision
```

### Trace 6: Payroll Period → Review → Approval

```
1. Admin navigates to /payroll
2. Clicks "New Period" → CreatePayrollDialog
3. Sets period dates, pay date
4. System auto-populates employees via AddEmployeeToPeriodDialog
5. EditablePayrollTable shows all employees with:
   - Hours (from approved timesheets)
   - Holiday pay (from holiday ledger)
   - Service charge (if enabled)
   - Deductions
   - Gross/net calculations
6. PayrollInlineAnalytics shows real-time totals
7. Admin reviews, makes adjustments
8. PayrollApprovalWorkflow: draft → reviewed → approved → locked
9. On approval: period locked, audit trail created
10. PayrollPDF generated for records
11. PayrollReminders track deadline compliance
```

### Trace 7: Training Assignment → Completion → Tracking

```
1. Admin/manager navigates to /training
2. Opens TrainingLibraryManager (admin tab — ROLE-GATING BUG)
3. Creates training item with content, requirements
4. Assigns to employees
5. Employee navigates to /training
6. Sees StaffTrainingView with assigned items
7. Completes training (marks complete)
8. Manager views completion status

Note: FOH training (/foh/*) is separate static content,
not integrated with the training assignment system.
```

### Trace 8: Sandbox / Impersonation

```
1. Platform admin navigates to /platform-admin
2. Opens SandboxTestingConsole
3. Creates sandbox tenant or selects existing
4. Uses impersonation to log in as tenant user
5. ImpersonationBanner appears at top of screen
6. Platform admin sees app as that user would
7. All actions are tagged with impersonation context
8. Exits impersonation to return to platform admin view
```

---

## 16. Summary & Next Steps

### What's Already Strong
- Multi-tenant architecture with proper RLS
- Comprehensive module coverage for hospitality HR
- Payroll with UK compliance and audit trails
- Holiday system with country-aware rules
- Document management with verification workflow
- Schedule system with templates and compliance checks
- Platform admin tools for multi-tenant oversight

### What Needs Immediate Attention
1. Split Holidays.tsx (1,119 lines) — highest risk
2. Fix Training role-gating — security issue
3. Group navigation — UX blocker
4. Remove auto-archive side effect from useEmployees — data safety
5. Consolidate payroll routes — simplification

### What Should Be Simplified
- Payroll sub-routes → tabs
- Schedule sub-routes → tabs
- Staff Home + Staff Portal → single hub
- Settings sections → grouped accordion
- Employee form → progressive disclosure

### What Can Be Deferred
- Talent Pool enhancements
- Permission Visualizer improvements
- AI Setup Recommendations refinement
- DayView schedule mode clarification

---

*End of Audit Report*
