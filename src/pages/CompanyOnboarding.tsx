import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Loader2, Rocket } from "lucide-react";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { StepAccount } from "@/components/onboarding/steps/StepAccount";
import { StepWorkplace } from "@/components/onboarding/steps/StepWorkplace";
import { StepWorkStyle } from "@/components/onboarding/steps/StepWorkStyle";
import { StepTeamSize } from "@/components/onboarding/steps/StepTeamSize";
import { StepPayRhythm } from "@/components/onboarding/steps/StepPayRhythm";
import { StepInvite } from "@/components/onboarding/steps/StepInvite";
import { StepSummary } from "@/components/onboarding/steps/StepSummary";
import ugloIcon from "@/assets/uglo-icon.png";

const TOTAL_STEPS = 7;

interface TeamMember {
  name: string;
  contact: string;
}

interface WizardState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  logoUrl: string; // reused as workspace name
  workplaceType: string;
  workplaceName: string;
  workplaceAddress: string;
  workStyle: string;
  teamSize: string;
  payRhythm: string;
  payDay: string;
  members: TeamMember[];
}

const CompanyOnboarding = () => {
  const { user } = useAuth();
  const { tenantId, loading: tenantLoading, tenantResolved, membershipCount } = useTenant();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState(1);

  const [data, setData] = useState<WizardState>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    logoUrl: "",
    workplaceType: "",
    workplaceName: "",
    workplaceAddress: "",
    workStyle: "",
    teamSize: "",
    payRhythm: "",
    payDay: "",
    members: [{ name: "", contact: "" }],
  });

  const updateField = useCallback((field: string, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // ─── Redirect guards with diagnostic logging ───
  if (!user) {
    console.log("[CompanyOnboarding] GUARD — no user", { redirect: "/auth" });
    navigate("/auth"); return null;
  }
  if (tenantResolved && tenantId) {
    console.log("[CompanyOnboarding] GUARD — already has tenant", {
      userId: user.id, tenantResolved, membershipCount, tenantId, redirect: "/",
      reason: "tenant already selected",
    });
    navigate("/"); return null;
  }
  if (tenantResolved && membershipCount > 0 && !tenantId) {
    console.log("[CompanyOnboarding] GUARD — has memberships, no tenant selected", {
      userId: user.id, tenantResolved, membershipCount, tenantId, redirect: "/select-workspace",
      reason: `${membershipCount} memberships exist, must pick workspace`,
    });
    navigate("/select-workspace"); return null;
  }
  if (!tenantResolved || tenantLoading) {
    console.log("[CompanyOnboarding] GUARD — still resolving", {
      userId: user.id, tenantResolved, tenantLoading, membershipCount,
      redirect: "none (showing loader)",
    });
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }
  // If we reach here: tenantResolved=true, membershipCount=0, no tenantId → allow onboarding
  console.log("[CompanyOnboarding] ALLOWED — rendering onboarding wizard", {
    userId: user.id, tenantResolved, membershipCount, tenantId,
    reason: "confirmed 0 memberships",
  });

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return data.firstName.length >= 1 && data.lastName.length >= 1 && data.logoUrl.length >= 2;
      case 1: return !!data.workplaceType;
      case 2: return !!data.workStyle;
      case 3: return !!data.teamSize;
      case 4: return !!data.payRhythm;
      case 5: return true; // invite is optional
      case 6: return true; // summary
      default: return true;
    }
  };

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setDirection(1);
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  };

  const deriveModules = () => {
    const modules: Record<string, boolean> = {
      scheduling: false,
      payroll: false,
      training: false,
      documents: false,
      analytics: false,
    };
    if (data.workStyle === "shift_based" || data.workStyle === "mixed") {
      modules.scheduling = true;
    }
    if (data.payRhythm !== "not_sure") {
      modules.payroll = true;
    }
    modules.documents = true;
    modules.analytics = true;
    return modules;
  };

  const derivePayrollFrequency = () => {
    switch (data.payRhythm) {
      case "weekly": return "weekly";
      case "biweekly": return "biweekly";
      case "monthly": return "monthly";
      default: return "monthly";
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("provision-tenant", {
        body: {
          company_name: data.logoUrl,
          country: "GB",
          timezone: "Europe/London",
        },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      const tenantIdResult = result.tenant_id;
      if (tenantIdResult) {
        const modules = deriveModules();
        await supabase
          .from("tenants")
          .update({
            enabled_modules: modules,
            payroll_frequency: derivePayrollFrequency(),
          } as any)
          .eq("id", tenantIdResult);

        // Save onboarding state
        await supabase.from("tenant_onboarding_state").insert({
          tenant_id: tenantIdResult,
          current_step: 7,
          completed_steps: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
          wizard_data: data as any,
          completed_at: new Date().toISOString(),
        } as any);

        // Create first workplace if provided
        if (data.workplaceName && (data.workplaceType === "single" || data.workplaceType === "multiple")) {
          await supabase.from("branch_locations").insert({
            tenant_id: tenantIdResult,
            branch: data.workplaceName.toLowerCase().replace(/\s+/g, "_"),
            display_name: data.workplaceName,
            address: data.workplaceAddress || null,
            latitude: 0,
            longitude: 0,
          } as any);
        }

        // Send invitations
        const validMembers = data.members.filter((m) => m.contact.includes("@"));
        for (const member of validMembers) {
          await supabase.from("tenant_invitations").insert({
            tenant_id: tenantIdResult,
            email: member.contact,
            role: "employee" as any,
            invited_by: user.id,
          } as any);
        }
      }

      toast.success("Workspace created! Redirecting…");
      window.location.href = "/";
    } catch (err: any) {
      toast.error(err.message || "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  };

  const variants = {
    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
  };

  const isLastStep = step === TOTAL_STEPS - 1;
  const isInviteStep = step === 5;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex-shrink-0 px-4 pt-6 pb-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <img src={ugloIcon} alt="UGLŌ" className="h-8 w-8 rounded-xl shadow-sm" />
        </div>
        <OnboardingProgress currentStep={step} totalSteps={TOTAL_STEPS} />
        <p className="text-center text-[11px] text-muted-foreground mt-2">
          Step {step + 1} of {TOTAL_STEPS}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 overflow-y-auto">
        <div className="w-full max-w-md mx-auto">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {step === 0 && (
                <StepAccount
                  data={data}
                  onChange={updateField}
                  isExistingUser={!!user}
                />
              )}
              {step === 1 && (
                <StepWorkplace
                  workplaceType={data.workplaceType}
                  workplaceName={data.workplaceName}
                  workplaceAddress={data.workplaceAddress}
                  onChange={updateField}
                />
              )}
              {step === 2 && (
                <StepWorkStyle
                  workStyle={data.workStyle}
                  onChange={(v) => updateField("workStyle", v)}
                />
              )}
              {step === 3 && (
                <StepTeamSize
                  teamSize={data.teamSize}
                  onChange={(v) => updateField("teamSize", v)}
                />
              )}
              {step === 4 && (
                <StepPayRhythm
                  payRhythm={data.payRhythm}
                  payDay={data.payDay}
                  onChange={updateField}
                />
              )}
              {step === 5 && (
                <StepInvite
                  members={data.members}
                  onChange={(m) => setData((prev) => ({ ...prev, members: m }))}
                />
              )}
              {step === 6 && (
                <StepSummary
                  workspaceName={data.logoUrl}
                  workplaceName={data.workplaceName}
                  teamSize={data.teamSize}
                  payRhythm={data.payRhythm}
                  workStyle={data.workStyle}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex-shrink-0 px-4 pb-6 pt-2 border-t border-border bg-background">
        <div className="w-full max-w-md mx-auto flex items-center gap-3">
          {step > 0 ? (
            <Button variant="ghost" onClick={goBack} className="h-12 px-4 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : (
            <div className="w-14" />
          )}

          <div className="flex-1">
            {isLastStep ? (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full h-12 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating workspace…</>
                ) : (
                  <><Rocket className="h-4 w-4 mr-2" /> Launch Workspace</>
                )}
              </Button>
            ) : (
              <Button
                onClick={goNext}
                disabled={!canProceed()}
                className="w-full h-12 rounded-xl text-sm font-semibold"
              >
                {isInviteStep ? "Skip or continue" : "Continue"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyOnboarding;
