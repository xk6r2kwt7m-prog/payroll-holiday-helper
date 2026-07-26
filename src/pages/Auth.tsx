import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getCanonicalOrigin } from "@/lib/getCanonicalUrl";
import { toast } from "sonner";
import { z } from "zod";
import { motion } from "framer-motion";
import { MailCheck, CheckCircle2 } from "lucide-react";
import ugloIcon from "@/assets/uglo-icon.png";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

const CREDIBILITY = [
  "Staffing, rota, payroll, holidays, HR and compliance in one system",
  "Built for hospitality teams, not generic HR",
  "Staff access is invitation-based and fully controlled",
  "Timesheet-based payroll with full audit trails",
  "Multi-site ready from day one",
];

const Auth = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";

  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [signupComplete, setSignupComplete] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const handleLogin = async () => {
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const { error } = await signIn(email, password);
    if (error) {
      toast.error(
        error.message.includes("Invalid login credentials")
          ? "Invalid email or password"
          : error.message
      );
    } else {
      toast.success("Welcome back!");
      navigate("/");
    }
  };

  const handleSignup = async () => {
    const result = signupSchema.safeParse({ fullName, email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const { error } = await signUp(email, password, fullName);
    if (error) {
      toast.error(error.message);
    } else {
      setSignupEmail(email);
      setSignupComplete(true);
      setFullName("");
      setEmail("");
      setPassword("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      if (mode === "login") {
        await handleLogin();
      } else {
        await handleSignup();
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* ═══ LEFT PANEL — Credibility ═══ */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[48%] relative bg-primary/[0.04] border-r border-border">
        <div className="flex flex-col justify-center px-12 xl:px-16 w-full max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
            <Link to="/landing" className="flex items-center gap-2.5 mb-12">
              <img src={ugloIcon} alt="UglyOps" className="h-10 w-10 rounded-xl shadow-sm" />
              <span className="text-xl font-bold text-foreground tracking-tight">UglyOps</span>
            </Link>

            <h2 className="text-xl xl:text-2xl font-bold text-foreground leading-snug mb-3">
              Workforce operations for hospitality teams
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              One system for staffing, rota, payroll, holidays, HR and compliance. Built for managers who need control, not complexity.
            </p>

            <div className="space-y-3">
              {CREDIBILITY.map((item) => (
                <div key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground/80 leading-relaxed">{item}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-lg border border-border bg-card/60 px-4 py-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Start with timesheet uploads and move to full operational control as you scale.
              </p>
            </div>
          </motion.div>

          <p className="mt-auto pt-8 pb-6 text-[11px] text-muted-foreground/50">
            © {new Date().getFullYear()} UglyOps
          </p>
        </div>
      </div>

      {/* ═══ RIGHT PANEL — Auth form ═══ */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2.5 mb-8 lg:hidden">
            <Link to="/landing" className="flex items-center gap-2.5">
              <img src={ugloIcon} alt="UglyOps" className="h-10 w-10 rounded-xl" />
              <span className="text-xl font-bold text-foreground">UglyOps</span>
            </Link>
          </div>

          <div className="rounded-2xl bg-card shadow-elevated border border-border/40 p-7 sm:p-8">
            {signupComplete ? (
              <div className="text-center space-y-4 py-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mx-auto">
                  <MailCheck className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-card-foreground">Check your email</h2>
                  <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto">
                    We sent a verification link to{" "}
                    <span className="font-medium text-foreground">{signupEmail}</span>.
                    Click the link to activate your account.
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 border border-border p-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Did not receive it? Check your spam folder or wait a minute, then try again.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setSignupComplete(false);
                    setMode("login");
                  }}
                >
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <>
                {/* Mode tabs */}
                <div className="flex rounded-lg bg-muted p-1 mb-6">
                  <button
                    type="button"
                    onClick={() => { setMode("login"); setErrors({}); }}
                    className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${
                      mode === "login"
                        ? "bg-card text-card-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode("signup"); setErrors({}); }}
                    className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${
                      mode === "signup"
                        ? "bg-card text-card-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Create account
                  </button>
                </div>

                <h2 className="text-xl font-semibold text-card-foreground text-center mb-1">
                  {mode === "login" ? "Welcome back" : "Set up your account"}
                </h2>
                <p className="text-muted-foreground text-center text-sm mb-6">
                  {mode === "login"
                    ? "Sign in to access your workspace"
                    : "Create your account to get started. Staff accounts are set up by invitation."}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === "signup" && (
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full name</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Jane Smith"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={errors.fullName ? "border-destructive" : ""}
                      />
                      {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={errors.password ? "border-destructive" : ""}
                    />
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>

                  <Button type="submit" className="w-full gradient-primary" disabled={loading}>
                    {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
                  </Button>
                </form>

                {mode === "login" && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email) {
                        toast.error("Please enter your email address first");
                        return;
                      }
                      try {
                        const { error } = await supabase.auth.resetPasswordForEmail(email, {
                          redirectTo: `${getCanonicalOrigin()}/reset-password`,
                        });
                        if (error) throw error;
                        toast.success("Password reset email sent. Check your inbox.");
                      } catch (err: any) {
                        toast.error(err.message || "Failed to send reset email");
                      }
                    }}
                    className="mt-3 w-full text-center text-sm text-primary hover:underline"
                  >
                    Forgot your password?
                  </button>
                )}

                <p className="mt-4 text-xs text-muted-foreground text-center leading-relaxed">
                  {mode === "login"
                    ? "Don't have an account? Switch to Create account above."
                    : "Already have an account? Switch to Sign in above."}
                </p>

                {mode === "signup" && (
                  <p className="mt-2 text-[11px] text-muted-foreground/60 text-center leading-relaxed">
                    Staff members receive an invitation email from their manager to set up access.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Mobile credibility strip */}
          <div className="mt-6 space-y-2 lg:hidden">
            {CREDIBILITY.slice(0, 3).map((item) => (
              <div key={item} className="flex items-start gap-2 rounded-lg bg-card/60 border border-border/30 px-3 py-2.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <span className="text-[11px] text-muted-foreground leading-tight">{item}</span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center lg:hidden">
            <Link to="/landing" className="text-xs text-primary hover:underline">
              ← Back to homepage
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
