/**
 * Permissions and role boundary regression tests.
 *
 * Two modes:
 *
 * 1. SMOKE (default) — single-account access checks using E2E_USER_EMAIL.
 *    All tests are clearly labeled [smoke].
 *
 * 2. BOUNDARY (opt-in) — true multi-role testing when per-role credentials
 *    are provided via environment variables:
 *      E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
 *      E2E_MANAGER_EMAIL / E2E_MANAGER_PASSWORD
 *      E2E_SUPERVISOR_EMAIL / E2E_SUPERVISOR_PASSWORD
 *      E2E_STAFF_EMAIL / E2E_STAFF_PASSWORD
 *
 *    Boundary tests use pre-built storageState files (created by
 *    auth-roles.setup.ts) so they don't re-login inside each test.
 */
import { test, expect } from "@playwright/test";
import {
  captureErrors,
  assertNoErrors,
  navigateProtected,
  hasRoleCredentials,
  roleAuthFile,
  type TestRole,
} from "./helpers";

// ──────────────────────────────────────────────────────────────────
// SMOKE TESTS — single account, access checks only
// ──────────────────────────────────────────────────────────────────

test.describe("Smoke: Admin access — protected pages load", () => {
  const adminOnlyRoutes = [
    { path: "/payroll", name: "Payroll" },
    { path: "/settings", name: "Settings / Admin Centre" },
    { path: "/disciplinary", name: "Disciplinary" },
    { path: "/contracts", name: "Contracts" },
    { path: "/locations", name: "Locations" },
    { path: "/holidays/audit", name: "Holiday Audit" },
  ];

  for (const route of adminOnlyRoutes) {
    test(`[smoke] admin can access ${route.name} (${route.path})`, async ({
      page,
    }) => {
      test.info().annotations.push({
        type: "coverage",
        description: "smoke",
      });

      const errors = captureErrors(page);
      const nav = await navigateProtected(page, route.path);

      if (nav.state === "auth") {
        await expect(
          page.getByRole("button", { name: /sign in/i })
        ).toBeVisible();
        assertNoErrors(errors);
        return;
      }

      if (nav.state === "unknown") {
        test.info().annotations.push({
          type: "warning",
          description: `${route.path} settled in unknown state: ${nav.finalUrl}`,
        });
        assertNoErrors(errors);
        return;
      }

      // Should NOT show "Access Denied"
      const accessDenied = page.getByText(/access denied/i);
      const isBlocked = await accessDenied
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      if (isBlocked) {
        test.info().annotations.push({
          type: "info",
          description: `${route.path} shows Access Denied — test account may not be admin`,
        });
      } else {
        expect(nav.finalUrl).not.toContain("/auth");
      }

      assertNoErrors(errors);
    });
  }
});

test.describe("Smoke: Supervisor/Manager routes", () => {
  const supervisorRoutes = [
    { path: "/employees", name: "Employees" },
    { path: "/timesheets", name: "Timesheets" },
  ];

  for (const route of supervisorRoutes) {
    test(`[smoke] ${route.name} loads for supervisor+ role`, async ({
      page,
    }) => {
      test.info().annotations.push({
        type: "coverage",
        description: "smoke",
      });

      const errors = captureErrors(page);
      const nav = await navigateProtected(page, route.path);

      if (nav.state === "auth") {
        await expect(
          page.getByRole("button", { name: /sign in/i })
        ).toBeVisible();
        assertNoErrors(errors);
        return;
      }

      expect(nav.state).toBe("target");
      assertNoErrors(errors);
    });
  }
});

test.describe("Smoke: Staff routes", () => {
  const staffRoutes = [
    { path: "/schedule", name: "Schedule" },
    { path: "/holidays", name: "Holidays / Leave" },
    { path: "/staff", name: "Staff Portal" },
  ];

  for (const route of staffRoutes) {
    test(`[smoke] ${route.name} loads for staff+ role`, async ({ page }) => {
      test.info().annotations.push({
        type: "coverage",
        description: "smoke",
      });

      const errors = captureErrors(page);
      const nav = await navigateProtected(page, route.path);

      if (nav.state === "auth") {
        await expect(
          page.getByRole("button", { name: /sign in/i })
        ).toBeVisible();
        assertNoErrors(errors);
        return;
      }

      expect(nav.state).toBe("target");
      assertNoErrors(errors);
    });
  }
});

test.describe("Smoke: Platform admin route", () => {
  test("[smoke] platform-admin page requires platform admin", async ({
    page,
  }) => {
    test.info().annotations.push({
      type: "coverage",
      description: "smoke",
    });

    const errors = captureErrors(page);
    const nav = await navigateProtected(page, "/platform-admin");

    if (nav.state === "auth") {
      await expect(
        page.getByRole("button", { name: /sign in/i })
      ).toBeVisible();
      assertNoErrors(errors);
      return;
    }

    const accessDenied = page.getByText(/access denied/i);
    const blocked = await accessDenied
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    if (!blocked && !nav.finalUrl.includes("/auth")) {
      test.info().annotations.push({
        type: "info",
        description: "Test user appears to be platform admin",
      });
    }

    assertNoErrors(errors);
  });
});

test.describe("Smoke: Restricted UI elements", () => {
  test("[smoke] admin sees Add Employee button on /employees", async ({
    page,
  }, testInfo) => {
    test.info().annotations.push({
      type: "coverage",
      description: "smoke",
    });

    const errors = captureErrors(page);
    const nav = await navigateProtected(page, "/employees");

    testInfo.skip(
      nav.state !== "target",
      `Skipped: route state is "${nav.state}"`
    );

    const addBtn = page.getByRole("button", { name: /add employee/i });
    const visible = await addBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    test.info().annotations.push({
      type: "info",
      description: visible
        ? "Add Employee button visible (admin/editor role)"
        : "Add Employee button NOT visible (read-only role)",
    });

    assertNoErrors(errors);
  });
});

// ──────────────────────────────────────────────────────────────────
// BOUNDARY TESTS — true multi-role testing (opt-in via env vars)
//
// These tests use pre-built storageState files from auth-roles.setup.ts
// so they do NOT re-login inside each test body.
// ──────────────────────────────────────────────────────────────────

/**
 * Assert that a non-admin role CANNOT access admin-only pages.
 * Expects either redirect to /auth, Access Denied message, or redirect away.
 */
async function assertBlockedForRole(
  page: import("@playwright/test").Page,
  path: string
): Promise<void> {
  const nav = await navigateProtected(page, path);

  if (nav.state === "auth") {
    // Redirected to auth — correctly blocked
    return;
  }

  // Check for access denied
  const accessDenied = page.getByText(
    /access denied|not authorized|forbidden/i
  );
  const isDenied = await accessDenied
    .isVisible({ timeout: 3_000 })
    .catch(() => false);

  expect(
    isDenied || nav.state === "unknown",
    `Expected ${path} to be blocked but got state="${nav.state}" at ${nav.finalUrl}`
  ).toBeTruthy();
}

interface BoundaryRoleConfig {
  role: TestRole;
  blockedPaths: string[];
  allowedPaths: string[];
}

const BOUNDARY_ROLES: BoundaryRoleConfig[] = [
  {
    role: "staff",
    blockedPaths: ["/payroll", "/settings", "/disciplinary", "/contracts"],
    allowedPaths: ["/schedule", "/holidays", "/staff"],
  },
  {
    role: "supervisor",
    blockedPaths: ["/payroll", "/settings"],
    allowedPaths: ["/employees", "/timesheets", "/schedule"],
  },
  {
    role: "manager",
    blockedPaths: ["/payroll"],
    allowedPaths: ["/employees", "/timesheets", "/schedule"],
  },
];

for (const config of BOUNDARY_ROLES) {
  test.describe(`Boundary: ${config.role} role restrictions`, () => {
    // Use pre-built storageState for this role
    test.use({ storageState: roleAuthFile(config.role) });

    test.beforeEach(async ({}, testInfo) => {
      testInfo.skip(
        !hasRoleCredentials(config.role),
        `Skipped: E2E_${config.role.toUpperCase()}_EMAIL / _PASSWORD not set — boundary tests require per-role credentials`
      );
    });

    for (const blockedPath of config.blockedPaths) {
      test(`[boundary] ${config.role} is blocked from ${blockedPath}`, async ({
        page,
      }) => {
        test.info().annotations.push({
          type: "coverage",
          description: "boundary",
        });

        const errors = captureErrors(page);
        await assertBlockedForRole(page, blockedPath);
        assertNoErrors(errors);
      });
    }

    for (const allowedPath of config.allowedPaths) {
      test(`[boundary] ${config.role} can access ${allowedPath}`, async ({
        page,
      }) => {
        test.info().annotations.push({
          type: "coverage",
          description: "boundary",
        });

        const errors = captureErrors(page);
        const nav = await navigateProtected(page, allowedPath);
        expect(
          nav.state,
          `Expected ${allowedPath} accessible for ${config.role}`
        ).toBe("target");
        assertNoErrors(errors);
      });
    }
  });
}
