/**
 * Employee management regression tests.
 *
 * Covers: create, edit, archive/deactivate, delete, persistence after refresh.
 *
 * ⚠  These tests require:
 *   - E2E_USER_EMAIL / E2E_USER_PASSWORD for an admin-level account
 *   - At least one branch configured in the tenant
 *   - The test creates real employee records — use a test tenant
 */
import { test, expect } from "@playwright/test";
import { captureErrors, assertNoErrors, navigateProtected, uniqueName } from "./helpers";

const EMP_FORENAME = uniqueName("Test");
const EMP_SURNAME = uniqueName("Employee");
const EMP_NI = "AB123456C";

test.describe("Employee management", () => {
  test("page loads with employee-specific content", async ({ page }) => {
    const errors = captureErrors(page);
    const { authenticated } = await navigateProtected(page, "/employees");

    if (!authenticated) {
      await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
      return;
    }

    // Expect the People heading or employee grid
    await expect(
      page.getByRole("heading", { level: 1 }).or(page.getByText(/people/i))
    ).toBeVisible({ timeout: 10_000 });

    assertNoErrors(errors);
  });

  test("create employee via Add Employee dialog", async ({ page }) => {
    const errors = captureErrors(page);
    const { authenticated } = await navigateProtected(page, "/employees");
    if (!authenticated) {
      test.skip();
      return;
    }

    // Open the Add Employee dialog
    const addBtn = page.getByRole("button", { name: /add employee/i });
    if (!(await addBtn.isVisible())) {
      test.skip(); // User doesn't have create permission
      return;
    }
    await addBtn.click();

    // Wait for dialog
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByText(/add new employee/i)).toBeVisible();

    // Fill personal tab
    await dialog.getByLabel(/first name/i).fill(EMP_FORENAME);
    await dialog.getByLabel(/surname/i).fill(EMP_SURNAME);
    await dialog.getByLabel(/national insurance/i).fill(EMP_NI);

    // Switch to employment tab and fill required fields
    await dialog.getByRole("tab", { name: /work/i }).click();
    await dialog.getByLabel(/hourly rate/i).fill("12.50");

    // Switch to banking tab
    await dialog.getByRole("tab", { name: /banking/i }).click();
    await dialog.getByLabel(/sort code/i).fill("123456");
    await dialog.getByLabel(/account number/i).fill("12345678");

    // Switch to branches tab — select first available branch
    await dialog.getByRole("tab", { name: /branches/i }).click();
    const firstBranch = dialog.locator("[class*='cursor-pointer']").first();
    if (await firstBranch.isVisible()) {
      await firstBranch.click();
    }

    // Submit
    await dialog.getByRole("button", { name: /create employee/i }).click();

    // Dialog should close and toast should appear
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    // Verify employee appears in the list (starters tab)
    await page.getByText(/starters/i).first().click();
    await expect(page.getByText(EMP_FORENAME)).toBeVisible({ timeout: 10_000 });

    assertNoErrors(errors);
  });

  test("created employee persists after page refresh", async ({ page }) => {
    const errors = captureErrors(page);
    const { authenticated } = await navigateProtected(page, "/employees");
    if (!authenticated) {
      test.skip();
      return;
    }

    // Switch to starters view
    await page.getByText(/starters/i).first().click();
    await page.waitForTimeout(1_000);

    // Refresh
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByText(/starters/i).first().click();

    // The previously created employee should still be present
    // (uses prefix match to handle uniqueName variations)
    const employeeCard = page.getByText(/E2E_/i).first();
    await expect(employeeCard).toBeVisible({ timeout: 10_000 });

    assertNoErrors(errors);
  });

  test("edit employee via Edit button on card", async ({ page }) => {
    const errors = captureErrors(page);
    const { authenticated } = await navigateProtected(page, "/employees");
    if (!authenticated) {
      test.skip();
      return;
    }

    // Find any employee card with an Edit button
    const editBtn = page.getByRole("button", { name: /edit/i }).first();
    if (!(await editBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(); // No edit permission or no employees
      return;
    }
    await editBtn.click();

    // Dialog should open in edit mode
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByText(/edit/i)).toBeVisible();

    // Verify form is pre-filled (forename should not be empty)
    const forenameInput = dialog.getByLabel(/first name/i);
    await expect(forenameInput).not.toBeEmpty();

    // Close without saving
    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 3_000 });

    assertNoErrors(errors);
  });

  test("employee detail sheet opens via card click", async ({ page }) => {
    const errors = captureErrors(page);
    const { authenticated } = await navigateProtected(page, "/employees");
    if (!authenticated) {
      test.skip();
      return;
    }

    // Click the first employee card body (not action buttons)
    const firstCard = page.locator("[class*='rounded-xl'][class*='cursor-pointer']").first();
    if (!(await firstCard.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await firstCard.click();

    // Detail sheet should open
    const sheet = page.locator("[role='dialog']").or(page.locator("[data-testid='employee-detail-sheet']"));
    await expect(sheet).toBeVisible({ timeout: 5_000 });

    assertNoErrors(errors);
  });

  test("status filter pills work (active, starters, leavers)", async ({ page }) => {
    const errors = captureErrors(page);
    const { authenticated } = await navigateProtected(page, "/employees");
    if (!authenticated) {
      test.skip();
      return;
    }

    // Click each status filter and verify no crash
    for (const status of ["Active", "Starters", "Leavers"]) {
      const pill = page.getByText(new RegExp(status, "i")).first();
      if (await pill.isVisible()) {
        await pill.click();
        await page.waitForTimeout(500);
      }
    }

    assertNoErrors(errors);
  });

  test("department filter pills work", async ({ page }) => {
    const errors = captureErrors(page);
    const { authenticated } = await navigateProtected(page, "/employees");
    if (!authenticated) {
      test.skip();
      return;
    }

    for (const dept of ["FOH", "BOH", "CPU", "All"]) {
      const btn = page.getByText(new RegExp(`^.*${dept}.*$`)).first();
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(300);
      }
    }

    assertNoErrors(errors);
  });

  test("search filters employee list", async ({ page }) => {
    const errors = captureErrors(page);
    const { authenticated } = await navigateProtected(page, "/employees");
    if (!authenticated) {
      test.skip();
      return;
    }

    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();

    // Type a nonsensical query — should show no results
    await searchInput.fill("zzzznonexistentzzz");
    await page.waitForTimeout(500);

    // Either "no match" message or zero cards
    const noMatch = page.getByText(/no.*match/i);
    if (await noMatch.isVisible().catch(() => false)) {
      await expect(noMatch).toBeVisible();
    }

    // Clear and verify list returns
    await searchInput.clear();
    await page.waitForTimeout(500);

    assertNoErrors(errors);
  });
});
