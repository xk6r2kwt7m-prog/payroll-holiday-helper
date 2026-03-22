/**
 * Single source of truth for the public-facing app URL origin.
 *
 * Staff-facing links (invite emails, contract signing, rota notifications,
 * auth redirects) MUST use this function — never raw `window.location.origin`.
 *
 * The canonical domain is defined once here.  If it cannot be resolved the
 * function logs a clear error and returns a safe fallback so no Lovable
 * preview / editor URL ever leaks to end-users.
 */

const PRODUCTION_APP_URL = "https://udp.lovable.app";

/** Domains that must never appear in staff-facing links. */
const BLOCKED_PATTERNS = [
  /id-preview--/i,
  /\.lovableusercontent\./i,
  /localhost/i,
  /127\.0\.0\.1/i,
];

export function getCanonicalOrigin(): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : PRODUCTION_APP_URL;

  // If the current origin matches any blocked pattern, return production URL
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(origin)) {
      console.warn(
        `[getCanonicalOrigin] Blocked origin "${origin}" — using production URL "${PRODUCTION_APP_URL}"`
      );
      return PRODUCTION_APP_URL;
    }
  }

  return origin;
}
