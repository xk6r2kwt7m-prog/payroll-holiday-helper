import { LegalPageLayout } from "@/components/marketing/LegalPageLayout";

const TermsOfUse = () => (
  <LegalPageLayout title="Terms of Use" lastUpdated="Last updated: March 2026 · Structural placeholder — requires legal review.">
    <section className="space-y-6 text-sm text-muted-foreground leading-relaxed">
      <div>
        <h2 className="text-base font-semibold text-foreground mb-2">Acceptance of terms</h2>
        <p>By accessing or using the UGLŌ platform, you agree to be bound by these terms. If you do not agree, you should not use the service.</p>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-2">Account responsibilities</h2>
        <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.</p>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-2">Permitted use</h2>
        <p>The platform is provided for legitimate workforce management purposes. You agree not to use it for any unlawful purpose or in any way that could damage, disable, or impair the service.</p>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-2">Data ownership</h2>
        <p>You retain ownership of all data you enter into the platform. We do not claim ownership of your employee records, payroll data, or business information.</p>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-2">Service availability</h2>
        <p>We aim to provide a reliable service but cannot guarantee uninterrupted access. Scheduled maintenance will be communicated in advance where possible.</p>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-2">Limitation of liability</h2>
        <p>To the fullest extent permitted by law, UGLŌ's liability is limited to the fees paid by you in the twelve months preceding the claim.</p>
      </div>
    </section>
  </LegalPageLayout>
);

export default TermsOfUse;
