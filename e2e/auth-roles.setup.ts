/**
 * Per-role authentication setup.
 *
 * Creates storageState files for each role whose credentials are
 * provided via environment variables. Runs once before the main
 * test projects, alongside the primary auth.setup.ts.
 *
 * Env vars (all optional):
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
 *   E2E_MANAGER_EMAIL / E2E_MANAGER_PASSWORD
 *   E2E_SUPERVISOR_EMAIL / E2E_SUPERVISOR_PASSWORD
 *   E2E_STAFF_EMAIL / E2E_STAFF_PASSWORD
 */
import { test as setup, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import {
  getRoleCredentials,
  roleAuthFile,
  type TestRole,
} from "./helpers";

const authDir = path.join(__dirname, ".auth");
const ROLES: TestRole[] = ["admin", "manager", "supervisor", "staff"];

for (const role of ROLES) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    fs.mkdirSync(authDir, { recursive: true });

    const creds = getRoleCredentials(role);
    const stateFile = roleAuthFile(role);

    if (!creds) {
      // Write empty state so tests can skip gracefully
      fs.writeFileSync(stateFile, JSON.stringify({ cookies: [], origins: [] }));
      setup.skip();
      return;
    }

    await page.goto("/auth", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder(/email/i).fill(creds.email);
    await page.getByPlaceholder(/password/i).fill(creds.password);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).not.toHaveURL(/\/auth/, { timeout: 15_000 });
    await page.context().storageState({ path: stateFile });
  });
}
