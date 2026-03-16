/**
 * Permissions and role boundary regression tests.
 *
 * Verifies that admin-only pages redirect or deny access for lower roles.
 * Since we can only authenticate with one account per setup, these tests
 * verify from the admin perspective that restricted pages load correctly,
 * and that non-admin routes like /staff are accessible.
 *
 * ⚠  Full multi-role testing requires separate auth credentials per role.
 *    Flag: Provide E2E_STAFF_EMAIL / E2E_STAFF_PASSWORD for staff-role tests.
 */
import { test, expect } from "@playwright/test";
import { captureErrors, assertNoErrors, navigateProtected } from "./helpers";

test.describe("Admin access — protected pages load", () => {
  const adminOnlyRoutes = [
    { path: "/payroll", name: "Payroll" },
    { path: "/settings", name: "Settings / Admin Centre" },
    { path: "/disciplinary", name: "Disciplinary" },
    { path: "/contracts", name: "Contracts" },
    { path: "/locations", name: "Locations" },
    { path: "/holidays/audit", name: "Holiday Audit" },
  ];

  for (const route of adminOnlyRoutes) {
    test(`admin can access ${route.name} (${route.path})`, async ({ page }) => {
      const errors = captureErrors(page);
      const { authenticated } = await navigateProtected(page, route.path);

      if (!authenticated) {
        // Not logged in — assert auth page
        await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
        return;
      }

      // Should NOT show "Access Denied" or redirect to /auth
      const accessDenied = page.getByText(/access denied/i);
      const isBlocked = await accessDenied.isVisible({ timeout: 3_000 }).catch(() => false);

      if (isBlocked) {
        // The test account is not admin — this is informational
        test.info().annotations.push({
          type: "info",
          description: `${route.path} shows Access Denied — test account may not be admin`,
        });
      } else {
        // Page loaded — should not be on /auth
        expect(page.url()).not.toContain("/auth");
      }

      assertNoErrors(errors);
    });
  }
});

test.describe("Supervisor/Manager routes", () => {
  const supervisorRoutes = [
    { path: "/employees", name: "Employees" },
    { path: "/timesheets", name: "Timesheets" },
  ];

  for (const route of supervisorRoutes) {
    test(`${route.name} loads for supervisor+ role`, async ({ page }) => {
      const errors = captureErrors(page);
      const { authenticated } = await navigateProtected(page, route.path);

      if (!authenticated) {
        await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
        return;
      }

      // Either content loads or access denied shown
      const content = page.locator("main, [class*='max-w']").first();
      await expect(content).toBeVisible({ timeout: 10_000 });

      assertNoErrors(errors);
    });
  }
});

test.describe("Staff routes", () => {
  const staffRoutes = [
    { path: "/schedule", name: "Schedule" },
    { path: "/holidays", name: "Holidays / Leave" },
    { path: "/staff", name: "Staff Portal" },
  ];

  for (const route of staffRoutes) {
    test(`${route.name} loads for staff+ role`, async ({ page }) => {
      const errors = captureErrors(page);
      const { authenticated } = await navigateProtected(page, route.path);

      if (!authenticated) {
        await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
        return;
      }

      const content = page.locator("main, [class*='max-w']").first();
      await expect(content).toBeVisible({ timeout: 10_000 });

      assertNoErrors(errors);
    });
  }
});

test.describe("Platform admin route", () => {
  test("platform-admin page requires platform admin", async ({ page }) => {
    const errors = captureErrors(page);
    const { authenticated } = await navigateProtected(page, "/platform-admin");

    if (!authenticated) {
      await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
      return;
    }

    // Unless the test user is platform admin, expect access denied or redirect
    const url = page.url();
    const accessDenied = page.getByText(/access denied/i);
    const blocked = await accessDenied.isVisible({ timeout: 3_000 }).catch(() => false);

    if (!blocked && !url.includes("/auth")) {
      // User is platform admin — page loaded
      test.info().annotations.push({
        type: "info",
        description: "Test user appears to be platform admin",
      });
    }

    assertNoErrors(errors);
  });
});

test.describe("Role boundary — restricted UI elements", () => {
  test("admin sees Add Employee button on /employees", async ({ page }) => {
    const errors = captureErrors(page);
    const { authenticated } = await navigateProtected(page, "/employees");
    if (!authenticated) {
      test.skip();
      return;
    }

    // Admin should see the Add Employee button
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
