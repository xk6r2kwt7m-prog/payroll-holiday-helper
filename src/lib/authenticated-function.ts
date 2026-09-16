import { supabase } from "@/integrations/supabase/client";

type FunctionResult<T> = {
  data: T;
  response: Response;
};

async function readError(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status})`;
  const body = await response.clone().json().catch(() => null) as { error?: unknown; message?: unknown } | null;
  if (typeof body?.error === "string" && body.error.trim()) return body.error;
  if (typeof body?.message === "string" && body.message.trim()) return body.message;
  return fallback;
}

/**
 * Returns a current access token, refreshing it before use when it is close to expiry.
 * Contract delivery and protected document downloads use this single path so auth
 * behaviour cannot drift between buttons as new workflow rules are introduced.
 */
export async function getFreshAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const expiresSoon = !data.session.expires_at || data.session.expires_at * 1000 <= Date.now() + 60_000;
  if (!expiresSoon) return data.session.access_token;

  const refreshed = await supabase.auth.refreshSession();
  if (refreshed.error || !refreshed.data.session) {
    throw new Error("Your session has expired. Please sign in again.");
  }
  return refreshed.data.session.access_token;
}

export async function invokeAuthenticatedFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<FunctionResult<T>> {
  const accessToken = await getFreshAccessToken();
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const response = await fetch(`${baseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: publishableKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(await readError(response));
  const data = await response.json() as T;
  return { data, response };
}
