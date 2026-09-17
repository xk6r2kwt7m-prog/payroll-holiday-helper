import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, CheckCircle2, Clock, KeyRound, Loader2, LogIn, ShieldCheck } from "lucide-react";

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
 * No password and no sign-in: the link takes them straight into a short guided
 * form asking only for the basics (name + address, right to work, bank details).
 * App access is granted later by a manager from the staff record.
 */
export default function JoinTeam() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
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
    setError("We have emailed you a link to choose a password. Please check your inbox.");
  };

  useEffect(() => { load(); }, [load]);

  const start = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.message || "We could not open your form.");
        return;
      }
      if (json.details_token) {
        navigate(`/my-details/${json.details_token}`, { replace: true });
      } else {
        setDone(true);
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
            Your manager will let you know when there is anything else to do.
          </p>
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
            {info?.company_name ?? "Your team"} needs a few details before you start.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <ul className="space-y-2 text-sm text-foreground">
            <li className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Your name, date of birth and home address</li>
            <li className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> A photo of your right to work document</li>
            <li className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Your bank details, so you can be paid</li>
          </ul>

          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            About 3 minutes. One or two questions at a time, and you can check everything before you send it.
          </p>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button className="w-full" size="lg" onClick={start} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {busy ? "Opening…" : "Start"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            No password needed. Your information is stored securely and only used for your employment record.
          </p>
        </div>
      </div>
    </div>
  );
}

