import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  CalendarDays, Clock, Users, ShieldCheck, ChartBar, FileText, ChevronDown,
  MailCheck,
} from "lucide-react";
import ugloIcon from "@/assets/uglo-icon.png";
import { FAQ } from "@/components/marketing/FAQ";
import { ValueCards } from "@/components/marketing/ValueCards";
import { SecuritySection } from "@/components/marketing/SecuritySection";
import { PricingSection } from "@/components/marketing/PricingSection";
import { EmployerConversion, CandidateConversion } from "@/components/marketing/ConversionSections";
import { CookieSettingsButton } from "@/components/CookieConsent";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

const features = [
  { icon: Clock, label: "Rota & Scheduling", desc: "Build rotas in minutes with smart templates & compliance checks" },
  { icon: CalendarDays, label: "Holiday Management", desc: "Track entitlements, accruals & balances per leave year" },
  { icon: ChartBar, label: "Payroll Processing", desc: "Accurate UK payroll with timesheets & service charge" },
  { icon: Users, label: "Employee Records", desc: "Contracts, documents & onboarding in one place" },
  { icon: ShieldCheck, label: "Compliance", desc: "UK Working Time Regulations & audit trails built in" },
  { icon: FileText, label: "Reports & Analytics", desc: "Labour costs, schedule efficiency & payroll insights" },
];

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");
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
      result.error.errors.forEach((err) => {
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
      result.error.errors.forEach((err) => {
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
    <div className="min-h-screen bg-background">
      {/* ═══════ Hero section ═══════ */}
      <div className="flex min-h-screen">
        {/* Left branding panel — hidden on mobile */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary/[0.06]">
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/10" />
          <div className="absolute bottom-12 -right-16 w-56 h-56 rounded-full bg-accent/10" />

          <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 w-full">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              <div className="flex items-center gap-3 mb-10">
                <img src={ugloIcon} alt="UGLŌ" className="h-14 w-14 rounded-2xl shadow-lg" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground tracking-tight">UGLŌ</h1>
                  <p className="text-sm text-muted-foreground font-medium">Hospitality People Platform</p>
                </div>
              </div>

              <h2 className="text-3xl xl:text-4xl font-bold text-foreground leading-tight mb-3">
                Staff management,<br />
                <span className="text-primary">beautifully simple.</span>
              </h2>
              <p className="text-muted-foreground mb-10 max-w-md">
                Rotas, payroll, holidays & compliance — the all-in-one platform built for hospitality teams.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {features.map((f, i) => (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    className="flex items-start gap-3 rounded-xl bg-card/70 backdrop-blur-sm border border-border/50 p-3"
                  >
                    <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                      <f.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight">{f.label}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{f.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <p className="mt-12 text-xs text-muted-foreground/60">
              © {new Date().getFullYear()} UGLŌ · Hospitality People Platform
            </p>
          </div>
        </div>

        {/* Right login/signup panel */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <div className="rounded-2xl bg-card shadow-elevated border border-border/40 p-8">
              {/* Mobile logo */}
              <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
                <img src={ugloIcon} alt="UGLŌ" className="h-12 w-12 rounded-xl" />
                <span className="text-2xl font-bold text-card-foreground">UGLŌ</span>
              </div>

              {signupComplete ? (
                /* ── Post-signup confirmation ── */
                <div className="text-center space-y-4 py-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mx-auto">
                    <MailCheck className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-card-foreground">Check your email</h2>
                    <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto">
                      We've sent a verification link to{" "}
                      <span className="font-medium text-foreground">{signupEmail}</span>.
                      Click the link to activate your account.
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 border border-border p-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Didn't receive it? Check your spam folder or wait a minute, then try signing up again.
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
                      Sign In
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
                      Create Account
                    </button>
                  </div>

                  <h1 className="text-xl font-semibold text-card-foreground text-center mb-1">
                    {mode === "login" ? "Welcome Back" : "Get Started"}
                  </h1>
                  <p className="text-muted-foreground text-center text-sm mb-6">
                    {mode === "login"
                      ? "Sign in to your account"
                      : "Create your account, then set up your company"}
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === "signup" && (
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
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
                      {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
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
                            redirectTo: `${window.location.origin}/reset-password`,
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

                  <p className="mt-4 text-xs text-muted-foreground text-center">
                    {mode === "login"
                      ? "Don't have an account? Switch to Create Account above."
                      : "Already have an account? Switch to Sign In above."}
                  </p>
                </>
              )}
            </div>

            {/* Mobile feature hints */}
            <div className="mt-6 grid grid-cols-3 gap-3 lg:hidden">
              {features.slice(0, 3).map((f) => (
                <div
                  key={f.label}
                  className="flex flex-col items-center gap-1.5 rounded-xl bg-card/60 border border-border/30 p-3 text-center"
                >
                  <f.icon className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-medium text-muted-foreground leading-tight">{f.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Scroll hint on mobile */}
          <div className="mt-8 flex flex-col items-center gap-1 text-muted-foreground/50 lg:hidden">
            <span className="text-[10px]">Learn more</span>
            <ChevronDown className="h-4 w-4 animate-bounce" />
          </div>
        </div>
      </div>

      {/* ═══════ Trust content below the fold ═══════ */}
      <div className="border-t border-border">
        {/* Why choose us */}
        <section className="max-w-6xl mx-auto px-5 sm:px-6 py-12 sm:py-20">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-lg sm:text-2xl font-bold text-foreground">Why choose UGLŌ?</h2>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
              Designed around how hospitality teams actually work.
            </p>
          </div>
          <ValueCards />
        </section>

        {/* Employer + Candidate conversion */}
        <section className="bg-card/50 border-y border-border">
          <div className="max-w-5xl mx-auto px-5 sm:px-6 py-12 sm:py-20">
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-lg sm:text-2xl font-bold text-foreground">Who it's for</h2>
              <p className="text-sm text-muted-foreground mt-1.5">One platform, two perspectives.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <EmployerConversion />
              <CandidateConversion />
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="max-w-6xl mx-auto px-5 sm:px-6 py-12 sm:py-20">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-lg sm:text-2xl font-bold text-foreground">Pricing</h2>
            <p className="text-sm text-muted-foreground mt-1.5">Transparent and designed to grow with your team.</p>
          </div>
          <PricingSection />
        </section>

        {/* Security */}
        <section className="bg-card/50 border-y border-border">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 py-12 sm:py-20">
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-lg sm:text-2xl font-bold text-foreground">Security & privacy</h2>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
                Data separation, role-based access, and audit visibility — included from the start.
              </p>
            </div>
            <SecuritySection />
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-5 sm:px-6 py-12 sm:py-20">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-lg sm:text-2xl font-bold text-foreground">Frequently asked questions</h2>
            <p className="text-sm text-muted-foreground mt-1.5">Common questions from operators and candidates.</p>
          </div>
          <FAQ />
        </section>

        {/* Footer */}
        <footer className="border-t border-border bg-card">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <img src={ugloIcon} alt="UGLŌ" className="h-6 w-6 rounded-lg" />
                <span className="text-sm font-semibold text-foreground">UGLŌ</span>
                <span className="text-xs text-muted-foreground">· Hospitality People Platform</span>
              </div>
              <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <Link to="/privacy" className="hover:text-foreground transition-colors py-1">Privacy</Link>
                <Link to="/terms" className="hover:text-foreground transition-colors py-1">Terms</Link>
                <Link to="/cookies" className="hover:text-foreground transition-colors py-1">Cookies</Link>
                <CookieSettingsButton />
              </nav>
            </div>
            <p className="text-[10px] text-muted-foreground/50 text-center mt-5">
              © {new Date().getFullYear()} UGLŌ. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Auth;
