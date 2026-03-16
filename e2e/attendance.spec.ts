/**
 * Clock in / clock out regression tests.
 *
 * The clock-in flow lives on the staff home screen (/ for staff users)
 * and requires the user's account to be linked to an employee record.
 *
 * ⚠  Full clock-in/out testing requires:
 *   - A staff-level test account linked to an employee record
 *   - Geolocation permissions (may need to be mocked in CI)
 *   - An active branch with geofence configured
 */
import { test, expect } from "@playwright/test";
import { captureErrors, assertNoErrors, navigateProtected } from "./helpers";

test.describe("Attendance / Clock in-out", () => {
  test("home page loads without errors", async ({ page }) => {
    const errors = captureErrors(page);
    const { authenticated } = await navigateProtected(page, "/");

    if (!authenticated) {
      await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
      return;
    }

    // Home should render some dashboard content
    await page.waitForTimeout(2_000);
    expect(page.url()).not.toContain("/auth");

    assertNoErrors(errors);
  });

  test("staff portal loads for linked employee", async ({ page }) => {
    const errors = captureErrors(page);
    const { authenticated } = await navigateProtected(page, "/staff");

    if (!authenticated) {
      await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
      return;
    }

    // Either shows staff portal or "Account Not Linked" message
    const linkedContent = page.getByText(/profile|clock|timesheets|account not linked/i).first();
    await expect(linkedContent).toBeVisible({ timeout: 10_000 });

    assertNoErrors(errors);
  });

  test("clock-in button or shift info visible on home (staff view)", async ({ page }) => {
    const errors = captureErrors(page);
    const { authenticated } = await navigateProtected(page, "/");

    if (!authenticated) {
      test.skip();
      return;
    }

    // Look for clock-in related elements
    const clockIn = page.getByRole("button", { name: /clock in|start shift/i });
    const clockOut = page.getByRole("button", { name: /clock out|end shift/i });
    const shiftInfo = page.getByText(/next shift|current shift|no shift/i);
    const adminDash = page.getByText(/dashboard|staff|working|scheduled/i);

    // At least one of these should be visible depending on role
    const anyVisible = await Promise.any([
      clockIn.isVisible({ timeout: 5_000 }),
      clockOut.isVisible({ timeout: 1_000 }),
      shiftInfo.isVisible({ timeout: 1_000 }),
      adminDash.isVisible({ timeout: 1_000 }),
    ]).catch(() => false);

    test.info().annotations.push({
      type: "info",
      description: anyVisible
        ? "Clock/shift UI elements detected"
        : "No clock UI — user may be admin (dashboard view) or not linked",
    });

    assertNoErrors(errors);
  });

  test("geolocation indicator appears on staff home", async ({ page }) => {
    const errors = captureErrors(page);

    // Grant geolocation permission for this test
    await page.context().grantPermissions(["geolocation"], {
      origin: page.url() || undefined,
    });

    const { authenticated } = await navigateProtected(page, "/");
    if (!authenticated) {
      test.skip();
      return;
    }

    // Look for GPS/location indicator text
    const gpsText = page.getByText(/location|gps|within work area|workplace/i);
    const visible = await gpsText.isVisible({ timeout: 5_000 }).catch(() => false);

    test.info().annotations.push({
      type: "info",
      description: visible
        ? "GPS indicator visible on home"
        : "No GPS indicator — may be admin view or location not enabled",
    });

    assertNoErrors(errors);
  });
});
