import { LegalPageLayout } from "@/components/marketing/LegalPageLayout";

const CookiePolicy = () => (
  <LegalPageLayout title="Cookie Notice" lastUpdated="Last updated: March 2026 · Structural placeholder — requires legal review.">
    <section className="space-y-6 text-sm text-muted-foreground leading-relaxed">
      <div>
        <h2 className="text-base font-semibold text-foreground mb-2">Essential cookies</h2>
        <p>Required for the platform to function. These handle authentication, session management, and security. They cannot be disabled.</p>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-2">Analytics cookies</h2>
        <p>Help us understand how the platform is used so we can improve the experience. These are optional and can be disabled in your cookie preferences.</p>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-2">Preference cookies</h2>
        <p>Remember your display settings such as language and theme. These are optional.</p>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-2">Managing your preferences</h2>
        <p>You can change your cookie preferences at any time using the "Cookie Settings" link in the page footer.</p>
      </div>
    </section>
  </LegalPageLayout>
);

export default CookiePolicy;
