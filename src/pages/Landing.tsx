import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import { FAQ } from "@/components/marketing/FAQ";
import { CookieSettingsButton } from "@/components/CookieConsent";
import ugloIcon from "@/assets/uglo-icon.png";
import {
  Users, CalendarDays, Banknote, Palmtree, ShieldCheck, ClipboardList,
  Building2, Globe, CheckCircle2, ArrowRight, ChevronDown,
} from "lucide-react";

/* ── Trust badges ── */
const TRUST_ITEMS = [
  { icon: Building2, label: "Built for hospitality teams" },
  { icon: Globe, label: "Multi-site ready" },
  { icon: Banknote, label: "Payroll workflows" },
  { icon: ShieldCheck, label: "Compliance tracking" },
  { icon: CheckCircle2, label: "UK-ready operations" },
];

/* ── Product sections ── */
const PRODUCT_SECTIONS = [
  {
    icon: Users,
    title: "Staffing & Employee Records",
    desc: "Store and manage employee records, contracts, right-to-work documents and onboarding tasks in one place. No spreadsheets, no chasing.",
  },
  {
    icon: CalendarDays,
    title: "Rota & Scheduling",
    desc: "Build rotas by role and site, manage shift swaps, and see who is available. Staff view their schedule on any device.",
  },
  {
    icon: Banknote,
    title: "Payroll",
    desc: "Upload timesheets, review hours, approve pay runs and export for processing. Currently timesheet-based — no unverified automation.",
    note: "Payroll source: manual timesheet upload",
  },
  {
    icon: Palmtree,
    title: "Holidays & Leave",
    desc: "Staff request leave, managers approve or decline, balances update automatically. Accrual rules follow UK statutory requirements.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance & Training",
    desc: "Track documents, training completion, expiry dates and right-to-work status. Surface overdue items before they become a risk.",
  },
];

/* ── Why UglyOps ── */
const WHY_ITEMS = [
  "One system instead of multiple disconnected tools",
  "Built for real hospitality operations, not just HR admin",
  "Simple onboarding — most teams are live within an hour",
  "Clear manager workflows with proper approval steps",
  "Staff access is invitation-based and fully controlled",
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* ═══ HEADER ═══ */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 flex items-center justify-between h-14 sm:h-16">
          <Link to="/auth" className="flex items-center gap-2.5">
            <img src={ugloIcon} alt="UglyOps" className="h-8 w-8 rounded-xl" />
            <span className="text-lg font-bold text-foreground tracking-tight">UglyOps</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#products" className="hover:text-foreground transition-colors">Products</a>
            <a href="#why" className="hover:text-foreground transition-colors">Solutions</a>
            <a href="#faq" className="hover:text-foreground transition-colors">Resources</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex text-muted-foreground hover:text-foreground">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button size="sm" className="gradient-primary font-semibold" asChild>
              <Link to="/auth?mode=signup">Book a demo</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ═══ HERO ═══ */}
      <section className="max-w-4xl mx-auto px-5 sm:px-6 pt-16 sm:pt-24 pb-12 sm:pb-16 text-center">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight max-w-3xl mx-auto">
          Run staffing, rota, payroll, holidays, HR and compliance in one place.
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-4 max-w-xl mx-auto leading-relaxed">
          Built for hospitality teams that need full control across people, shifts and payroll — without juggling multiple systems.
        </p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <Button size="lg" className="gradient-primary font-semibold shadow-md hover:shadow-lg hover:brightness-105 active:scale-[0.97] transition-all duration-200 h-12 px-8" asChild>
            <Link to="/auth?mode=signup">Book a demo</Link>
          </Button>
          <Button variant="outline" size="lg" className="h-12 px-6 hover:bg-muted/50 active:scale-[0.97] transition-all duration-200" asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </section>

      {/* ═══ TRANSITION MESSAGE ═══ */}
      <ScrollReveal>
        <section className="max-w-3xl mx-auto px-5 sm:px-6 pb-12 sm:pb-16 text-center">
          <div className="rounded-xl border border-primary/20 bg-primary/[0.04] px-6 py-5 inline-block">
            <p className="text-sm sm:text-[15px] text-foreground font-medium leading-relaxed">
              Start with timesheet uploads and move to full operational control as you scale.
            </p>
          </div>
        </section>
      </ScrollReveal>

      {/* ═══ TRUST STRIP ═══ */}
      <ScrollReveal>
        <section className="border-y border-border bg-card/50">
          <div className="max-w-5xl mx-auto px-5 sm:px-6 py-6 sm:py-8">
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
              {TRUST_ITEMS.map((t) => (
                <div key={t.label} className="flex items-center gap-2 rounded-lg bg-background/60 border border-border/50 px-3.5 py-2">
                  <t.icon className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ═══ PRODUCT SECTIONS ═══ */}
      <section id="products" className="scroll-mt-16">
        <div className="max-w-4xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
          <ScrollReveal>
            <div className="text-center mb-12">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary/70 mb-2">Products</p>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">What UglyOps covers</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Five connected modules. One workforce operations system.
              </p>
            </div>
          </ScrollReveal>

          <div className="space-y-4">
            {PRODUCT_SECTIONS.map((section, i) => (
              <ScrollReveal key={section.title} delay={i * 60}>
                <div className="group rounded-xl border border-border bg-card p-6 sm:p-8 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/[0.08] group-hover:bg-primary/[0.12] transition-colors duration-200 shrink-0 mt-0.5">
                      <section.icon className="h-5 w-5 text-primary/70 group-hover:text-primary transition-colors duration-200" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-foreground tracking-tight">{section.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">{section.desc}</p>
                      {section.note && (
                        <p className="text-xs text-primary/70 font-medium mt-2 flex items-center gap-1.5">
                          <ClipboardList className="h-3 w-3" />
                          {section.note}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WHY UGLYOPS ═══ */}
      <ScrollReveal>
        <section id="why" className="scroll-mt-16 bg-card/50 border-y border-border">
          <div className="max-w-3xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
            <div className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary/70 mb-2">Why UglyOps</p>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                Built for how hospitality actually works
              </h2>
            </div>

            <div className="space-y-3">
              {WHY_ITEMS.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 sm:p-5">
                  <CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ═══ FAQ ═══ */}
      <ScrollReveal>
        <section id="faq" className="scroll-mt-16">
          <div className="max-w-3xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
            <div className="text-center mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Common questions</h2>
              <p className="text-sm text-muted-foreground mt-2">Straight answers for hospitality operators.</p>
            </div>
            <FAQ />
          </div>
        </section>
      </ScrollReveal>

      {/* ═══ FINAL CTA ═══ */}
      <ScrollReveal>
        <section className="bg-primary/[0.04] border-y border-border">
          <div className="max-w-2xl mx-auto px-5 sm:px-6 py-16 sm:py-24 text-center">
            <h2 className="text-lg sm:text-xl font-bold text-foreground leading-snug max-w-md mx-auto">
              Ready to bring staffing, rota, payroll, holidays, HR and compliance into one place?
            </h2>
            <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
              Start with what you need now and expand as your operation grows.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <Button size="lg" className="gradient-primary w-full sm:w-auto font-semibold shadow-md hover:shadow-lg hover:brightness-105 active:scale-[0.97] transition-all duration-200 h-12 px-10" asChild>
                <Link to="/auth?mode=signup">Book a demo</Link>
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 hover:bg-muted/50 active:scale-[0.97] transition-all duration-200" asChild>
                <Link to="/auth">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={ugloIcon} alt="UglyOps" className="h-6 w-6 rounded-lg" />
              <span className="text-sm font-semibold text-foreground">UglyOps</span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground transition-colors py-1">Privacy</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors py-1">Terms</Link>
              <Link to="/cookies" className="hover:text-foreground transition-colors py-1">Cookies</Link>
              <CookieSettingsButton />
            </nav>
          </div>
          <p className="text-[10px] text-muted-foreground/50 text-center mt-5">
            © {new Date().getFullYear()} UglyOps. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
