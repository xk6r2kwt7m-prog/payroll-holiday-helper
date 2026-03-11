# System Architecture — Uglo Platform

> Generated: 2026-03-11 | Multi-tenant SaaS HR & Payroll Platform

---

## 1. Database Schema Overview

### Core Tenant Tables
| Table | Purpose | Tenant-scoped |
|-------|---------|:---:|
| `tenants` | Company workspaces (name, slug, country, timezone, logo) | — (root) |
| `tenant_members` | User↔Tenant membership with role (`company_admin`, `manager`, `supervisor`, `employee`) | ✓ |
| `platform_admins` | Global super-admins (cross-tenant oversight) | — |
| `profiles` | User profile data (full_name, avatar, phone) | — (user-scoped) |
| `user_roles` | Legacy RBAC roles (`admin`, `manager`, `supervisor`, `staff`, `viewer`) | ✓ |
| `company_settings` | Per-tenant branding, pay config, notification prefs | ✓ |

### Employee & HR Tables
| Table | Purpose |
|-------|---------|
| `employees` | Core employee records (name, rate, department, status, NI, bank details) |
| `employee_branches` | Many-to-many employee↔branch assignments |
| `employee_changes` | Audit trail for employee record modifications |
| `employee_documents` | Document metadata (contracts, ID, visa) linked to Storage |
| `contract_signatures` | E-signature records with IP/UA audit trail |
| `onboarding_templates` | Checklist templates by category |
| `onboarding_progress` | Per-employee onboarding task completion |
| `training_records` | Certifications, expiry tracking |
| `disciplinary_records` | Warnings, investigations, appeals |
| `absence_records` | Sick leave, unauthorised absence tracking |
| `return_to_work_forms` | Post-absence RTW interview records |

### Payroll Tables
| Table | Purpose |
|-------|---------|
| `payroll_periods` | Pay periods with status lifecycle (`draft` → `review` → `approved` → `closed`) |
| `payroll_entries` | Per-employee pay calculation per period |
| `payroll_imports` | CSV/Excel import audit records |
| `payroll_overpayments` | Overpayment detection and recovery tracking |
| `holiday_payments` | Holiday pay disbursements linked to payroll periods |
| `admin_notes` | Period-scoped admin annotations |

### Holiday & Leave Tables
| Table | Purpose |
|-------|---------|
| `country_leave_rules` | Country-level statutory defaults (UK, CV, etc.) |
| `tenant_leave_settings` | Per-tenant overrides (accrual rate, carryover, leave year) |
| `holiday_balances` | Per-employee leave year accrual/taken/carried-over |
| `holiday_adjustments` | Manual balance corrections with audit trail |

### Scheduling & Time Tables
| Table | Purpose |
|-------|---------|
| `shifts` | Individual shift assignments with publish workflow |
| `schedule_templates` | Reusable weekly schedule patterns |
| `schedule_template_shifts` | Shifts within a template |
| `location_settings` | Per-branch scheduling, clock-in, and geofence config |
| `branch_locations` | Branch GPS coordinates and geofence radii |

### Communication Tables
| Table | Purpose |
|-------|---------|
| `staff_announcements` | Targeted announcements with priority and expiry |
| `announcement_read_receipts` | Per-employee read tracking |

### Audit Table
| Table | Purpose |
|-------|---------|
| `audit_log` | System-wide audit trail (action, old/new data, IP, user agent) |

---

## 2. Tenant Isolation Model

### Architecture
```
┌─────────────────────────────────────────────┐
│              Platform Layer                  │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │  platform_   │  │  country_leave_      │  │
│  │  admins      │  │  rules               │  │
│  └─────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────┤
│         Tenant Boundary (RLS)                │
│  ┌──────────────────────────────────────┐   │
│  │  tenants                              │   │
│  │    ├── tenant_members                 │   │
│  │    ├── company_settings               │   │
│  │    ├── tenant_leave_settings          │   │
│  │    ├── employees                      │   │
│  │    │     ├── payroll_entries           │   │
│  │    │     ├── holiday_balances          │   │
│  │    │     ├── shifts                    │   │
│  │    │     ├── absence_records           │   │
│  │    │     └── employee_documents       │   │
│  │    ├── payroll_periods                │   │
│  │    ├── schedule_templates             │   │
│  │    └── staff_announcements            │   │
│  └──────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│            User Layer                        │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │  profiles    │  │  user_roles          │  │
│  │  (user-own)  │  │  (tenant-scoped)     │  │
│  └─────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Isolation Enforcement
- **Every tenant-scoped table** has a `tenant_id UUID NOT NULL` column with a foreign key to `tenants.id`.
- **PostgreSQL Row-Level Security (RLS)** is enabled on all tables.
- RLS policies use `SECURITY DEFINER` helper functions to prevent recursive policy checks:
  - `is_tenant_member(_tenant_id)` — basic membership check
  - `is_tenant_admin(_tenant_id)` — company_admin or platform_admin
  - `is_tenant_manager_or_above(_tenant_id)` — company_admin or manager
  - `is_tenant_supervisor_or_above(_tenant_id)` — company_admin, manager, or supervisor
  - `is_platform_admin()` — global super-admin check

### Role Hierarchy
```
Platform Super Admin (cross-tenant oversight, no tenant HR/financial data access)
  └── Company Admin (full workspace management)
        └── Manager (team coordination, read access to HR data)
              └── Supervisor (scheduling, employee view)
                    └── Employee (own data, published shifts, announcements)
                          └── Viewer (read-only)
```

---

## 3. Leave Rules Resolution Architecture

### Resolution Hierarchy
```
Tenant Override (tenant_leave_settings)
       │
       ▼ (fallback if NULL)
Country Default (country_leave_rules)
       │
       ▼ (fallback if country not found)
Legacy UK Constant (0.1207 accrual, 5.6 statutory weeks)
```

### Implementation: `useLeaveRules` Hook
```typescript
// Resolution flow (src/hooks/useLeaveRules.ts)
1. Fetch country_leave_rules WHERE country_code = tenant.country
2. Fetch tenant_leave_settings WHERE tenant_id = current tenant
3. Merge: tenant non-null values override country defaults
4. Return ResolvedLeaveRules interface
```

### Key Resolved Fields
| Field | Source Priority | Default |
|-------|----------------|---------|
| `accrualRate` | tenant → country | 0.1207 |
| `statutoryWeeks` | country only | 5.6 |
| `maxStatutoryDays` | country only | 28 |
| `standardWeekHours` | tenant → country | 40 |
| `workdaysPerWeek` | tenant → country | 5 |
| `maxCarryoverDays` | tenant → country | 8 |
| `leaveYearStartMonth` | tenant → country | 1 (January) |
| `publicHolidayCount` | country only | 8 |
| `includeServiceChargeInHoliday` | tenant only | false |
| `autoCalculateAccrual` | tenant only | true |

### Caching Strategy
- React Query with 5-minute stale time (rules rarely change)
- `useUpdateTenantLeaveSettings` immediately invalidates the cache on mutation

---

## 4. Key Calculation Functions

### Database Functions (PostgreSQL)

#### `calculate_holiday_accrual(hours_worked NUMERIC) → NUMERIC`
```sql
ROUND(hours_worked * 0.1207, 2)
-- IMMUTABLE — pinned to UK statutory rate for historical integrity
```

#### `set_holiday_accrual()` — Trigger Function
```sql
-- Fires on payroll_entries INSERT/UPDATE
NEW.holiday_accrued_hours = calculate_holiday_accrual(
  COALESCE(NEW.imported_hours, NEW.timesheet_hours)
)
```

#### `recalculate_total_pay()` — Trigger Function
```sql
-- Unified payroll formula
NEW.total_pay = ROUND(
  (timesheet_hours × hourly_rate)
  + (timesheet_hours × COALESCE(service_charge, 0))
  + COALESCE(performance_bonus, 0)
  + COALESCE(special_bonus, 0)
, 2)
```

#### `calculate_time_entry_hours()` — Trigger Function
```sql
-- Auto-calculates hours from clock-in/out with break deduction
total_hours = ROUND(
  EXTRACT(EPOCH FROM (clock_out - clock_in)) / 3600
  - (break_minutes / 60)
, 2)
```

#### `prevent_payroll_period_overlap()` — Validation Trigger
```sql
-- Prevents overlapping payroll periods using daterange operators
```

#### `set_leave_year_from_holiday_date()` — Auto-populate Trigger
```sql
-- Sets leave_year_start/end based on holiday_taken_date
```

### Client-Side Functions

#### `calculateAccrual(hoursWorked, accrualRate, precision)` — `useLeaveRules.ts`
```typescript
Number((hoursWorked * accrualRate).toFixed(precision))
// Used for UI preview; DB trigger handles stored values
```

#### `calculateAnnualEntitlement(weeklyHours, statutoryWeeks)`
```typescript
weeklyHours * statutoryWeeks
// e.g. 40 × 5.6 = 224 hours annual entitlement
```

### Accrual Rate Usage Map
| Location | Rate Source | Purpose |
|----------|-----------|---------|
| DB trigger `set_holiday_accrual` | Hardcoded `0.1207` | Stored accrual on payroll entries |
| `EditablePayrollTable.tsx` | `leaveRules?.accrualRate ?? 0.1207` | UI preview column |
| `Index.tsx` (Dashboard) | `leaveRules?.accrualRate ?? 0.1207` | Dashboard stat display |
| `Holidays.tsx` | `leaveRules?.accrualRate ?? 0.1207` | Holiday balance calculations |
| `usePayrollAudit.ts` | Hardcoded `0.1207` | Historical audit verification |
| `ImportPayrollDialog.tsx` | `calculateAccrual(hours, 0.1207)` | Import preview |

---

## 5. Security Model

### Authentication
- **Supabase Auth** with email/password sign-up and sign-in
- Email verification required (auto-confirm disabled)
- JWT-based session management
- `AuthProvider` context provides `user`, `session`, `role`, and helper booleans

### Authorization Layers

#### Layer 1: Route Protection (`ProtectedRoute.tsx`)
```
Unauthenticated → /auth
Authenticated + No Tenant → /onboard
Authenticated + Tenant → Render children
```

#### Layer 2: Client-Side RBAC (`useAuth.tsx`)
```typescript
isAdmin          // role === 'admin'
isManagerOrAbove // role hierarchy >= manager
isSupervisorOrAbove // role hierarchy >= supervisor
```

#### Layer 3: Database RLS (PostgreSQL)
All data access enforced at the database level:

| Access Level | RLS Function | Tables |
|-------------|-------------|--------|
| Tenant Admin | `is_tenant_admin(tenant_id)` | ALL tables (full CRUD) |
| Manager+ | `is_tenant_manager_or_above(tenant_id)` | Employees, absences, holidays, onboarding (SELECT) |
| Supervisor+ | `is_tenant_supervisor_or_above(tenant_id)` | Employees, shifts (SELECT) |
| Member | `is_tenant_member(tenant_id)` | Settings, locations, branches (SELECT) |
| Platform Admin | `is_platform_admin()` | Tenants, members, country rules (ALL) |
| Own Data | `auth.uid() = user_id` | Profiles, user_roles (SELECT) |

### Storage Security
- `employee-documents` bucket: Private (RLS-protected)
- `payroll-files` bucket: Private (RLS-protected)

### Audit Trail
- `audit_log` table captures action, old/new data, IP address, user agent
- `employee_changes` table tracks field-level modifications
- Contract signatures include IP and user agent

---

## 6. Onboarding Flow

### Company Onboarding (New Customer)
```
1. User signs up at /auth
2. Email verification
3. User logs in → ProtectedRoute detects no tenant_id
4. Redirect to /onboard (CompanyOnboarding page)
5. User enters: Company Name, Country, Timezone
6. Frontend calls Edge Function: provision-tenant
   └── Creates tenant record
   └── Creates tenant_members (role: company_admin)
   └── Creates user_roles (role: admin)
   └── Creates company_settings
   └── Creates tenant_leave_settings
7. TenantProvider re-fetches → tenant resolved
8. Redirect to / (Dashboard)
```

### Employee Onboarding (Existing Tenant)
```
1. Admin creates employee record
2. Employee status set to 'starter'
3. 14 pre-seeded onboarding checklist items auto-assigned
   Categories: Documents, Training, Equipment, General
4. Admin tracks completion via onboarding_progress table
5. Status changed to 'active' when complete
```

---

## 7. Main Modules & Dependencies

### Module Dependency Graph
```
┌─────────────────────────────────────────────────────┐
│                    App Shell                         │
│  AppLayout → Sidebar, MobileBottomNav, CommandPalette│
│  AuthProvider → TenantProvider → ProtectedRoute      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐   │
│  │Dashboard │    │Employees │    │  Payroll      │   │
│  │(Index)   │◄───│          │◄───│              │   │
│  └────┬─────┘    └────┬─────┘    └──────┬───────┘   │
│       │               │                 │            │
│       ▼               ▼                 ▼            │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐   │
│  │Holidays  │◄───│Absences  │    │PayrollAudit  │   │
│  │          │    │          │    │              │   │
│  └────┬─────┘    └──────────┘    └──────────────┘   │
│       │                                              │
│       ▼                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐   │
│  │Leave     │    │Schedule  │    │Contracts     │   │
│  │Rules     │    │          │    │              │   │
│  └──────────┘    └──────────┘    └──────────────┘   │
│                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐   │
│  │Locations │    │Training  │    │Announcements │   │
│  │          │    │Records   │    │              │   │
│  └──────────┘    └──────────┘    └──────────────┘   │
│                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐   │
│  │Settings  │    │Onboarding│    │Disciplinary  │   │
│  │          │    │          │    │              │   │
│  └──────────┘    └──────────┘    └──────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Shared Hooks (Cross-Module Dependencies)
| Hook | Used By | Purpose |
|------|---------|---------|
| `useAuth` | All modules | Authentication state, role checks |
| `useTenant` | All modules | Tenant context, tenant_id injection |
| `useEmployees` | Dashboard, Payroll, Holidays, Schedule, Absences, Contracts | Employee data |
| `useLeaveRules` | Dashboard, Payroll, Holidays, PayrollAudit | Resolved leave calculation rules |
| `useCompanySettings` | Settings, Contracts, Letters, Layout | Branding and config |
| `usePayroll` | Payroll, PayrollAudit, PayrollAnalytics | Payroll CRUD |
| `useHolidays` | Holidays, HolidayAudit, Payroll | Balance and payment management |
| `useSchedule` | Schedule, ScheduleAnalytics, ScheduleReport | Shift management |
| `useNotifications` | Layout (global) | Toast/alert notifications |

### Edge Functions
| Function | Purpose |
|----------|---------|
| `provision-tenant` | Company workspace creation during onboarding |
| `clock-in-out` | Geofenced time tracking |
| `sign-contract` | E-signature processing |
| `send-notification` | Email/push notification dispatch |
| `archive-leavers` | Automated employee archival |
| `merge-duplicate-employees` | Data deduplication |
| `import-historical-payroll` | Bulk historical data import |

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **UI Components**: shadcn/ui (Radix primitives)
- **State Management**: TanStack React Query (server state), React Context (auth/tenant)
- **Routing**: React Router v6
- **Backend**: Supabase (Lovable Cloud) — PostgreSQL + Auth + Storage + Edge Functions
- **PDF Generation**: @react-pdf/renderer
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Drag & Drop**: @dnd-kit/core

---

## 8. Data Flow Summary

### Payroll Calculation Flow
```
Timesheet/Import Hours
       │
       ▼
payroll_entries INSERT/UPDATE
       │
       ├── Trigger: set_holiday_accrual()
       │     └── holiday_accrued_hours = hours × 0.1207
       │
       └── Trigger: recalculate_total_pay()
             └── total_pay = (hours × rate) + (hours × SC) + bonuses
```

### Holiday Balance Flow
```
payroll_entries.holiday_accrued_hours (aggregated)
       │
       ▼
holiday_balances.hours_accrued (summed per leave year)
       │
       ├── minus: holiday_payments.hours (hours taken)
       ├── plus:  holiday_adjustments.hours (manual corrections)
       └── plus:  holiday_balances.hours_carried_over
       │
       ▼
Net Balance = accrued + carried_over + adjustments - taken
```

---

*This document reflects the system state after completing Phases 1–7 of the multi-tenant SaaS migration.*
