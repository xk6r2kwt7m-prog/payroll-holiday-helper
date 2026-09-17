import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, CheckCircle2, KeyRound, Loader2, LogIn, ShieldCheck } from "lucide-react";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-invitation`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

interface InviteInfo {
  email: string;
  company_name: string;
  first_name: string;
  full_name: string;
}

/**
 * Personal invitation link for a staff member joining an existing team.
 *
 * Deliberately never shows company setup: accepting the invitation grants access
 * to the inviting company only and then asks for the basics we need
 * (identity + address, right to work, bank details).
 */
export default function JoinTeam() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState<null | "no_form" | "sign_in">(null);
  const [usedEmail, setUsedEmail] = useState("");
  const [recovering, setRecovering] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${FUNCTION_URL}?token=${encodeURIComponent(token)}`, {
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
      });
      const json = await res.json();
      if (!res.ok) {
        setUsedEmail(json?.error === "already_used" ? json?.email || "" : "");
        setError(json?.message || "This invitation link could not be opened.");
      }
      else setInfo(json);
    } catch {
      setError("We could not open your invitation. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const recoverAccess = async () => {
    if (!usedEmail) return;
    setRecovering(true);
    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(usedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setRecovering(false);
    if (recoveryError) {
      setError("We could not send a recovery email. Please ask your manager to send one from your staff record.");
      return;
    }
    setDone("sign_in");
  };

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    setError(null);
    if (password.length < 8) return setError("Please choose a password of at least 8 characters.");
    if (password !== confirm) return setError("The two passwords do not match.");
    setBusy(true);
    try {
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.message || "We could not set up your access.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: json.email,
        password,
      });

      if (signInError) {
        // Existing account keeping its old password — access is granted, they just sign in.
        setDone("sign_in");
        return;
      }

      if (json.details_token) {
        navigate(`/my-details/${json.details_token}`, { replace: true });
      } else {
        setDone("no_form");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center space-y-3">
          <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
          <h1 className="text-lg font-semibold text-card-foreground">We can't open this link</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          {usedEmail && (
            <div className="space-y-2 pt-2">
              <Button className="w-full gap-2" onClick={recoverAccess} disabled={recovering}>
                {recovering ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Send password recovery
              </Button>
              <Button variant="outline" className="w-full gap-2" onClick={() => navigate(`/auth?email=${encodeURIComponent(usedEmail)}`, { replace: true })}>
                <LogIn className="h-4 w-4" />
                Go to sign in
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center space-y-3">
          <CheckCircle2 className="h-8 w-8 mx-auto text-success" />
          <h1 className="text-lg font-semibold text-card-foreground">You're all set</h1>
          <p className="text-sm text-muted-foreground">
            {done === "sign_in"
              ? "Check your inbox for a secure link to choose a password, then sign in."
              : "Your manager will let you know when there is anything else to do."}
          </p>
          {done === "sign_in" && (
            <Button className="w-full" onClick={() => navigate("/auth", { replace: true })}>
              Go to sign in
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-5">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            {info?.first_name ? `Welcome, ${info.first_name}` : "Welcome"}
          </h1>
          <p className="text-sm text-muted-foreground">
            You've been invited to join {info?.company_name}. Choose a password to get started.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="space-y-1">
            <Label>Your email</Label>
            <Input value={info?.email ?? ""} readOnly disabled />
          </div>
          <div className="space-y-1">
            <Label htmlFor="join-password">Choose a password</Label>
            <Input
              id="join-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="join-confirm">Repeat password</Label>
            <Input
              id="join-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button className="w-full" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {busy ? "Setting up…" : "Continue"}
          </Button>

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            Next we'll ask for a few basics only: your name and address, your right to work in the UK,
            and your bank details for pay.
          </p>
        </div>
      </div>
    </div>
  );
}
