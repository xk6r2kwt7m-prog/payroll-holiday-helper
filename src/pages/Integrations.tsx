import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, FileSpreadsheet, ShoppingCart, Calculator, PenTool,
  Shield, Lock, Eye, CheckCircle2, Clock, Layers, MessageSquare,
  BarChart3, Users, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ugloIcon from "@/assets/uglo-icon.png";

const fade = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };

const WHY_POINTS = [
  { icon: Layers, title: "Reduce duplicate work", desc: "Stop copying data between systems. Let information flow where it's needed." },
  { icon: BarChart3, title: "Improve reporting accuracy", desc: "Consistent data across tools means fewer discrepancies in labour cost and compliance reports." },
  { icon: Clock, title: "Save management time", desc: "Less manual entry means managers spend more time on operations, not admin." },
  { icon: Zap, title: "Support better decisions", desc: "When operational data is connected, patterns and issues surface faster." },
];

const CSV_USE_CASES = [
  "Employee imports",
  "Payroll exports",
  "Rota and hours reporting",
  "Holiday balances",
  "Operational data sharing",
];

const COMING_SOON = [
  {
    icon: ShoppingCart,
    title: "POS integrations",
    benefits: [
      "Compare sales against labour cost",
      "Improve scheduling insight",
      "Reduce manual sales input",
    ],
  },
  {
    icon: Calculator,
    title: "Payroll and accounting exports",
    benefits: [
      "Cleaner finance handover",
      "Fewer manual errors",
      "More consistent period-end processing",
    ],
  },
  {
    icon: PenTool,
    title: "Contracts and e-sign tools",
    benefits: [
      "Faster onboarding",
      "Clearer audit trail",
      "Less chasing for signatures",
    ],
  },
];

const PHASES = [
  { phase: "Phase 1", label: "CSV import/export and integration framework", status: "now" },
  { phase: "Phase 2", label: "POS and payroll/accounting outputs", status: "soon" },
  { phase: "Phase 3", label: "Broader third-party ecosystem where commercially useful", status: "planned" },
];

const APPROACH = [
  "Reliability before scale",
  "Secure access controls",
  "Clear data ownership",
  "Practical hospitality use cases",
];

export default function Integrations() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/auth" className="flex items-center gap-2">
            <img src={ugloIcon} alt="UGLŌ" className="h-8 w-8 rounded-lg" />
            <span className="text-base font-semibold tracking-tight">UGLŌ</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/auth">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24">
        {/* Hero */}
        <motion.section
          className="py-16 sm:py-24 text-center space-y-4"
          initial="hidden" animate="visible" variants={fade} transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Integrations</h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Make UGLŌ work with the tools you already use.
          </p>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Connect key systems, reduce manual entry, and keep your operational data more consistent across the business.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Button asChild><a href="#available">Explore integrations</a></Button>
            <Button variant="outline" asChild><a href="#request">Request an integration</a></Button>
          </div>
        </motion.section>

        {/* Why integrations matter */}
        <motion.section
          className="space-y-8 py-12"
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fade} transition={{ duration: 0.4 }}
        >
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">Why integrations matter</h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Hospitality teams often rely on multiple systems. Connecting them reduces friction and keeps everyone working from the same information.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {WHY_POINTS.map((p) => (
              <div key={p.title} className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <p.icon className="h-[18px] w-[18px] text-primary" />
                </div>
                <h3 className="text-sm font-semibold">{p.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Available now */}
        <motion.section
          id="available"
          className="space-y-6 py-12"
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fade} transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-semibold text-center">Available now</h2>
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold">CSV import and export</h3>
                  <Badge className="bg-primary/15 text-primary border-0 text-[11px]">Available now</Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A practical way to move data in and out of UGLŌ while deeper integrations are introduced.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {CSV_USE_CASES.map((u) => (
                <span key={u} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  {u}
                </span>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Coming soon */}
        <motion.section
          className="space-y-6 py-12"
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fade} transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-semibold text-center">Coming soon</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {COMING_SOON.map((c) => (
              <div key={c.title} className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                    <c.icon className="h-5 w-5 text-accent" />
                  </div>
                  <Badge variant="outline" className="text-[11px] border-accent/40 text-accent">Coming soon</Badge>
                </div>
                <h3 className="text-sm font-semibold">{c.title}</h3>
                <ul className="space-y-1.5">
                  {c.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                      <CheckCircle2 className="h-3 w-3 mt-0.5 text-muted-foreground/60 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Our approach */}
        <motion.section
          className="space-y-6 py-12"
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fade} transition={{ duration: 0.4 }}
        >
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">Our approach</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              We build integrations around what hospitality teams actually need — not what looks good on a feature list.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {APPROACH.map((a) => (
              <div key={a} className="rounded-xl border border-border bg-card p-4 text-center">
                <p className="text-xs font-medium">{a}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Rollout phases */}
        <motion.section
          className="space-y-6 py-12"
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fade} transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-semibold text-center">Rollout phases</h2>
          <div className="space-y-3">
            {PHASES.map((p, i) => (
              <div key={p.phase} className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  p.status === "now" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {i + 1}
                </div>
                <div className="space-y-0.5 pt-0.5">
                  <p className="text-sm font-semibold">{p.phase}</p>
                  <p className="text-xs text-muted-foreground">{p.label}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Security and control */}
        <motion.section
          className="space-y-6 py-12"
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fade} transition={{ duration: 0.4 }}
        >
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">Security and control</h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Every integration respects the same standards as the rest of the platform.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Shield, title: "Role-based access", desc: "Integrations inherit the same permission model as UGLŌ. No shortcuts." },
              { icon: Lock, title: "Tenant separation", desc: "Data stays isolated per workspace. Integrations never cross tenant boundaries." },
              { icon: Eye, title: "Audit visibility", desc: "All integration activity is logged and traceable through the standard audit trail." },
            ].map((s) => (
              <div key={s.title} className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <s.icon className="h-[18px] w-[18px] text-primary" />
                </div>
                <h3 className="text-sm font-semibold">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Request an integration */}
        <motion.section
          id="request"
          className="py-12"
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fade} transition={{ duration: 0.4 }}
        >
          <div className="rounded-xl border border-border bg-card p-6 sm:p-10 text-center space-y-4">
            <div className="flex h-11 w-11 mx-auto items-center justify-center rounded-xl bg-accent/10">
              <MessageSquare className="h-5 w-5 text-accent" />
            </div>
            <h2 className="text-xl font-semibold">Request an integration</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Tell us what systems you already use. We prioritise our roadmap around real demand from hospitality operators — not assumptions.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button asChild>
                <a href="mailto:hello@uglo.uk?subject=Integration%20request">Talk to us about your setup</a>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/auth">Get started with UGLŌ <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
              </Button>
            </div>
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={ugloIcon} alt="UGLŌ" className="h-5 w-5 rounded" />
            <span>© {new Date().getFullYear()} UGLŌ</span>
          </div>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/cookies" className="hover:text-foreground transition-colors">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
