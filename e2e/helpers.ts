/**
 * Shared Playwright helpers for the E2E audit pack.
 *
 * - Console error / pageerror capture
 * - Safe protected-route navigation with 3-state result
 * - Assertion utilities
 */
import { type Page, expect } from "@playwright/test";

/** Attach console + pageerror listeners, return arrays to assert later. */
export function captureErrors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  return { consoleErrors, pageErrors };
}

/** Assert no captured errors (call at end of test). */
export function assertNoErrors({
  consoleErrors,
  pageErrors,
}: {
  consoleErrors: string[];
  pageErrors: string[];
}) {
  expect(pageErrors, "Uncaught page errors").toEqual([]);
  expect(consoleErrors, "Console errors").toEqual([]);
}

/**
 * Navigation result — 3 explicit states:
 *  - "auth"    → redirected to /auth (not authenticated)
 *  - "target"  → stayed on target route and meaningful content rendered
 *  - "unknown" → ambiguous state (loading stuck, unexpected redirect, etc.)
 */
export type NavState = "auth" | "target" | "unknown";
export interface NavResult {
  state: NavState;
  finalUrl: string;
}

/**
 * Navigate to a protected route and wait for the route to fully settle.
 *
 * 1. goto the path with networkidle to let redirects + data loads finish
 * 2. check final URL to classify state
 * 3. if on target, wait for meaningful DOM content before returning
 */
export async function navigateProtected(
  page: Page,
  path: string,
  /** Max time (ms) to wait for the route to settle */
  timeout = 15_000
): Promise<NavResult> {
  // Navigate and wait for network to quiet down
  await page.goto(path, { waitUntil: "networkidle", timeout });

  // Give SPA routers an extra moment to finalize redirects
  await page.waitForTimeout(1_000);

  const finalUrl = page.url();
  const url = new URL(finalUrl);

  // State 1: redirected to /auth
  if (url.pathname.includes("/auth")) {
    return { state: "auth", finalUrl };
  }

  // State 2: still on target route — verify content rendered
  const normalizedTarget = path.replace(/\/$/, "") || "/";
  const normalizedFinal = url.pathname.replace(/\/$/, "") || "/";

  if (normalizedFinal === normalizedTarget || normalizedFinal.startsWith(normalizedTarget + "/")) {
    // Wait for at least one meaningful element (not a blank white page)
    try {
      await page.locator("main, [role='main'], h1, h2, table, [data-testid]").first()
        .waitFor({ state: "visible", timeout: 10_000 });
      return { state: "target", finalUrl };
    } catch {
      // Page loaded but no meaningful content appeared
      return { state: "unknown", finalUrl };
    }
  }

  // State 3: redirected somewhere unexpected
  return { state: "unknown", finalUrl };
}

/** Generate a unique-ish name for test entities to avoid collisions. */
export function uniqueName(prefix = "E2E") {
  return `${prefix}_${Date.now().toString(36)}`;
}

/**
 * Multi-role authentication helper.
 *
 * Reads optional per-role credentials from environment variables.
 * Returns null if the role's credentials are not configured.
 */
export interface RoleCredentials {
  email: string;
  password: string;
}

const ROLE_ENV_MAP = {
  admin: { email: "E2E_ADMIN_EMAIL", password: "E2E_ADMIN_PASSWORD" },
  manager: { email: "E2E_MANAGER_EMAIL", password: "E2E_MANAGER_PASSWORD" },
  supervisor: { email: "E2E_SUPERVISOR_EMAIL", password: "E2E_SUPERVISOR_PASSWORD" },
  staff: { email: "E2E_STAFF_EMAIL", password: "E2E_STAFF_PASSWORD" },
} as const;

export type TestRole = keyof typeof ROLE_ENV_MAP;

export function getRoleCredentials(role: TestRole): RoleCredentials | null {
  const envKeys = ROLE_ENV_MAP[role];
  const email = process.env[envKeys.email];
  const password = process.env[envKeys.password];
  if (!email || !password) return null;
  return { email, password };
}

/** Check if per-role credentials are available for boundary testing. */
export function hasRoleCredentials(role: TestRole): boolean {
  return getRoleCredentials(role) !== null;
}

/**
 * Authenticate as a specific role in a fresh browser context.
 * Returns the storageState path, or null if credentials missing.
 */
export async function authenticateAsRole(
  page: Page,
  role: TestRole
): Promise<boolean> {
  const creds = getRoleCredentials(role);
  if (!creds) return false;

  await page.goto("/auth");
  await page.getByPlaceholder(/email/i).fill(creds.email);
  await page.getByPlaceholder(/password/i).fill(creds.password);
  await page.getByRole("button", { name: /sign in/i }).click();

  try {
    await page.waitForURL((url) => !url.pathname.includes("/auth"), { timeout: 15_000 });
    return true;
  } catch {
    return false;
  }
}
