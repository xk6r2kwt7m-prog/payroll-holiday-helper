import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ugloIcon from "@/assets/uglo-icon.png";
import { CookieSettingsButton } from "@/components/CookieConsent";
import { ReactNode } from "react";

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link to="/auth" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <img src={ugloIcon} alt="UGLŌ" className="h-7 w-7 rounded-lg" />
          <span className="text-sm font-semibold text-foreground">UGLŌ</span>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-6 py-10 w-full">
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-xs text-muted-foreground mt-2">{lastUpdated}</p>
          </div>

          {children}

          <div className="rounded-lg bg-destructive/5 border border-destructive/10 p-4">
            <p className="text-xs text-destructive/80 leading-relaxed">
              <strong>Placeholder notice:</strong> This document is a structural draft and has not been reviewed by a legal professional. It must be replaced with a legally compliant version before public launch.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Need help?</strong> For questions about this policy, contact{" "}
              <span className="text-foreground font-medium">support@uglo.app</span> (placeholder).
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-card mt-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[10px] text-muted-foreground/60">© {new Date().getFullYear()} UGLŌ</p>
          <nav className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/cookies" className="hover:text-foreground transition-colors">Cookies</Link>
            <CookieSettingsButton />
          </nav>
        </div>
      </footer>
    </div>
  );
}
