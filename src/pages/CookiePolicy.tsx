import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ugloIcon from "@/assets/uglo-icon.png";

const CookiePolicy = () => (
  <div className="min-h-screen bg-background">
    <header className="border-b border-border bg-card">
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
        <Link to="/auth" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        <img src={ugloIcon} alt="UGLŌ" className="h-7 w-7 rounded-lg" />
        <span className="text-sm font-semibold text-foreground">UGLŌ</span>
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Cookie Notice</h1>
      <p className="text-xs text-muted-foreground">Last updated: March 2026 · Placeholder — requires legal review.</p>

      <section className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <h2 className="text-base font-semibold text-foreground">Essential cookies</h2>
        <p>Required for the platform to function. These handle authentication, session management, and security. They cannot be disabled.</p>

        <h2 className="text-base font-semibold text-foreground mt-6">Analytics cookies</h2>
        <p>Help us understand how the platform is used so we can improve it. These are optional and can be disabled in your cookie preferences.</p>

        <h2 className="text-base font-semibold text-foreground mt-6">Preference cookies</h2>
        <p>Remember your display settings such as language and theme. These are optional.</p>

        <h2 className="text-base font-semibold text-foreground mt-6">Managing your preferences</h2>
        <p>You can change your cookie preferences at any time using the "Cookie Settings" link in the page footer.</p>
      </section>

      <p className="text-xs text-destructive/80 bg-destructive/5 rounded-lg p-3 border border-destructive/10">
        ⚠ This cookie notice is a structural placeholder and requires legal review before publication.
      </p>
    </main>
  </div>
);

export default CookiePolicy;
