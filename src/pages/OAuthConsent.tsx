import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Beta helper: supabase.auth.oauth may not be typed on all versions.
type OAuthDetails = {
  client?: { name?: string; redirect_uri?: string };
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const oauth = (supabase.auth as any).oauth as {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
};

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id in the URL.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      if (!oauth || typeof oauth.getAuthorizationDetails !== "function") {
        setError(
          "This Supabase client does not expose the OAuth authorization helpers. Update @supabase/supabase-js.",
        );
        return;
      }
      const { data, error: err } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (err) return setError(err.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error: err } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>
            {details?.client?.name
              ? `Connect ${details.client.name} to UglyOps`
              : "Authorize access to UglyOps"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {!details && !error && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading authorization request…
            </div>
          )}
          {details && (
            <>
              <p className="text-sm">
                <strong>{details.client?.name ?? "The connecting app"}</strong> will be able to call
                UglyOps tools while you are signed in.
              </p>
              <ul className="text-sm list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Acts as your user, restricted by your tenant, branch, and role.</li>
                <li>Does not bypass row-level security or role permissions.</li>
                <li>You can revoke access anytime from Settings.</li>
              </ul>
              {details.scope && (
                <p className="text-xs text-muted-foreground">
                  Requested scope: <code>{details.scope}</code>
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <Button onClick={() => decide(true)} disabled={busy} className="flex-1">
                  Approve
                </Button>
                <Button
                  onClick={() => decide(false)}
                  disabled={busy}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
