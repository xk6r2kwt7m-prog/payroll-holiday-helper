import { test, expect } from "@playwright/test";

test.describe("Protected pages", () => {
  test("/employees — shows employee content or redirects to /auth", async ({ page }) => {
    await page.goto("/employees");
    const url = page.url();

    if (url.includes("/auth")) {
      await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    } else {
      // Verify employee-specific content
      await expect(
        page.getByRole("heading", { name: /employee/i })
          .or(page.getByRole("columnheader", { name: /name|employee|department/i }))
          .or(page.getByTestId("employees-page"))
          .first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("/schedule — shows schedule content or redirects to /auth", async ({ page }) => {
    await page.goto("/schedule");
    const url = page.url();

    if (url.includes("/auth")) {
      await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    } else {
      // Verify schedule-specific content
      await expect(
        page.getByRole("heading", { name: /schedule|rota|shift/i })
          .or(page.getByRole("grid"))
          .or(page.getByTestId("schedule-page"))
          .first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("/payroll — shows payroll content or redirects to /auth", async ({ page }) => {
    await page.goto("/payroll");
    const url = page.url();

    if (url.includes("/auth")) {
      await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    } else {
      // Verify payroll-specific content
      await expect(
        page.getByRole("heading", { name: /payroll|pay run|salary/i })
          .or(page.getByRole("columnheader", { name: /amount|gross|net|employee/i }))
          .or(page.getByTestId("payroll-page"))
          .first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });
});
