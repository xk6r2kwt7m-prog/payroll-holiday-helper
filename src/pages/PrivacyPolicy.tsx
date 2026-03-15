import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ugloIcon from "@/assets/uglo-icon.png";

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background">
    <header className="border-b border-border bg-card">
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
        <Link to="/auth" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        <img src={ugloIcon} alt="UGLŌ" className="h-7 w-7 rounded-lg" />
        <span className="text-sm font-semibold text-foreground">UGLŌ</span>
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
      <p className="text-xs text-muted-foreground">Last updated: March 2026 · This is a placeholder and requires legal review before publication.</p>

      <section className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <h2 className="text-base font-semibold text-foreground">What information we collect</h2>
        <p>We collect information you provide when creating an account, managing employees, and using platform features. This includes names, email addresses, employment details, and payroll data entered by authorised administrators.</p>

        <h2 className="text-base font-semibold text-foreground mt-6">How we use your information</h2>
        <p>Your data is used to provide the workforce management services you've signed up for — scheduling, payroll processing, holiday tracking, and related features. We do not sell personal data to third parties.</p>

        <h2 className="text-base font-semibold text-foreground mt-6">Data separation</h2>
        <p>Each company operates in a separate, isolated workspace. Employee data belonging to one organisation is never accessible to another.</p>

        <h2 className="text-base font-semibold text-foreground mt-6">Data retention</h2>
        <p>Payroll records are retained for at least 3 years from the end of the relevant tax year in line with UK requirements. Other data is retained for the duration of your account.</p>

        <h2 className="text-base font-semibold text-foreground mt-6">Your rights</h2>
        <p>You may request access to, correction of, or deletion of your personal data by contacting us. Account administrators can manage employee records directly within the platform.</p>

        <h2 className="text-base font-semibold text-foreground mt-6">Contact</h2>
        <p>For privacy-related enquiries, please contact us at <span className="text-foreground font-medium">privacy@uglo.app</span> (placeholder).</p>
      </section>

      <p className="text-xs text-destructive/80 bg-destructive/5 rounded-lg p-3 border border-destructive/10">
        ⚠ This privacy policy is a structural placeholder and has not been reviewed by a legal professional. It must be replaced with a legally compliant document before public launch.
      </p>
    </main>
  </div>
);

export default PrivacyPolicy;
