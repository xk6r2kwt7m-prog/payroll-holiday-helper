/**
 * Safe rehearsal helpers for the contract flow.
 *
 * SAFETY:
 * - Pure functions only. No React, Supabase, network or side effects.
 * - Nothing here touches payroll, holiday, NMW or service-charge logic.
 * - A "test send" must never write to a real staff member's record: callers
 *   use `shouldPersistSendStatus` to decide whether the document send status
 *   is updated at all.
 */

export const TEST_SUBJECT_PREFIX = "[TEST]";

/** Name used for the clearly-marked rehearsal staff record. */
export const TEST_EMPLOYEE_FORENAME = "ZZ Test";
export const TEST_EMPLOYEE_SURNAME = "Staff (do not pay)";
export const TEST_EMPLOYEE_NAME = `${TEST_EMPLOYEE_FORENAME} ${TEST_EMPLOYEE_SURNAME}`;

export interface TestSendResolution {
  /** Address the email is actually delivered to. */
  recipient: string;
  /** True when this is a rehearsal send to the admin's own inbox. */
  isTest: boolean;
  /** True only for real sends — test sends never persist send status. */
  shouldPersistSendStatus: boolean;
  /** True only for real sends — test sends never overwrite the staff email. */
  shouldSaveEmailToEmployee: boolean;
}

/**
 * Decide where a contract email goes and what may be persisted.
 * In test mode the admin's own address wins and no staff record is touched.
 */
export function resolveTestSend(params: {
  testMode: boolean;
  staffEmail?: string | null;
  adminEmail?: string | null;
  overrideEmail?: string | null;
}): TestSendResolution {
  const staff = (params.staffEmail || "").trim();
  const admin = (params.adminEmail || "").trim();
  const override = (params.overrideEmail || "").trim();

  if (params.testMode) {
    return {
      recipient: override || admin,
      isTest: true,
      shouldPersistSendStatus: false,
      shouldSaveEmailToEmployee: false,
    };
  }

  return {
    recipient: override || staff,
    isTest: false,
    shouldPersistSendStatus: true,
    shouldSaveEmailToEmployee: true,
  };
}

/** Prefix the subject so a rehearsal email is obvious in the inbox. */
export function applyTestSubject(subject: string, isTest: boolean): string {
  if (!isTest) return subject;
  return subject.startsWith(TEST_SUBJECT_PREFIX) ? subject : `${TEST_SUBJECT_PREFIX} ${subject}`;
}

export interface TestFlaggedEmployee {
  is_test_record?: boolean | null;
  forename?: string | null;
  surname?: string | null;
}

/** True for the rehearsal staff record (flag first, name as legacy fallback). */
export function isTestEmployee(employee?: TestFlaggedEmployee | null): boolean {
  if (!employee) return false;
  if (employee.is_test_record) return true;
  const full = `${employee.forename || ""} ${employee.surname || ""}`.trim();
  return full.toLowerCase() === TEST_EMPLOYEE_NAME.toLowerCase();
}

/** Field values for creating the rehearsal staff record. */
export function buildTestEmployeeInsert(params: { tenantId: string; email: string; branchId?: string | null }) {
  return {
    tenant_id: params.tenantId,
    forename: TEST_EMPLOYEE_FORENAME,
    surname: TEST_EMPLOYEE_SURNAME,
    email: params.email,
    status: "starter" as const,
    job_title: "Test Record",
    is_test_record: true,
    start_date: new Date().toISOString().slice(0, 10),
    branch_id: params.branchId || null,
  };
}
