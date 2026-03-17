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
import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import {
  ChevronDown, MailCheck, Building2, Globe, Banknote, GraduationCap,
  ShieldCheck, Activity,
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

const trustStrip = [
  { icon: Building2, label: "Built for hospitality teams" },
  { icon: Globe, label: "Multi-site ready" },
  { icon: Banknote, label: "UK payroll workflows" },
  { icon: GraduationCap, label: "Training & compliance built in" },
  { icon: ShieldCheck, label: "Tenant-isolated data" },
  { icon: Activity, label: "Operational intelligence" },
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

  const scrollToPlatform = () => {
    document.getElementById("platform-overview")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToDemo = () => {
    setMode("signup");
    setErrors({});
    document.getElementById("auth-panel")?.scrollIntoView({ behavior: "smooth" });
  };

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
                  <span className="text-2xl font-bold text-foreground tracking-tight">UGLŌ</span>
                  <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase">Workforce Operations Platform</p>
                </div>
              </div>

              <h1 className="text-3xl xl:text-4xl font-bold text-foreground leading-[1.15] mb-5">
                When staffing, training and compliance are disconnected,{" "}
                <span className="text-primary">hospitality managers lose control.</span>
              </h1>
              <p className="text-muted-foreground mb-8 max-w-md leading-relaxed text-[15px]">
                Rotas, payroll, training, compliance and operational follow-through — connected in one system built for restaurants, kitchens and multi-site teams.
              </p>

              <div className="flex items-center gap-3 mb-10">
                <Button className="gradient-primary hover:shadow-md hover:brightness-110 active:scale-[0.98] transition-all duration-150" onClick={scrollToDemo}>Book a demo</Button>
                <Button variant="outline" className="hover:shadow-sm active:scale-[0.98] transition-all duration-150" onClick={scrollToPlatform}>See the platform</Button>
              </div>

              {/* Trust strip */}
              <div className="grid grid-cols-2 gap-2.5">
                {trustStrip.map((t, i) => (
                  <motion.div
                    key={t.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    className="flex items-center gap-2.5 rounded-xl bg-card/70 backdrop-blur-sm border border-border/50 px-3 py-2.5"
                  >
                    <div className="rounded-lg bg-primary/10 p-1.5 text-primary shrink-0">
                      <t.icon className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground leading-tight">{t.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <p className="mt-12 text-xs text-muted-foreground/60">
              © {new Date().getFullYear()} UGLŌ · Hospitality Workforce Operations Platform
            </p>
          </div>
        </div>

        {/* Right login/signup panel */}
        <div id="auth-panel" className="flex-1 flex flex-col items-center justify-center p-6">
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

                  <h2 className="text-xl font-semibold text-card-foreground text-center mb-1">
                    {mode === "login" ? "Welcome Back" : "Get Started"}
                  </h2>
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
                  <p className="mt-3 text-[11px] text-muted-foreground/70 text-center leading-relaxed">
                    Want a walkthrough of the platform? Create an account or contact us to arrange a demo.
                  </p>
                </>
              )}
            </div>

            {/* Mobile trust strip */}
            <div className="mt-6 grid grid-cols-3 gap-2 lg:hidden">
              {trustStrip.slice(0, 3).map((t) => (
                <div
                  key={t.label}
                  className="flex flex-col items-center gap-1.5 rounded-xl bg-card/60 border border-border/30 p-2.5 text-center"
                >
                  <t.icon className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-medium text-muted-foreground leading-tight">{t.label}</span>
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

      {/* ═══════ Content below the fold ═══════ */}
      <div className="border-t border-border">

        {/* Mobile hero headline — h2 since the single H1 lives in the desktop panel (always in DOM) */}
        <section className="lg:hidden max-w-3xl mx-auto px-5 sm:px-6 pt-10 pb-2">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight text-center">
            When staffing, training and compliance are disconnected,{" "}
            <span className="text-primary">managers lose control.</span>
          </h2>
          <p className="text-[13px] text-muted-foreground mt-3 text-center leading-relaxed max-w-sm mx-auto">
            Rotas, payroll, training, compliance and follow-through — connected in one hospitality system.
          </p>
          <div className="flex items-center justify-center gap-3 mt-5">
             <Button className="gradient-primary hover:shadow-md hover:brightness-110 active:scale-[0.98] transition-all duration-150" size="sm" onClick={scrollToDemo}>Book a demo</Button>
             <Button variant="outline" size="sm" className="hover:shadow-sm active:scale-[0.98] transition-all duration-150" onClick={scrollToPlatform}>See the platform</Button>
          </div>
        </section>

        <ScrollReveal>
        <section className="max-w-3xl mx-auto px-5 sm:px-6 py-10 sm:py-14">
          <h2 className="text-lg sm:text-xl font-bold text-foreground leading-snug max-w-xl mx-auto text-center mb-6">
            The problem is not effort. It is fragmentation.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              "Someone is on next week's rota — but still has overdue training.",
              "A document expires — and nobody catches it in time.",
              "A service issue gets logged — but follow-up disappears.",
              "Payroll closes — but managers already lost hours chasing information.",
            ].map((line) => (
              <div key={line} className="group rounded-xl border border-border bg-card/60 px-4 py-3 hover:border-primary/30 hover:bg-card hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
                <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors duration-200">{line}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-foreground font-semibold mt-5 text-center">
            The real leak is not a lack of software. It is a lack of connected control.
          </p>
        </section>
        </ScrollReveal>

        <ScrollReveal>
        <section className="bg-card/50 border-y border-border">
          <div className="max-w-3xl mx-auto px-5 sm:px-6 py-10 sm:py-14">
            <h2 className="text-lg sm:text-xl font-bold text-foreground text-center mb-5">
              This is not an HR problem. It is an operations control problem.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed text-center max-w-lg mx-auto mb-5">
              Records, rotas and payroll matter — but they are only part of the job. Hospitality managers also need to know:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
              {[
                "Who is actually ready to work",
                "What training is overdue",
                "Where compliance risk is building",
                "What standards are slipping",
                "What still needs follow-through",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-foreground font-semibold mt-6 text-center">UGLŌ is built around that reality.</p>
          </div>
        </section>
        </ScrollReveal>

        <ScrollReveal>
        <section className="max-w-3xl mx-auto px-5 sm:px-6 py-10 sm:py-14">
          <h2 className="text-lg sm:text-xl font-bold text-foreground text-center mb-3">
            One system for the work behind the shift
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed text-center max-w-lg mx-auto mb-6">
            Workforce management, training, compliance and follow-through — connected so managers stop chasing and start controlling.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { from: "Chasing information", to: "Seeing what matters" },
              { from: "Reacting late", to: "Acting earlier" },
              { from: "Managing headcount", to: "Managing readiness" },
              { from: "Recording work", to: "Following through" },
            ].map((item) => (
              <div key={item.from} className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <span className="text-xs text-muted-foreground/70 line-through group-hover:text-muted-foreground/40 transition-colors duration-200">{item.from}</span>
                <span className="text-primary font-bold text-sm group-hover:scale-110 transition-transform duration-200">→</span>
                <span className="text-xs text-foreground font-semibold group-hover:text-primary transition-colors duration-200">{item.to}</span>
              </div>
            ))}
          </div>
        </section>
        </ScrollReveal>

        <ScrollReveal>
        <section id="platform-overview" className="bg-card/50 border-y border-border scroll-mt-4">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 py-10 sm:py-14">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">What UGLŌ helps you control</h2>
              <p className="text-[13px] text-muted-foreground mt-1.5">Six connected modules. One hospitality platform.</p>
            </div>
            <ValueCards />
          </div>
        </section>
        </ScrollReveal>
        <ScrollReveal>
        <section className="max-w-3xl mx-auto px-5 sm:px-6 py-10 sm:py-14">
          <h2 className="text-lg sm:text-xl font-bold text-foreground text-center mb-5">
            Why generic HR and rota tools fall short
          </h2>
          <EmployerConversion />
        </section>
        </ScrollReveal>

        <ScrollReveal>
        <section className="bg-card/50 border-y border-border">
          <div className="max-w-3xl mx-auto px-5 sm:px-6 py-10 sm:py-14">
            <h2 className="text-lg sm:text-xl font-bold text-foreground text-center mb-1.5">
              What improves when managers have better control
            </h2>
            <p className="text-[13px] text-muted-foreground text-center mb-6">
              Better visibility helps. Better follow-through is where the value sits.
            </p>
            <CandidateConversion />
          </div>
        </section>
        </ScrollReveal>

        <ScrollReveal>
        <section className="max-w-4xl mx-auto px-5 sm:px-6 py-10 sm:py-14">
          <h2 className="text-lg sm:text-xl font-bold text-foreground text-center mb-5">
            Problems hospitality managers recognise immediately
          </h2>
          <SecuritySection />
        </section>
        </ScrollReveal>
        </section>

        <ScrollReveal>
        <section className="bg-primary/[0.04] border-y border-border">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 py-10 sm:py-14">
            <PricingSection onBookDemo={scrollToDemo} onSeePlatform={scrollToPlatform} />
          </div>
        </section>
        </ScrollReveal>

        <ScrollReveal>
        <section className="max-w-3xl mx-auto px-5 sm:px-6 py-10 sm:py-14">
          <div className="text-center mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-foreground">Common questions</h2>
            <p className="text-[13px] text-muted-foreground mt-1">Straight answers for hospitality operators.</p>
          </div>
          <FAQ />
        </section>
        </ScrollReveal>
        </section>

        {/* Footer */}
        <footer className="border-t border-border bg-card">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <img src={ugloIcon} alt="UGLŌ" className="h-6 w-6 rounded-lg" />
                <span className="text-sm font-semibold text-foreground">UGLŌ</span>
                <span className="text-xs text-muted-foreground">· Hospitality Workforce Operations Platform</span>
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
