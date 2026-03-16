/**
 * Shared Playwright helpers for the E2E audit pack.
 *
 * - Console error / pageerror capture
 * - Safe protected-route navigation with 3-state result
 * - Per-role authentication utilities
 * - Assertion utilities
 */
import { type Page, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

// ──────────────────────────────────────────────────────────────────
// Error capture
// ──────────────────────────────────────────────────────────────────

/** Attach console + pageerror listeners, return arrays to assert later. */
export function captureErrors(page: Page): {
  consoleErrors: string[];
  pageErrors: string[];
} {
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
}): void {
  expect(pageErrors, "Uncaught page errors").toEqual([]);
  expect(consoleErrors, "Console errors").toEqual([]);
}

// ──────────────────────────────────────────────────────────────────
// Protected-route navigation
// ──────────────────────────────────────────────────────────────────

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
 * Uses domcontentloaded (fast, reliable) plus explicit web-first
 * assertions instead of the flaky networkidle strategy.
 *
 * Classification:
 *  1. goto path with domcontentloaded
 *  2. wait for SPA router to settle (poll URL for stability)
 *  3. classify final URL:
 *     a) /auth → "auth"
 *     b) target route with visible content → "target"
 *     c) anything else → "unknown"
 */
export async function navigateProtected(
  page: Page,
  path: string,
  /** Max time (ms) to wait for route to settle */
  timeout = 15_000
): Promise<NavResult> {
  // Navigate with fast domcontentloaded — don't wait for every XHR
  await page.goto(path, { waitUntil: "domcontentloaded", timeout });

  // Wait for SPA router to finalize redirects by polling URL stability
  let previousUrl = "";
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const currentUrl = page.url();
    if (currentUrl === previousUrl) break;
    previousUrl = currentUrl;
    await page.waitForTimeout(300);
  }

  const finalUrl = page.url();
  const url = new URL(finalUrl);

  // State 1: redirected to /auth
  if (url.pathname.includes("/auth")) {
    return { state: "auth", finalUrl };
  }

  // State 2: still on target route — verify content rendered
  const normalizedTarget = path.replace(/\/$/, "") || "/";
  const normalizedFinal = url.pathname.replace(/\/$/, "") || "/";

  if (
    normalizedFinal === normalizedTarget ||
    normalizedFinal.startsWith(normalizedTarget + "/")
  ) {
    // Wait for at least one meaningful element (not a blank white page)
    try {
      await page
        .locator("main, [role='main'], h1, h2, table, [data-testid]")
        .first()
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

// ──────────────────────────────────────────────────────────────────
// Unique names
// ──────────────────────────────────────────────────────────────────

/** Generate a unique-ish name for test entities to avoid collisions. */
export function uniqueName(prefix = "E2E"): string {
  return `${prefix}_${Date.now().toString(36)}`;
}

// ──────────────────────────────────────────────────────────────────
// Multi-role authentication
// ──────────────────────────────────────────────────────────────────

export interface RoleCredentials {
  email: string;
  password: string;
}

const ROLE_ENV_MAP = {
  admin: { email: "E2E_ADMIN_EMAIL", password: "E2E_ADMIN_PASSWORD" },
  manager: { email: "E2E_MANAGER_EMAIL", password: "E2E_MANAGER_PASSWORD" },
  supervisor: {
    email: "E2E_SUPERVISOR_EMAIL",
    password: "E2E_SUPERVISOR_PASSWORD",
  },
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
 * Path to the storageState file for a specific role.
 * Stored in e2e/.auth/<role>.json alongside the primary user.json.
 */
export function roleAuthFile(role: TestRole): string {
  return path.join(__dirname, ".auth", `${role}.json`);
}

/**
 * Authenticate as a specific role and persist storageState to disk.
 *
 * If a cached storageState file already exists for this role it is reused
 * (the auth setup project creates them once per run).
 *
 * Falls back to live login if no cached file exists.
 */
export async function authenticateAsRole(
  page: Page,
  role: TestRole
): Promise<boolean> {
  const creds = getRoleCredentials(role);
  if (!creds) return false;

  const stateFile = roleAuthFile(role);

  // If cached state exists, apply it and navigate to trigger session restore
  if (fs.existsSync(stateFile)) {
    try {
      const state = JSON.parse(fs.readFileSync(stateFile, "utf-8"));
      // Only reuse if the file has actual cookies/storage
      if (state.cookies?.length > 0 || state.origins?.length > 0) {
        await page.context().addCookies(state.cookies || []);
        await page.goto("/", { waitUntil: "domcontentloaded" });
        // Verify we're actually logged in
        await page.waitForTimeout(1_000);
        if (!page.url().includes("/auth")) {
          return true;
        }
      }
    } catch {
      // Cached file corrupt — fall through to live login
    }
  }

  // Live login
  await page.goto("/auth", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder(/email/i).fill(creds.email);
  await page.getByPlaceholder(/password/i).fill(creds.password);
  await page.getByRole("button", { name: /sign in/i }).click();

  try {
    await page.waitForURL((url) => !url.pathname.includes("/auth"), {
      timeout: 15_000,
    });
    // Persist for reuse in subsequent tests this run
    const authDir = path.dirname(stateFile);
    fs.mkdirSync(authDir, { recursive: true });
    await page.context().storageState({ path: stateFile });
    return true;
  } catch {
    return false;
  }
}
