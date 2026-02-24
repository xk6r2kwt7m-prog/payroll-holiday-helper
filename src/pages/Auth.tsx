import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Clock,
  Users,
  ShieldCheck,
  ChartBar,
  FileText,
} from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { user, signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const result = loginSchema.safeParse({ email, password });
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach((err) => {
          if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
        setLoading(false);
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
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left branding panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary/[0.06]">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/10" />
        <div className="absolute bottom-12 -right-16 w-56 h-56 rounded-full bg-accent/10" />

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 w-full">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Logo */}
            <div className="flex items-center gap-3 mb-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
                <span className="text-primary-foreground font-black text-xl tracking-tighter">U</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                  UGLŌ
                </h1>
                <p className="text-sm text-muted-foreground font-medium">
                  Hospitality People Platform
                </p>
              </div>
            </div>

            {/* Tagline */}
            <h2 className="text-3xl xl:text-4xl font-bold text-foreground leading-tight mb-3">
              Staff management,<br />
              <span className="text-primary">beautifully simple.</span>
            </h2>
            <p className="text-muted-foreground mb-10 max-w-md">
              Rotas, payroll, holidays & compliance — the all-in-one platform built for hospitality teams.
            </p>

            {/* Feature grid */}
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
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {f.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                      {f.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Footer */}
          <p className="mt-12 text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} UGLŌ · Hospitality People Platform
          </p>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="rounded-2xl bg-card shadow-elevated border border-border/40 p-8">
            {/* Mobile logo */}
            <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                <span className="text-primary-foreground font-black text-lg tracking-tighter">U</span>
              </div>
              <span className="text-2xl font-bold text-card-foreground">
                UGLŌ
              </span>
            </div>

            <h1 className="text-xl font-semibold text-card-foreground text-center mb-1">
              Welcome Back
            </h1>
            <p className="text-muted-foreground text-center text-sm mb-6">
              Sign in to your account
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
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
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full gradient-primary"
                disabled={loading}
              >
                {loading ? "Please wait..." : "Sign In"}
              </Button>
            </form>

            <p className="mt-6 text-xs text-muted-foreground text-center">
              Access is restricted to authorised personnel only.
            </p>
          </div>

          {/* Mobile feature hints */}
          <div className="mt-6 grid grid-cols-3 gap-3 lg:hidden">
            {features.slice(0, 3).map((f) => (
              <div
                key={f.label}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-card/60 border border-border/30 p-3 text-center"
              >
                <f.icon className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-medium text-muted-foreground leading-tight">
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
