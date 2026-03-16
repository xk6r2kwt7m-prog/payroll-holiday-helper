import { test, expect } from "@playwright/test";

test.describe("Protected pages", () => {
  /**
   * When authenticated (E2E credentials set): pages should render
   * meaningful content, not redirect back to /auth.
   *
   * When unauthenticated: the app's route guard should redirect to /auth.
   * Both outcomes are valid depending on env setup.
   */

  test("/employees — shows content or redirects to /auth", async ({ page }) => {
    await page.goto("/employees");
    const url = page.url();

    if (url.includes("/auth")) {
      // Unauthenticated — redirect is correct behaviour
      await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    } else {
      // Authenticated — verify employee-related content is present
      await expect(
        page.getByRole("heading").or(page.locator("table")).first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("/schedule — shows content or redirects to /auth", async ({ page }) => {
    await page.goto("/schedule");
    const url = page.url();

    if (url.includes("/auth")) {
      await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    } else {
      await expect(
        page.getByRole("heading").or(page.locator("[data-testid]")).first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("/payroll — shows content or redirects to /auth", async ({ page }) => {
    await page.goto("/payroll");
    const url = page.url();

    if (url.includes("/auth")) {
      await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    } else {
      await expect(
        page.getByRole("heading").or(page.locator("table")).first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });
});
