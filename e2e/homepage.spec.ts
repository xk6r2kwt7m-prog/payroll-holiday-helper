import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads without errors", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(400);
  });

  test("has correct page title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/UGLŌ/i);
  });
});
