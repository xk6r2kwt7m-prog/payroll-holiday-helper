/**
 * Playwright auth setup — placeholder.
 *
 * To run authenticated tests locally:
 *   1. Copy .env.example → .env.test (never commit credentials)
 *   2. Set E2E_USER_EMAIL and E2E_USER_PASSWORD
 *
 * This file can be used as a Playwright "setup" project
 * to store authenticated state for reuse across tests.
 */

import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth", "user.json");

setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    console.warn(
      "⚠️  E2E_USER_EMAIL / E2E_USER_PASSWORD not set — skipping auth setup.\n" +
        "   Tests requiring login will be redirected to /auth."
    );
    return;
  }

  await page.goto("/auth");
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for redirect away from /auth
  await expect(page).not.toHaveURL(/\/auth/);

  await page.context().storageState({ path: authFile });
});
