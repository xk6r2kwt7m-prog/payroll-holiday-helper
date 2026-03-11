import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { motion } from "framer-motion";
import { Building2, Globe, Clock, ArrowRight, Loader2 } from "lucide-react";
import ugloIcon from "@/assets/uglo-icon.png";

const companySchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters").max(100),
  country: z.string().min(2, "Please select a country"),
  timezone: z.string().min(1, "Please select a timezone"),
});

const COUNTRIES = [
  { code: "GB", label: "United Kingdom", timezones: ["Europe/London"] },
  { code: "CV", label: "Cape Verde", timezones: ["Atlantic/Cape_Verde"] },
  { code: "PT", label: "Portugal", timezones: ["Europe/Lisbon", "Atlantic/Azores"] },
  { code: "IE", label: "Ireland", timezones: ["Europe/Dublin"] },
  { code: "US", label: "United States", timezones: ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"] },
];

const CompanyOnboarding = () => {
  const { user } = useAuth();
  const { tenantId, loading: tenantLoading } = useTenant();
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");
  const [timezone, setTimezone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // If user already belongs to a tenant, redirect to dashboard
  useEffect(() => {
    if (!tenantLoading && tenantId) {
      navigate("/", { replace: true });
    }
  }, [tenantId, tenantLoading, navigate]);

  const selectedCountry = COUNTRIES.find((c) => c.code === country);
  const availableTimezones = selectedCountry?.timezones ?? [];

  const handleCountryChange = (code: string) => {
    setCountry(code);
    const c = COUNTRIES.find((x) => x.code === code);
    if (c && c.timezones.length === 1) {
      setTimezone(c.timezones[0]);
    } else {
      setTimezone("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = companySchema.safeParse({ companyName, country, timezone });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("provision-tenant", {
        body: {
          company_name: companyName,
          country,
          timezone,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Company workspace created! Redirecting…");
      // Force reload to pick up new tenant context
      window.location.href = "/";
    } catch (err: any) {
      toast.error(err.message || "Failed to create company workspace");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <img src={ugloIcon} alt="UGLŌ" className="h-14 w-14 rounded-2xl shadow-lg mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Set Up Your Company</h1>
          <p className="text-muted-foreground mt-1">
            Tell us about your business to get started
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl bg-card shadow-elevated border border-border/40 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company name */}
            <div className="space-y-2">
              <Label htmlFor="companyName" className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Company Name
              </Label>
              <Input
                id="companyName"
                placeholder="e.g. The Golden Fork"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={errors.companyName ? "border-destructive" : ""}
              />
              {errors.companyName && (
                <p className="text-sm text-destructive">{errors.companyName}</p>
              )}
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Country
              </Label>
              <Select value={country} onValueChange={handleCountryChange}>
                <SelectTrigger className={errors.country ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.country && (
                <p className="text-sm text-destructive">{errors.country}</p>
              )}
            </div>

            {/* Timezone */}
            {availableTimezones.length > 1 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Timezone
                </Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className={errors.timezone ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTimezones.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.timezone && (
                  <p className="text-sm text-destructive">{errors.timezone}</p>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full gradient-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating workspace…
                </>
              ) : (
                <>
                  Create Company Workspace
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          You'll be set up as the Company Admin with full control over your workspace.
        </p>
      </motion.div>
    </div>
  );
};

export default CompanyOnboarding;
