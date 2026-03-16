/**
 * Playwright authentication setup.
 *
 * Reads credentials from environment variables (loaded via .env.test):
 *   - E2E_USER_EMAIL
 *   - E2E_USER_PASSWORD
 *
 * When credentials are present, this project logs in and saves
 * storageState so all downstream browser projects reuse the session.
 *
 * When credentials are missing, the auth file is written as an empty
 * state so Playwright doesn't error — protected-route tests will then
 * assert the redirect to /auth instead.
 *
 * ── Local setup ──────────────────────────────────────────────
 * 1. npx playwright install            # download browser binaries
 * 2. cp .env.test.example .env.test    # add real credentials
 * 3. npm run test:e2e                  # run all suites
 *
 * Required env vars:
 *   BASE_URL             (optional, defaults to http://localhost:5173)
 *   E2E_USER_EMAIL       (required for authenticated tests)
 *   E2E_USER_PASSWORD    (required for authenticated tests)
 * ─────────────────────────────────────────────────────────────
 */

import { test as setup, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const authDir = path.join(__dirname, ".auth");
const authFile = path.join(authDir, "user.json");

setup("authenticate", async ({ page }) => {
  // Ensure .auth directory exists
  fs.mkdirSync(authDir, { recursive: true });

  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    console.warn(
      "⚠️  E2E_USER_EMAIL / E2E_USER_PASSWORD not set.\n" +
        "   Writing empty storageState — protected tests will assert redirect to /auth."
    );
    // Write empty but valid storageState so downstream projects don't crash
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  await page.goto("/auth");

  // Fill login form
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for successful redirect away from /auth (max 15s for slow envs)
  await expect(page).not.toHaveURL(/\/auth/, { timeout: 15_000 });

  // Persist authenticated state for reuse
  await page.context().storageState({ path: authFile });
});
