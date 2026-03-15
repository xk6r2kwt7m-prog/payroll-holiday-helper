import { LegalPageLayout } from "@/components/marketing/LegalPageLayout";

const PrivacyPolicy = () => (
  <LegalPageLayout title="Privacy Policy" lastUpdated="Last updated: March 2026 · Structural placeholder — requires legal review.">
    <section className="space-y-6 text-sm text-muted-foreground leading-relaxed">
      <div>
        <h2 className="text-base font-semibold text-foreground mb-2">What information we collect</h2>
        <p>We collect information you provide when creating an account, managing employees, and using platform features. This includes names, email addresses, employment details, and payroll data entered by authorised administrators.</p>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-2">How we use your information</h2>
        <p>Your data is used to provide the workforce management services you've signed up for — scheduling, payroll processing, holiday tracking, and related features. We do not sell personal data to third parties.</p>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-2">Data separation</h2>
        <p>Each company operates in its own isolated workspace. Employee data belonging to one organisation is not accessible to another.</p>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-2">Data retention</h2>
        <p>Payroll records are retained for at least 3 years from the end of the relevant tax year, in line with UK requirements. Other data is retained for the duration of your active account.</p>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-2">Your rights</h2>
        <p>You may request access to, correction of, or deletion of your personal data by contacting us. Account administrators can manage employee records directly within the platform.</p>
      </div>
    </section>
  </LegalPageLayout>
);

export default PrivacyPolicy;
