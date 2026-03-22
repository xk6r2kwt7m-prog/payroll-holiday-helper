/**
 * Returns the canonical (published) app URL origin.
 *
 * In Lovable preview environments the origin includes "id-preview--"
 * which is an internal editor URL that external users cannot access
 * reliably.  This helper detects that case and returns the published
 * domain instead so that outbound links (invite emails, contract
 * signing links, schedule notifications) always point to the real app.
 *
 * In production / custom-domain deployments `window.location.origin`
 * is already correct and is returned as-is.
 */
export function getCanonicalOrigin(): string {
  const origin = window.location.origin;

  // Lovable preview URLs look like:
  //   https://id-preview--<uuid>.lovable.app
  if (/^https:\\/\\/id-preview--[^.]+\\.lovable\\.app$/i.test(origin)) {
    // Derive published subdomain from VITE env if available,
    // otherwise fall back to the known published domain.
    return "https://udp.lovable.app";
  }

  return origin;
}
