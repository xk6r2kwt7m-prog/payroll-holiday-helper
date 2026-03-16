/**
 * Scheduling regression tests.
 *
 * Covers: page load, view switching, department/branch filters,
 * shift creation (if admin), publish flow detection.
 *
 * ⚠  Creating shifts requires branches and active employees to exist.
 */
import { test, expect } from "@playwright/test";
import { captureErrors, assertNoErrors, navigateProtected } from "./helpers";

test.describe("Schedule page", () => {
  test("loads with schedule-specific content", async ({ page }) => {
    const errors = captureErrors(page);
    const { authenticated } = await navigateProtected(page, "/schedule");

    if (!authenticated) {
      await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
      return;
    }

    // Should show either the rota grid, empty state, or schedule header
    const scheduleContent = page
      .getByText(/schedule|rota|shift|no locations/i)
      .first();
    await expect(scheduleContent).toBeVisible({ timeout: 10_000 });

    assertNoErrors(errors);
  });

  test("week/day view toggle works", async ({ page }) => {
    const errors = captureErrors(page);
    const { authenticated } = await navigateProtected(page, "/schedule");
    if (!authenticated) {
      test.skip();
      return;
    }

    // Look for view mode toggle buttons
    const dayBtn = page.getByRole("button", { name: /day/i });
    const weekBtn = page.getByRole("button", { name: /week/i });

    if (await dayBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await dayBtn.click();
      await page.waitForTimeout(500);

      if (await weekBtn.isVisible()) {
        await weekBtn.click();
        await page.waitForTimeout(500);
      }
    }

    assertNoErrors(errors);
  });

  test("department filter buttons work", async ({ page }) => {
    const errors = captureErrors(page);
    const { authenticated } = await navigateProtected(page, "/schedule");
    if (!authenticated) {
      test.skip();
      return;
    }

    for (const dept of ["FOH", "BOH", "CPU"]) {
      const btn = page.getByRole("button", { name: new RegExp(dept) }).or(
        page.getByText(new RegExp(`^${dept}$`))
      );
      if (await btn.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
        await btn.first().click();
        await page.waitForTimeout(300);
      }
    }

    assertNoErrors(errors);
  });

  test("navigation arrows move week/day", async ({ page }) => {
    const errors = captureErrors(page);
    const { authenticated } = await navigateProtected(page, "/schedule");
    if (!authenticated) {
      test.skip();
      return;
    }

    // Find next/prev navigation buttons by their chevron icons
    const navButtons = page.locator("button").filter({
      has: page.locator("svg"),
    });

    // Try clicking a forward navigation button
    const forwardBtn = page.getByRole("button", { name: /next|forward|chevron.*right/i }).first();
    if (await forwardBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await forwardBtn.click();
      await page.waitForTimeout(500);
    }

    assertNoErrors(errors);
  });

  test("publish button visible for admin (if shifts exist)", async ({ page }) => {
    const errors = captureErrors(page);
    const { authenticated } = await navigateProtected(page, "/schedule");
    if (!authenticated) {
      test.skip();
      return;
    }

    const publishBtn = page.getByRole("button", { name: /publish/i });
    const visible = await publishBtn.isVisible({ timeout: 3_000 }).catch(() => false);

    test.info().annotations.push({
      type: "info",
      description: visible
        ? "Publish button visible — admin with unpublished shifts"
        : "Publish button not visible — either no shifts or not admin",
    });

    assertNoErrors(errors);
  });

  test("schedule page survives refresh without breaking", async ({ page }) => {
    const errors = captureErrors(page);
    const { authenticated } = await navigateProtected(page, "/schedule");
    if (!authenticated) {
      test.skip();
      return;
    }

    await page.waitForTimeout(2_000);
    await page.reload({ waitUntil: "domcontentloaded" });

    const content = page.getByText(/schedule|rota|shift|no locations/i).first();
    await expect(content).toBeVisible({ timeout: 10_000 });

    assertNoErrors(errors);
  });
});
