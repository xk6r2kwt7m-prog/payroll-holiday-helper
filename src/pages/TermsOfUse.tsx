import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ugloIcon from "@/assets/uglo-icon.png";

const TermsOfUse = () => (
  <div className="min-h-screen bg-background">
    <header className="border-b border-border bg-card">
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
        <Link to="/auth" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        <img src={ugloIcon} alt="UGLŌ" className="h-7 w-7 rounded-lg" />
        <span className="text-sm font-semibold text-foreground">UGLŌ</span>
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Terms of Use</h1>
      <p className="text-xs text-muted-foreground">Last updated: March 2026 · This is a placeholder and requires legal review before publication.</p>

      <section className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <h2 className="text-base font-semibold text-foreground">Acceptance of terms</h2>
        <p>By accessing or using the UGLŌ platform, you agree to be bound by these terms. If you do not agree, you should not use the service.</p>

        <h2 className="text-base font-semibold text-foreground mt-6">Account responsibilities</h2>
        <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.</p>

        <h2 className="text-base font-semibold text-foreground mt-6">Permitted use</h2>
        <p>The platform is provided for legitimate workforce management purposes. You agree not to use it for any unlawful purpose or in any way that could damage, disable, or impair the service.</p>

        <h2 className="text-base font-semibold text-foreground mt-6">Data ownership</h2>
        <p>You retain ownership of all data you enter into the platform. We do not claim ownership of your employee records, payroll data, or business information.</p>

        <h2 className="text-base font-semibold text-foreground mt-6">Service availability</h2>
        <p>We aim to provide a reliable service but do not guarantee uninterrupted access. Scheduled maintenance will be communicated in advance where possible.</p>

        <h2 className="text-base font-semibold text-foreground mt-6">Limitation of liability</h2>
        <p>To the fullest extent permitted by law, UGLŌ's liability is limited to the fees paid by you in the twelve months preceding the claim.</p>
      </section>

      <p className="text-xs text-destructive/80 bg-destructive/5 rounded-lg p-3 border border-destructive/10">
        ⚠ These terms are a structural placeholder and have not been reviewed by a legal professional. They must be replaced with legally compliant terms before public launch.
      </p>
    </main>
  </div>
);

export default TermsOfUse;
