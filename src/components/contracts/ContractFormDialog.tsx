import { useState, useMemo, useEffect } from "react";
import {
  evaluateCriticalContractDetails,
  type ContractDetailsMode,
} from "@/lib/contract-critical-fields";
import { getCanonicalOrigin } from "@/lib/getCanonicalUrl";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useTenant } from "@/hooks/useTenant";
import { ContractPreview } from "./ContractPreview";
import { pdf } from "@react-pdf/renderer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useEmployees } from "@/hooks/useEmployees";
import { useUploadDocument } from "@/hooks/useEmployeeDocuments";
import { useGenerateSigningLink } from "@/hooks/useContractSigning";
import { useSendContractEmail } from "@/hooks/useSendContractEmail";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  FileText,
  Link2,
  Loader2,
  Mail,
  Send,
  MapPin,
  ShieldCheck,
  User,
} from "lucide-react";
import type { ContractVariables, ContractType, EmploymentType } from "./contractTemplates";
import {
  CONTRACT_TYPE_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  JOB_TITLES,
  getDefaultJobTitle,
  getEmploymentTypeLabel,
} from "./contractTemplates";
import { ContractPDF } from "./ContractPDF";
import { useLocationSettings } from "@/hooks/useLocationSettings";
import { PayStructureFields, type NmwOverrideState } from "./PayStructureFields";
import { useCreateNmwOverride } from "@/hooks/useNmwOverride";
import { evaluateWageCompliance } from "@/lib/uk-minimum-wage";
import { useMyOnboardingData } from "@/hooks/useEmployeeOnboarding";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantBranches } from "@/hooks/useBranches";
import { getActiveEmploymentTerms } from "@/lib/employment-terms";
import { mapEmployeeToContractDefaults } from "@/lib/contract-employee-defaults";
import {
  resolveContractFieldSources,
  getMissingContractFields,
  sourceLabel,
  CONTRACT_FIELD_LABELS,
  type ContractFieldSource,
} from "@/lib/contract-form-review";
import { deriveContractReadiness } from "@/lib/contract-readiness";
import {
  buildContractDraftEvidence,
  payDetailsStatusLabel,
  reportingManagerStatusLabel,
} from "@/lib/contract-draft-evidence";
import {
  saveContractDraft,
  loadContractDraft,
  clearContractDraft,
  draftHasContent,
} from "@/lib/contract-draft-autosave";
import { getContractGenerationGate } from "@/lib/contract-generation-gate";
import {
  buildContractIssueSummary,
  contractWorkflowStatusLabel,
  type ContractWorkflowStatus,
} from "@/lib/contract-issue-summary";

interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedEmployeeId?: string;
}

type Step = "fill" | "confirm" | "issue" | "sign";

/** Guided one-question-at-a-time stages inside the "fill" step. */
type FillStage = "employee" | "location" | "hours" | "manager" | "email" | "details";

const FILL_STAGES: FillStage[] = ["employee", "location", "hours", "manager", "email", "details"];

const FILL_STAGE_COPY: Record<FillStage, { title: string; description: string }> = {
  employee: { title: "Who is this contract for?", description: "Pick the team member." },
  location: { title: "Where will they work?", description: "Choose their main place of work." },
  hours: { title: "Full time or part time?", description: "This sets their weekly hours." },
  manager: { title: "Who do they report to?", description: "Pick a manager or type a name." },
  email: { title: "Where should we send it?", description: "Check, correct or add their email." },
  details: { title: "Pay and remaining details", description: "Everything else, pre-filled where we know it." },
};

export function ContractFormDialog({ open, onOpenChange, preselectedEmployeeId }: ContractFormDialogProps) {
  const { toast } = useToast();
  const { data: employees } = useEmployees();
  const { data: tenantBranches } = useTenantBranches();
  const { data: companySettings } = useCompanySettings();
  const queryClient = useQueryClient();
  const { tenantName } = useTenant();
  const uploadDocument = useUploadDocument();
  const generateSigningLink = useGenerateSigningLink();
  const { sendContractEmail } = useSendContractEmail();
  const companyLegalName = companySettings?.company_name || tenantName || "Your Company";
  const companyAddress = companySettings?.address || "";
  const { data: locationSettings = [] } = useLocationSettings();
  const workLocations = locationSettings.map(l => l.address ? `${l.display_name} — ${l.address}` : l.display_name);

  const [step, setStep] = useState<Step>("fill");
  const [fillStage, setFillStage] = useState<FillStage>("employee");
  const [emailDraft, setEmailDraft] = useState("");
  /** Details-first is the safe default; send-straight-away is opt-in. */
  const [detailsMode, setDetailsMode] = useState<ContractDetailsMode>("details_first");
  const [savingEmail, setSavingEmail] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [contractType, setContractType] = useState<ContractType>("foh");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [variables, setVariables] = useState<ContractVariables>({
    employeeName: "",
    homeAddress: "",
    jobTitle: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    hourlyRate: "",
    baseHourlyRate: "",
    guaranteedServiceChargeRate: "",
    estimatedServiceChargeRate: "",
    troncSchemeName: "",
    serviceChargePolicyNote: "",
    weeklyHours: "40",
    noticePeriod: "two weeks",
    probationPeriod: "2 months",
    workLocation: "",
    employmentType: "variable_hours",
    reportingManagerName: "",
    reportingManagerTitle: "",
  });

  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null);
  const [employeeSignLink, setEmployeeSignLink] = useState<string | null>(null);
  const [employerSignLink, setEmployerSignLink] = useState<string | null>(null);
  const [generatingEmployeeLink, setGeneratingEmployeeLink] = useState(false);
  const [generatingEmployerLink, setGeneratingEmployerLink] = useState(false);
  const [sendingContractEmail, setSendingContractEmail] = useState(false);
  const [contractEmailSent, setContractEmailSent] = useState(false);
  const [employeeSignTokenId, setEmployeeSignTokenId] = useState<string | null>(null);
  const [nmwOverride, setNmwOverride] = useState<NmwOverrideState | null>(null);
  const createNmwOverride = useCreateNmwOverride();

  const contractEligibleEmployees = useMemo(
    () => employees?.filter((e) => ["active", "starter", "onboarding"].includes(e.status)) || [],
    [employees]
  );

  // Fields the user has manually edited for the currently selected employee.
  // We never overwrite these via auto-fill. Reset when a different employee
  // is picked.
  const [userEdited, setUserEdited] = useState<Set<keyof ContractVariables>>(new Set());
  const [contractTypeEdited, setContractTypeEdited] = useState(false);

  // Fetch onboarding + active employment terms for the selected employee.
  // These are read-only lookups; they do not mutate any profile data.
  const { data: onboardingData } = useMyOnboardingData(selectedEmployeeId || undefined);
  const { data: activeTerms } = useQuery({
    queryKey: ["active-employment-terms", selectedEmployeeId],
    queryFn: () => getActiveEmploymentTerms(selectedEmployeeId),
    enabled: !!selectedEmployeeId,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!open || !preselectedEmployeeId || !contractEligibleEmployees.length) return;
    const match = contractEligibleEmployees.find((e) => e.id === preselectedEmployeeId);
    if (match) {
      handleEmployeeSelect(match.id);
    }
  }, [open, preselectedEmployeeId, contractEligibleEmployees]);

  const [restoredDraftAt, setRestoredDraftAt] = useState<string | null>(null);

  const handleEmployeeSelect = (employeeId: string) => {
    if (employeeId !== selectedEmployeeId) {
      // New employee picked — clear per-employee manual-edit tracking so the
      // freshly fetched profile/onboarding data can populate the form.
      setUserEdited(new Set());
      setContractTypeEdited(false);
      setRestoredDraftAt(null);

      // Bring back any details typed earlier for this person but never issued.
      const saved = loadContractDraft<ContractVariables>(employeeId);
      if (draftHasContent(saved as any) && saved) {
        setVariables((prev) => ({ ...prev, ...saved.variables }));
        if (saved.emailDraft) setEmailDraft(saved.emailDraft);
        if (saved.contractType) {
          setContractType(saved.contractType as ContractType);
          setContractTypeEdited(true);
        }
        setUserEdited(new Set(saved.editedFields as (keyof ContractVariables)[]));
        setRestoredDraftAt(saved.savedAt);
      }
    }
    setSelectedEmployeeId(employeeId);
  };

  // Auto-fill effect — runs whenever the selected employee or any of the
  // backing data sources (employee list, onboarding, active terms) change.
  // Skips any field that the user has manually edited.
  useEffect(() => {
    if (!selectedEmployeeId) return;
    const emp = contractEligibleEmployees.find((e) => e.id === selectedEmployeeId);
    if (!emp) return;

    const { variables: defaults, contractType: derivedType } = mapEmployeeToContractDefaults({
      employee: emp,
      onboarding: onboardingData ?? null,
      activeTerms: (activeTerms as any) ?? null,
    });

    if (!contractTypeEdited) {
      setContractType(derivedType);
    }

    setVariables((prev) => {
      const next = { ...prev } as ContractVariables;
      for (const [key, value] of Object.entries(defaults)) {
        const k = key as keyof ContractVariables;
        if (userEdited.has(k)) continue;
        if (value === undefined || value === null || value === "") continue;
        (next as any)[k] = value;
      }
      // Keep legacy hourlyRate in sync if baseHourlyRate was auto-filled.
      if (!userEdited.has("baseHourlyRate") && defaults.baseHourlyRate) {
        next.hourlyRate = defaults.baseHourlyRate;
      }
      return next;
    });
  }, [selectedEmployeeId, onboardingData, activeTerms, contractEligibleEmployees, userEdited, contractTypeEdited]);

  const handleContractTypeChange = (type: ContractType) => {
    setContractTypeEdited(true);
    setContractType(type);
    setUserEdited((prev) => {
      const next = new Set(prev);
      next.add("jobTitle");
      return next;
    });
    setVariables((prev) => ({
      ...prev,
      jobTitle: getDefaultJobTitle(type),
    }));
  };

  const updateField = (field: keyof ContractVariables, value: string) => {
    setUserEdited((prev) => {
      if (prev.has(field)) return prev;
      const next = new Set(prev);
      next.add(field);
      return next;
    });
    setVariables((prev) => {
      const nextVars = { ...prev, [field]: value } as ContractVariables;
      // Keep legacy hourlyRate in sync with baseHourlyRate so existing
      // downstream consumers (older saved drafts, audit logs) still work.
      if (field === "baseHourlyRate") nextVars.hourlyRate = value;
      return nextVars;
    });
  };

  const selectedEmployeeEarly = contractEligibleEmployees.find((e) => e.id === selectedEmployeeId);

  // Phase 5F — auto-fill source map + missing critical-field summary.
  // Pure derivations from in-memory state; nothing is persisted.
  const fieldSources = useMemo(() => {
    if (!selectedEmployeeEarly) return {} as Partial<Record<keyof ContractVariables, ContractFieldSource>>;
    return resolveContractFieldSources({
      input: {
        employee: selectedEmployeeEarly,
        onboarding: onboardingData ?? null,
        activeTerms: (activeTerms as any) ?? null,
      },
      variables,
      userEdited,
    });
  }, [selectedEmployeeEarly, onboardingData, activeTerms, variables, userEdited]);

  const missingCriticalFields = useMemo(
    () => getMissingContractFields(variables),
    [variables],
  );

  // Phase 5J — derive a calm readiness status from existing review helpers.
  const readiness = useMemo(
    () => deriveContractReadiness({ missing: missingCriticalFields, sources: fieldSources }),
    [missingCriticalFields, fieldSources],
  );

  // Phase 5K — pure, non-persisted evidence snapshot for review-only display.
  const draftEvidence = useMemo(
    () =>
      buildContractDraftEvidence({
        employee: selectedEmployeeEarly ? { id: selectedEmployeeEarly.id } : null,
        contractType,
        contractValues: variables,
        fieldSources,
        missingFields: missingCriticalFields,
        readinessStatus: readiness.status,
        fromEmployeeCreationFlow: Boolean(preselectedEmployeeId),
      }),
    [
      selectedEmployeeEarly,
      contractType,
      variables,
      fieldSources,
      missingCriticalFields,
      readiness.status,
      preselectedEmployeeId,
    ],
  );

  // Phase 5L — pure generation gate (hard-required vs soft warnings).
  const generationGate = useMemo(
    () =>
      getContractGenerationGate({
        variables,
        companyLegalName,
        companyAddress,
        fieldSources,
        manualReviewFields: readiness.manualCriticalFields,
      }),
    [variables, companyLegalName, companyAddress, fieldSources, readiness.manualCriticalFields],
  );

  // Phase 5M — workflow status derived from in-memory dialog state (no DB write).
  // generated → contract PDF was saved but NOT issued/sent yet.
  // issued    → manager explicitly confirmed and a signing link was sent.
  // signed    → real signature flow completes elsewhere (no fake signing here).
  const workflowStatus: ContractWorkflowStatus = useMemo(() => {
    if (contractEmailSent) return "issued";
    if (savedDocumentId) return "generated";
    return "draft";
  }, [savedDocumentId, contractEmailSent]);

  // Phase 5M — pure issue-confirmation summary (does not send, sign or persist).
  const issueSummary = useMemo(
    () =>
      buildContractIssueSummary({
        variables,
        gate: generationGate,
        evidence: draftEvidence,
        isGenerated: !!savedDocumentId,
      }),
    [variables, generationGate, draftEvidence, savedDocumentId],
  );





  const FieldSourceHint = ({ field }: { field: keyof ContractVariables }) => {
    const src = fieldSources[field];
    if (!src || src === "missing") return null;
    return (
      <p
        data-testid={`field-source-${field}`}
        data-source={src}
        className="text-[10px] text-muted-foreground mt-1"
      >
        {sourceLabel(src)}
      </p>
    );
  };


  const validateStep1 = () => {
    if (!variables.employeeName.trim() || !variables.jobTitle.trim() || !selectedEmployeeId) {
      toast({
        title: "Missing fields",
        description: "Please select an employee and fill in the required fields.",
        variant: "destructive",
      });
      return false;
    }
    if (!variables.baseHourlyRate || Number(variables.baseHourlyRate) <= 0) {
      toast({
        title: "Base hourly rate required",
        description: "Enter a base hourly rate (before service charge).",
        variant: "destructive",
      });
      return false;
    }
    // NMW gate — base rate only, service charge is excluded.
    const dob = selectedEmployeeEarly?.date_of_birth || null;
    if (dob) {
      const refDate = variables.effectiveDate ? new Date(variables.effectiveDate) : new Date();
      const comp = evaluateWageCompliance({
        dobIso: dob,
        hourlyRate: Number(variables.baseHourlyRate) || 0,
        referenceDate: isNaN(refDate.getTime()) ? new Date() : refDate,
      });
      if (comp.status === "below") {
        if (!nmwOverride?.acknowledged || nmwOverride.reason.trim().length === 0) {
          toast({
            title: "Below National Minimum Wage",
            description:
              "The base hourly rate is below NMW. Service charge cannot make this up. Provide a manager override reason to continue.",
            variant: "destructive",
          });
          return false;
        }
      }
    }
    return true;
  };

  const handleConfirmAndSave = async () => {
    // Phase 5L — defensive gate (UI button is already disabled when blocked).
    if (!generationGate.canGenerate) {
      toast({
        title: "Required fields missing",
        description: generationGate.message,
        variant: "destructive",
      });
      return;
    }
    setGenerating(true);
    try {
      const blob = await pdf(
        <ContractPDF variables={variables} contractType={contractType} companyLegalName={companyLegalName} companyAddress={companyAddress} />
      ).toBlob();

      const fileName = `Employment_Contract_${variables.employeeName.replace(/\s+/g, "_")}.pdf`;
      const file = new File([blob], fileName, { type: "application/pdf" });

      const result = await uploadDocument.mutateAsync({
        employeeId: selectedEmployeeId,
        file,
        documentType: "contract",
        documentName: `Employment Contract — ${variables.employeeName}`,
      });

      setSavedDocumentId(result.id);

      // Record how this contract reaches the staff member. Details-first keeps
      // the contract hidden until they submit their own details.
      const { error: modeError } = await supabase
        .from("employee_documents")
        .update({ requires_details_first: detailsMode === "details_first" })
        .eq("id", result.id);
      if (modeError) {
        console.error("Failed to save contract sending mode:", modeError);
      }

      // Phase 3 — write immutable NMW override audit row if applicable.
      if (nmwOverride?.acknowledged && nmwOverride.reason.trim()) {
        try {
          await createNmwOverride.mutateAsync({
            employee_id: selectedEmployeeId,
            contract_id: result.id,
            base_hourly_rate: nmwOverride.base_hourly_rate,
            required_minimum_rate: nmwOverride.required_minimum_rate,
            age_band: nmwOverride.age_band,
            override_reason: nmwOverride.reason,
          });
        } catch (e) {
          console.error("Failed to write NMW override audit row:", e);
          toast({
            title: "Override not recorded",
            description: (e as Error)?.message || "Could not write audit row.",
            variant: "destructive",
          });
        }
      }

      // Phase 5M — generation ≠ issuing. Move to the explicit issue
      // confirmation step instead of jumping straight to send/sign.
      setStep("issue");

      toast({
        title: "Contract generated",
        description:
          "Contract was generated and saved as a draft. Review and confirm before issuing it to the employee.",
      });
    } catch (err) {
      console.error("PDF generation/upload error:", err);
      toast({
        title: "Error",
        description: "Failed to generate contract. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateLink = async (signerType: "employee" | "employer") => {
    if (!savedDocumentId) return;

    const setLoading = signerType === "employee" ? setGeneratingEmployeeLink : setGeneratingEmployerLink;
    const setLink = signerType === "employee" ? setEmployeeSignLink : setEmployerSignLink;

    setLoading(true);
    try {
      const result = await generateSigningLink.mutateAsync({
        employeeDocumentId: savedDocumentId,
        employeeId: selectedEmployeeId,
        signerType,
      });

      const link = `${getCanonicalOrigin()}/sign/${result.token}`;
      setLink(link);
      if (signerType === "employee") {
        setEmployeeSignTokenId(result.id);
      }
    } catch {
      toast({ title: "Error", description: "Failed to generate link", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const selectedEmployee = contractEligibleEmployees.find((e) => e.id === selectedEmployeeId);
  const employeeEmail = selectedEmployee?.email;

  /**
   * Critical-detail gate: "Send straight away" is only offered when nothing a
   * contract needs is missing. Display/gating only — no payroll, holiday, NMW
   * or service-charge logic is involved.
   */
  const criticalDetails = useMemo(
    () =>
      evaluateCriticalContractDetails({
        fullLegalName: variables.employeeName,
        email: emailDraft || employeeEmail,
        homeAddress: variables.homeAddress,
        jobTitle: variables.jobTitle,
        workLocation: variables.workLocation,
        startDate: variables.effectiveDate,
        employmentType: variables.employmentType,
        weeklyHours: variables.weeklyHours,
        baseHourlyRate: variables.baseHourlyRate,
        reportingManagerName: variables.reportingManagerName,
      }),
    [variables, emailDraft, employeeEmail]
  );

  useEffect(() => {
    // Never leave an unsendable contract on "send straight away".
    if (!criticalDetails.canSendStraightAway) setDetailsMode("details_first");
  }, [criticalDetails.canSendStraightAway]);

  // Keep whatever has been typed for this person, so a refresh or accidental
  // close never loses it. Local convenience cache only — nothing is written to
  // the employee record here.
  useEffect(() => {
    if (!open || !selectedEmployeeId || step !== "fill") return;
    saveContractDraft<ContractVariables>(selectedEmployeeId, {
      variables,
      emailDraft,
      contractType,
      editedFields: Array.from(userEdited) as string[],
    });
  }, [open, selectedEmployeeId, step, variables, emailDraft, contractType, userEdited]);

  // Once the contract exists as a draft document, the typed cache is redundant.
  useEffect(() => {
    if (savedDocumentId && selectedEmployeeId) clearContractDraft(selectedEmployeeId);
  }, [savedDocumentId, selectedEmployeeId]);



  const handleSendContractEmail = async () => {
    if (!employeeSignLink || !employeeEmail || !savedDocumentId || !employeeSignTokenId) return;

    setSendingContractEmail(true);
    try {
      const result = await sendContractEmail({
        recipientEmail: employeeEmail,
        employeeName: variables.employeeName,
        signingUrl: employeeSignLink,
        signingTokenId: employeeSignTokenId,
        employeeId: selectedEmployeeId,
        employeeDocumentId: savedDocumentId,
      });

      if (result.success) {
        setContractEmailSent(true);
        toast({
          title: "Contract sent",
          description: `Contract sent to ${employeeEmail}`,
        });
      } else {
        toast({
          title: "Email failed",
          description: "Contract link was generated, but the email failed to send. You can still copy the link manually.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Email failed",
        description: "Contract link was generated, but the email failed to send. You can still copy the link manually.",
        variant: "destructive",
      });
    } finally {
      setSendingContractEmail(false);
    }
  };

  const copyToClipboard = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({ title: "Copied!", description: "Link copied to clipboard" });
  };

  /**
   * Guided flow: validate the current question, then move to the next one.
   * The email step also saves a corrected/added address to the employee record.
   */
  const advanceFillStage = async () => {
    const index = FILL_STAGES.indexOf(fillStage);

    if (fillStage === "employee" && !selectedEmployeeId) {
      toast({ title: "Pick a team member", description: "Select who this contract is for.", variant: "destructive" });
      return;
    }
    if (fillStage === "location" && !variables.workLocation.trim()) {
      toast({ title: "Place of work needed", description: "Choose or type where they work.", variant: "destructive" });
      return;
    }
    if (fillStage === "email") {
      const email = emailDraft.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast({ title: "Email needed", description: "Enter a valid email address for this person.", variant: "destructive" });
        return;
      }
      if (email !== (selectedEmployee?.email || "")) {
        setSavingEmail(true);
        const { error } = await supabase.from("employees").update({ email }).eq("id", selectedEmployeeId);
        setSavingEmail(false);
        if (error) {
          toast({ title: "Could not save email", description: error.message, variant: "destructive" });
          return;
        }
        queryClient.invalidateQueries({ queryKey: ["employees"] });
        toast({ title: "Email saved", description: `${email} saved to their record.` });
      }
    }

    if (fillStage === "employee" && !emailDraft) setEmailDraft(selectedEmployee?.email || "");

    setFillStage(FILL_STAGES[Math.min(index + 1, FILL_STAGES.length - 1)]);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("fill");
      setFillStage("employee");
      setEmailDraft("");
      setSavedDocumentId(null);
      setEmployeeSignLink(null);
      setEmployerSignLink(null);
      setContractEmailSent(false);
      setNmwOverride(null);
      setEmployeeSignTokenId(null);
      setSelectedEmployeeId("");
      setUserEdited(new Set());
      setContractTypeEdited(false);
      setVariables({
        employeeName: "",
        homeAddress: "",
        jobTitle: "",
        effectiveDate: new Date().toISOString().split("T")[0],
        hourlyRate: "",
        baseHourlyRate: "",
        guaranteedServiceChargeRate: "",
        estimatedServiceChargeRate: "",
        troncSchemeName: "",
        serviceChargePolicyNote: "",
        weeklyHours: "40",
        noticePeriod: "two weeks",
        probationPeriod: "2 months",
        workLocation: "",
        employmentType: "variable_hours",
        reportingManagerName: "",
        reportingManagerTitle: "",
      });
    }, 300);
  };

  const stepNumber =
    step === "fill" ? 1 : step === "confirm" ? 2 : step === "issue" ? 3 : 4;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-5 pt-5 pb-0 sm:px-6 sm:pt-6">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              {step === "sign" ? (
                <ShieldCheck className="h-4 w-4 text-primary" />
              ) : (
                <FileText className="h-4 w-4 text-primary" />
              )}
            </div>
            {step === "fill" && FILL_STAGE_COPY[fillStage].title}
            {step === "confirm" && "Confirm Details"}
            {step === "issue" && "Issue Contract"}
            {step === "sign" && "Send for Signing"}
          </DialogTitle>
          <DialogDescription>
            {step === "fill" && FILL_STAGE_COPY[fillStage].description}
            {step === "confirm" && "Review the contract details before generating."}
            {step === "issue" && "Contract generated and saved as draft. Confirm to issue it to the employee."}
            {step === "sign" && "Generate signing links for the employee and yourself."}
          </DialogDescription>
          {/* Step indicator */}
          <div className="flex items-center gap-2 pt-3">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    s <= stepNumber ? "bg-primary" : "bg-muted"
                  }`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground pt-1">
            <span>Details</span>
            <span>Confirm</span>
            <span>Issue</span>
            <span>Sign</span>
          </div>
        </DialogHeader>


        <div className="px-5 py-4 sm:px-6 space-y-5">
          {/* STEP 1a: Guided questions, one at a time */}
          {step === "fill" && fillStage !== "details" && (
            <div className="space-y-4">
              <div className="flex items-center gap-1.5">
                {FILL_STAGES.map((s, i) => (
                  <div
                    key={s}
                    className={`h-1 flex-1 rounded-full ${
                      i <= FILL_STAGES.indexOf(fillStage) ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>

              {fillStage === "employee" && (
                <div className="space-y-2">
                  {contractEligibleEmployees.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => {
                        handleEmployeeSelect(emp.id);
                        setEmailDraft(emp.email || "");
                      }}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        selectedEmployeeId === emp.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <p className="text-sm font-medium">
                        {emp.forename} {emp.surname}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {emp.department || "No department"}
                        {emp.email ? ` · ${emp.email}` : " · no email yet"}
                      </p>
                    </button>
                  ))}
                  {contractEligibleEmployees.length === 0 && (
                    <p className="text-sm text-muted-foreground">No employees available for a contract yet.</p>
                  )}
                </div>
              )}

              {fillStage === "location" && (
                <div className="space-y-2">
                  {(tenantBranches || []).map((branch) => (
                    <button
                      key={branch}
                      type="button"
                      onClick={() => setVariables({ ...variables, workLocation: branch })}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        variables.workLocation === branch
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <p className="text-sm font-medium">{branch}</p>
                    </button>
                  ))}
                  <div>
                    <Label className="text-xs">Or type a place of work</Label>
                    <Input
                      value={variables.workLocation}
                      onChange={(e) => setVariables({ ...variables, workLocation: e.target.value })}
                      placeholder="e.g. Central London site"
                    />
                  </div>
                </div>
              )}

              {fillStage === "hours" && (
                <div className="space-y-2">
                  {([
                    { value: "full_time", label: "Full time", hours: "40", note: "40 hours a week" },
                    { value: "part_time", label: "Part time", hours: "20", note: "Set the weekly hours below" },
                    { value: "variable_hours", label: "Variable hours", hours: "", note: "Hours vary week to week" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setVariables({
                          ...variables,
                          employmentType: opt.value,
                          weeklyHours: opt.hours || variables.weeklyHours,
                        })
                      }
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        variables.employmentType === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.note}</p>
                    </button>
                  ))}
                  {variables.employmentType !== "variable_hours" && (
                    <div>
                      <Label className="text-xs">Weekly hours</Label>
                      <Input
                        type="number"
                        value={variables.weeklyHours}
                        onChange={(e) => setVariables({ ...variables, weeklyHours: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              )}

              {fillStage === "manager" && (
                <div className="space-y-2">
                  {companySettings?.default_signatory_name && (
                    <button
                      type="button"
                      onClick={() =>
                        setVariables({
                          ...variables,
                          reportingManagerName: companySettings.default_signatory_name || "",
                          reportingManagerTitle: companySettings.default_signatory_title || "",
                        })
                      }
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        variables.reportingManagerName === companySettings.default_signatory_name
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <p className="text-sm font-medium">{companySettings.default_signatory_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {companySettings.default_signatory_title || "Signatory"}
                      </p>
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Manager name</Label>
                      <Input
                        value={variables.reportingManagerName}
                        onChange={(e) => setVariables({ ...variables, reportingManagerName: e.target.value })}
                        placeholder="e.g. Aderito Barros"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Job title</Label>
                      <Input
                        value={variables.reportingManagerTitle}
                        onChange={(e) => setVariables({ ...variables, reportingManagerTitle: e.target.value })}
                        placeholder="e.g. Operations Manager"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave blank to use a generic reporting line in the contract.
                  </p>
                </div>
              )}

              {fillStage === "email" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Staff email address</Label>
                    <Input
                      type="email"
                      value={emailDraft}
                      onChange={(e) => setEmailDraft(e.target.value)}
                      placeholder="name@example.com"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedEmployee?.email
                      ? "Editing this updates the email on their record."
                      : "No email on record yet — adding one here saves it to their record."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 1b: Full details form */}
          {step === "fill" && fillStage === "details" && (
            <>
              {/* Phase 5J — Readiness banner */}
              {selectedEmployeeId && (
                <div
                  data-testid="readiness-banner"
                  data-readiness-status={readiness.status}
                  className={`rounded-lg border p-3 text-xs ${
                    readiness.bannerTone === "warning"
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-primary/20 bg-primary/5"
                  }`}
                >
                  <p className="font-medium text-foreground">{readiness.bannerTitle}</p>
                  <p className="text-muted-foreground mt-0.5">{readiness.bannerDescription}</p>
                </div>
              )}

              {/* Phase 5F — Missing critical fields summary */}
              {selectedEmployeeId && missingCriticalFields.length > 0 && (
                <div
                  data-testid="missing-fields-warning"
                  className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs"
                >
                  <p className="font-medium text-foreground mb-1">
                    Some contract details are missing. Please review before generating the contract.
                  </p>
                  <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                    {missingCriticalFields.map((m) => (
                      <li key={m.field} data-testid={`missing-field-${m.field}`}>{m.label}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Department & Type */}
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Department & Type
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {CONTRACT_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleContractTypeChange(opt.value)}
                      className={`rounded-lg border-2 px-3 py-3 text-sm font-medium transition-all text-left ${
                        contractType === opt.value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-card text-foreground hover:border-primary/30"
                      }`}
                    >
                      {opt.emoji} {opt.label}
                    </button>
                  ))}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Employment Type</Label>
                  <Select
                    value={variables.employmentType}
                    onValueChange={(v) => updateField("employmentType", v)}
                  >
                    <SelectTrigger className="bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldSourceHint field="employmentType" />
                </div>
              </div>

              {/* Employee Details */}
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <User className="h-4 w-4 text-primary" />
                  Employee Details
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Select Employee *</Label>
                    <Select value={selectedEmployeeId} onValueChange={handleEmployeeSelect}>
                      <SelectTrigger className="bg-card">
                        <SelectValue placeholder="Choose employee..." />
                      </SelectTrigger>
                      <SelectContent>
                        {contractEligibleEmployees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.forename} {emp.surname} — {emp.department}
                            {emp.status !== "active" && ` (${emp.status})`}
                          </SelectItem>
                        ))}
                        {contractEligibleEmployees.length === 0 && (
                          <div className="px-3 py-2 text-xs text-muted-foreground">No employees found</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Full Name *</Label>
                      <Input value={variables.employeeName} onChange={(e) => updateField("employeeName", e.target.value)} placeholder="e.g. John Smith" className="bg-card" />
                      <FieldSourceHint field="employeeName" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Job Title *</Label>
                      <Select value={variables.jobTitle} onValueChange={(v) => updateField("jobTitle", v)}>
                        <SelectTrigger className="bg-card">
                          <SelectValue placeholder="Select job title..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(JOB_TITLES[contractType] || []).map((title) => (
                            <SelectItem key={title} value={title}>{title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldSourceHint field="jobTitle" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Home Address</Label>
                    <Input value={variables.homeAddress} onChange={(e) => updateField("homeAddress", e.target.value)} placeholder="e.g. 52 Thornton Avenue, West Drayton, UB7 9JX" className="bg-card" />
                    <FieldSourceHint field="homeAddress" />
                  </div>
                </div>
              </div>

              {/* Employment Terms */}
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  Employment Terms
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Start Date</Label>
                    <Input type="date" value={variables.effectiveDate} onChange={(e) => updateField("effectiveDate", e.target.value)} className="bg-card" />
                    <FieldSourceHint field="effectiveDate" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Average Weekly Hours</Label>
                    <Input value={variables.weeklyHours} onChange={(e) => updateField("weeklyHours", e.target.value)} placeholder="40" className="bg-card" />
                    <FieldSourceHint field="weeklyHours" />
                  </div>
                </div>


                {/* Pay structure — base vs service charge (Phase 3) */}
                <PayStructureFields
                  variables={variables}
                  onChange={updateField}
                  employeeDob={selectedEmployee?.date_of_birth ?? null}
                  effectiveDate={variables.effectiveDate}
                  onOverrideChange={setNmwOverride}
                  nmwOverride={nmwOverride}
                  fieldSources={fieldSources}
                />


                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Notice Period</Label>
                    <Select value={variables.noticePeriod} onValueChange={(v) => updateField("noticePeriod", v)}>
                      <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one week">1 week</SelectItem>
                        <SelectItem value="two weeks">2 weeks</SelectItem>
                        <SelectItem value="1 month">1 month</SelectItem>
                        <SelectItem value="2 months">2 months</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldSourceHint field="noticePeriod" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Probation Period</Label>
                    <Select value={variables.probationPeriod} onValueChange={(v) => updateField("probationPeriod", v)}>
                      <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1 month">1 month</SelectItem>
                        <SelectItem value="2 months">2 months</SelectItem>
                        <SelectItem value="3 months">3 months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Primary Work Location</Label>
                    <Select value={variables.workLocation} onValueChange={(v) => updateField("workLocation", v)}>
                      <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {workLocations.length > 0 ? workLocations.map((loc) => (
                          <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                        )) : (
                          <SelectItem value="main" disabled>Add locations in Settings first</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FieldSourceHint field="workLocation" />
                  </div>
                </div>
              </div>

              {/* Phase 5H — Reporting Manager (optional, draft-form only) */}
              <div
                className="rounded-lg border border-border bg-muted/30 p-4 space-y-3"
                data-testid="reporting-manager-section"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <User className="h-4 w-4 text-primary" />
                  Reporting Manager
                  <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </div>
                <p className="text-[11px] text-muted-foreground -mt-1">
                  Used only in the Appointment section of this draft contract. Not saved back to the employee profile.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Manager Name</Label>
                    <Input
                      data-testid="reporting-manager-name-input"
                      value={variables.reportingManagerName || ""}
                      onChange={(e) => updateField("reportingManagerName", e.target.value)}
                      placeholder="e.g. Alex Carter"
                      className="bg-card"
                    />
                    <FieldSourceHint field="reportingManagerName" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Manager Job Title</Label>
                    <Input
                      data-testid="reporting-manager-title-input"
                      value={variables.reportingManagerTitle || ""}
                      onChange={(e) => updateField("reportingManagerTitle", e.target.value)}
                      placeholder="e.g. Operations Manager"
                      className="bg-card"
                    />
                    <FieldSourceHint field="reportingManagerTitle" />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* STEP 2: Confirm Details */}
          {step === "confirm" && (
            <div className="space-y-4">
              {/* How this contract reaches the staff member */}
              <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                <p className="text-sm font-semibold">How should this reach {variables.employeeName || "them"}?</p>
                {([
                  {
                    value: "details_first" as ContractDetailsMode,
                    title: "Ask for their details first (recommended)",
                    note: "They complete name, address and contact details before the contract is shown.",
                    disabled: false,
                  },
                  {
                    value: "send_now" as ContractDetailsMode,
                    title: "Send straight away",
                    note: criticalDetails.canSendStraightAway
                      ? "Everything needed is already on record."
                      : `Missing: ${criticalDetails.missing.join(", ")}.`,
                    disabled: !criticalDetails.canSendStraightAway,
                  },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => setDetailsMode(opt.value)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors disabled:opacity-50 ${
                      detailsMode === opt.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <p className="text-sm font-medium">{opt.title}</p>
                    <p className="text-xs text-muted-foreground">{opt.note}</p>
                  </button>
                ))}
                {!criticalDetails.canSendStraightAway && (
                  <p className="text-xs text-amber-600">{criticalDetails.message}</p>
                )}
              </div>

              {/* Phase 5F — Concise review summary */}
              <div
                data-testid="confirm-review-summary"
                className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-xs"
              >
                <p className="text-sm font-semibold text-foreground">Review summary</p>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  {(([
                    ["employeeName", variables.employeeName],
                    ["jobTitle", variables.jobTitle],
                    ["employmentType", variables.employmentType ? getEmploymentTypeLabel(variables.employmentType) : ""],
                    ["effectiveDate", variables.effectiveDate],
                    ["baseHourlyRate", variables.baseHourlyRate ? `£${variables.baseHourlyRate}/hr` : ""],
                    ["guaranteedServiceChargeRate", Number(variables.guaranteedServiceChargeRate) > 0 ? `£${variables.guaranteedServiceChargeRate}/hr` : ""],
                    ["estimatedServiceChargeRate", Number(variables.estimatedServiceChargeRate) > 0 ? `£${variables.estimatedServiceChargeRate}/hr` : ""],
                    ["troncSchemeName", variables.troncSchemeName || ""],
                    ["weeklyHours", variables.weeklyHours ? `${variables.weeklyHours} hrs/week` : ""],
                    ["workLocation", variables.workLocation],
                    ["noticePeriod", variables.noticePeriod],
                    ["reportingManagerName", variables.reportingManagerName || ""],
                    ["reportingManagerTitle", variables.reportingManagerTitle || ""],
                  ] as const)
                    .filter(([field, value]) => {
                      // Always show critical fields (even if missing); only show
                      // optional pay extras when they have a value.
                      const optional = new Set<string>([
                        "guaranteedServiceChargeRate",
                        "estimatedServiceChargeRate",
                        "troncSchemeName",
                        "reportingManagerName",
                        "reportingManagerTitle",
                      ]);
                      return !optional.has(field) || (value && String(value).trim() !== "");
                    })
                  ).map(([field, value]) => (
                    <div key={field} className="flex justify-between gap-3" data-testid={`review-row-${field}`}>
                      <dt className="text-muted-foreground">{CONTRACT_FIELD_LABELS[field as keyof ContractVariables] || field}</dt>
                      <dd className="font-medium text-foreground text-right truncate">
                        {value || <span className="text-amber-600">Missing</span>}
                      </dd>
                    </div>
                  ))}

                </dl>
                {missingCriticalFields.length > 0 && (
                  <div
                    data-testid="confirm-missing-warning"
                    className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-amber-900 dark:text-amber-200"
                  >
                    Missing: {missingCriticalFields.map((m) => m.label).join(", ")}. You can still continue, but
                    we recommend filling these in for a complete contract.
                  </div>
                )}
                {readiness.manualCriticalFields.length > 0 && (
                  <div
                    data-testid="confirm-manual-warning"
                    data-readiness-status={readiness.status}
                    className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-amber-900 dark:text-amber-200"
                  >
                    Some important fields were entered manually
                    {`: ${readiness.manualCriticalFields.map((m) => m.label).join(", ")}`}.
                    Please confirm they are correct before generating.
                  </div>
                )}
              </div>

              {/* Phase 5K — Draft preparation evidence summary (display-only, not persisted) */}
              <div
                data-testid="draft-evidence-summary"
                data-readiness-status={draftEvidence.readinessStatus}
                data-from-employee-creation={String(draftEvidence.generatedFromEmployeeCreationFlow)}
                className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-xs"
              >
                <p className="text-sm font-semibold text-foreground">Draft preparation summary</p>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Readiness</dt>
                    <dd className="font-medium text-foreground" data-testid="evidence-readiness">
                      {readiness.bannerTitle}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Auto-filled fields</dt>
                    <dd className="font-medium text-foreground" data-testid="evidence-autofilled-count">
                      {draftEvidence.autoFilledCount}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Manually entered critical fields</dt>
                    <dd className="font-medium text-foreground" data-testid="evidence-manual-count">
                      {draftEvidence.manuallyEnteredCriticalFields.length}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Missing critical fields</dt>
                    <dd className="font-medium text-foreground" data-testid="evidence-missing-count">
                      {draftEvidence.missingCriticalFields.length}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Reporting manager</dt>
                    <dd className="font-medium text-foreground" data-testid="evidence-reporting-manager">
                      {reportingManagerStatusLabel(draftEvidence.reportingManagerStatus)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Pay details</dt>
                    <dd className="font-medium text-foreground" data-testid="evidence-pay-details">
                      {payDetailsStatusLabel(draftEvidence.payDetailsStatus)}
                    </dd>
                  </div>
                </dl>
                {draftEvidence.missingCriticalFields.length > 0 && (
                  <p className="text-muted-foreground" data-testid="evidence-missing-list">
                    Missing: {draftEvidence.missingCriticalFields.map((m) => m.label).join(", ")}
                  </p>
                )}
              </div>


              <ContractPreview
                variables={variables}
                contractType={contractType}
                companyLegalName={companyLegalName}
                companyAddress={companyAddress}
              />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={async () => {
                    const blob = await pdf(
                      <ContractPDF variables={variables} contractType={contractType} companyLegalName={companyLegalName} companyAddress={companyAddress} />
                    ).toBlob();
                    const url = URL.createObjectURL(blob);
                    window.open(url, "_blank");
                  }}
                >
                  <Eye className="h-4 w-4" />
                  Preview PDF
                </Button>
              </div>

              {/* Phase 5L — Generation gate panel */}
              <div
                data-testid="generation-gate-panel"
                data-can-generate={String(generationGate.canGenerate)}
                className={`rounded-lg border p-3 text-xs space-y-2 ${
                  generationGate.canGenerate
                    ? "border-primary/20 bg-primary/5"
                    : "border-destructive/30 bg-destructive/5"
                }`}
              >
                <p className="font-medium text-foreground">{generationGate.message}</p>
                {generationGate.blockingFields.length > 0 && (
                  <div data-testid="gate-blocking">
                    <p className="text-muted-foreground">Required fields missing:</p>
                    <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                      {generationGate.blockingFields.map((b) => (
                        <li key={b.field} data-testid={`gate-blocking-${b.field}`}>{b.label}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {generationGate.warningFields.length > 0 && (
                  <div data-testid="gate-warnings">
                    <p className="text-muted-foreground">Warnings to review (not blocking):</p>
                    <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                      {generationGate.warningFields.map((w) => (
                        <li key={w.field} data-testid={`gate-warning-${w.field}`}>{w.label}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {generationGate.manualReviewFields.length > 0 && (
                  <div data-testid="gate-manual-review">
                    <p className="text-muted-foreground">Manually entered critical fields (review):</p>
                    <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                      {generationGate.manualReviewFields.map((m) => (
                        <li key={m.field}>{m.label}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary inline mr-1" />
                Clicking "Generate & Save" will create the PDF contract (17 sections, UK-compliant) and store it securely. You'll then be able to send it for signing.
              </div>
            </div>
          )}

          {/* STEP 3: Issue confirmation (Phase 5M) — generation ≠ issuing. */}
          {step === "issue" && (
            <div className="space-y-4" data-testid="issue-confirmation-panel">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold text-foreground">
                    Contract generated and saved as draft
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Status:{" "}
                  <span data-testid="workflow-status" data-status={workflowStatus}>
                    {contractWorkflowStatusLabel(workflowStatus)}
                  </span>
                  . The contract has not been issued or signed yet.
                </p>
              </div>

              <div
                className="rounded-xl border border-border bg-card p-4 space-y-2"
                data-testid="issue-summary"
              >
                <p className="text-sm font-semibold text-foreground">Review before issuing</p>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Employee</dt>
                    <dd className="font-medium">{issueSummary.employeeName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Job title</dt>
                    <dd className="font-medium">{issueSummary.jobTitle}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Start date</dt>
                    <dd className="font-medium">{issueSummary.startDate}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Contract type</dt>
                    <dd className="font-medium">{issueSummary.employmentTypeLabel}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Pay</dt>
                    <dd className="font-medium">{issueSummary.paySummary}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Work location</dt>
                    <dd className="font-medium">{issueSummary.workLocation}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Reporting manager</dt>
                    <dd className="font-medium">{issueSummary.reportingManagerLine}</dd>
                  </div>
                </dl>
              </div>

              {issueSummary.hasSoftWarnings && (
                <div
                  data-testid="issue-soft-warnings"
                  className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs text-warning-foreground"
                >
                  <p className="font-semibold mb-1">Soft warnings</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {issueSummary.softWarningLabels.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </div>
              )}

              {issueSummary.hasManualCriticalFields && (
                <div
                  data-testid="issue-manual-fields"
                  className="rounded-xl border border-amber-300/40 bg-amber-50 p-3 text-xs text-amber-900"
                >
                  <p className="font-semibold mb-1">
                    Manually entered critical fields
                  </p>
                  <p className="mb-1">
                    These were entered by hand rather than auto-filled from existing data:
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {issueSummary.manualCriticalFieldLabels.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary inline mr-1" />
                {issueSummary.confirmationMessage}
              </div>
            </div>
          )}

          {/* STEP 4: Sign */}

          {step === "sign" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-primary mx-auto" />
                <p className="text-sm font-semibold text-foreground">Contract Generated & Saved</p>
                <p className="text-xs text-muted-foreground">
                  Now generate signing links to send to {variables.employeeName} and yourself.
                </p>
              </div>

              {/* Employee signing link */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">👤 Employee Signature</p>
                    <p className="text-xs text-muted-foreground">Send to {variables.employeeName}</p>
                  </div>
                  {contractEmailSent ? (
                    <Badge className="bg-primary/10 text-primary border-0 text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Sent
                    </Badge>
                  ) : employeeSignLink ? (
                    <Badge className="bg-primary/10 text-primary border-0 text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Ready to send
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Clock className="h-3 w-3" /> Pending
                    </Badge>
                  )}
                </div>

                {!employeeSignLink ? (
                  <Button
                    onClick={() => handleGenerateLink("employee")}
                    disabled={generatingEmployeeLink}
                    className="w-full"
                    variant="outline"
                  >
                    {generatingEmployeeLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                    Generate Employee Link
                  </Button>
                ) : (
                  <div className="space-y-2">
                    {/* Primary action: Send contract by email */}
                    {employeeEmail && !contractEmailSent ? (
                      <Button
                        onClick={handleSendContractEmail}
                        disabled={sendingContractEmail}
                        className="w-full gradient-primary"
                      >
                        {sendingContractEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                        {sendingContractEmail ? "Sending..." : "Send contract"}
                      </Button>
                    ) : contractEmailSent ? (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
                        <p className="text-xs font-medium text-primary">✓ Contract sent to {employeeEmail}</p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                        <p className="text-xs text-muted-foreground">
                          No email on file.{" "}
                          <button
                            onClick={() => {
                              onOpenChange(false);
                              window.location.href = `/employees?edit=${selectedEmployeeId}&tab=personal`;
                            }}
                            className="text-primary hover:underline font-medium"
                          >
                            Add email to send contract
                          </button>
                        </p>
                      </div>
                    )}

                    {/* Fallback: Copy link */}
                    <Button onClick={() => copyToClipboard(employeeSignLink)} variant="outline" size="sm" className="w-full">
                      <Copy className="h-3 w-3" /> Copy link
                    </Button>
                  </div>
                )}
              </div>

              {/* Employer signing link */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">👔 Manager Signature</p>
                    <p className="text-xs text-muted-foreground">Sign as employer (you)</p>
                  </div>
                  {employerSignLink ? (
                    <Badge className="bg-primary/10 text-primary border-0 text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Ready
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Clock className="h-3 w-3" /> Pending
                    </Badge>
                  )}
                </div>

                {!employerSignLink ? (
                  <Button
                    onClick={() => handleGenerateLink("employer")}
                    disabled={generatingEmployerLink}
                    className="w-full"
                    variant="outline"
                  >
                    {generatingEmployerLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                    Generate Manager Link
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="bg-muted/50 rounded-lg border border-border p-2 text-xs text-muted-foreground break-all select-all">
                      {employerSignLink}
                    </div>
                    <Button onClick={() => copyToClipboard(employerSignLink)} variant="outline" size="sm" className="w-full">
                      <Copy className="h-3 w-3" /> Copy Link
                    </Button>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-muted-foreground text-center">
                Links expire in 7 days. Share via WhatsApp, email, or any messenger. No login needed.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="px-5 pb-5 sm:px-6 sm:pb-6 gap-2 flex-col sm:flex-row">
          {step === "fill" && fillStage !== "details" && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  const i = FILL_STAGES.indexOf(fillStage);
                  if (i === 0) handleClose();
                  else setFillStage(FILL_STAGES[i - 1]);
                }}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                {fillStage === "employee" ? "Cancel" : <><ArrowLeft className="h-4 w-4" /> Back</>}
              </Button>
              <Button
                onClick={advanceFillStage}
                disabled={savingEmail}
                className="gradient-primary w-full sm:w-auto order-1 sm:order-2"
              >
                {savingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {step === "fill" && fillStage === "details" && (
            <>
              <Button
                variant="outline"
                onClick={() => setFillStage("email")}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={() => { if (validateStep1()) setStep("confirm"); }}
                className="gradient-primary w-full sm:w-auto order-1 sm:order-2"
              >
                Review Details
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {step === "confirm" && (
            <>
              <Button variant="outline" onClick={() => setStep("fill")} className="w-full sm:w-auto order-2 sm:order-1">
                <ArrowLeft className="h-4 w-4" /> Edit
              </Button>
              <Button
                data-testid="generate-and-save-button"
                onClick={handleConfirmAndSave}
                disabled={generating || !generationGate.canGenerate}
                title={generationGate.canGenerate ? undefined : generationGate.message}
                className="gradient-primary w-full sm:w-auto order-1 sm:order-2"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {generating ? "Generating..." : "Generate & Save"}
              </Button>
            </>
          )}

          {step === "issue" && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Close — issue later
              </Button>
              <Button
                data-testid="issue-contract-button"
                onClick={() => setStep("sign")}
                disabled={!issueSummary.canIssue}
                title={issueSummary.blockingReason || undefined}
                className="gradient-primary w-full sm:w-auto order-1 sm:order-2"
              >
                <Send className="h-4 w-4" />
                Issue contract to employee
              </Button>
            </>
          )}

          {step === "sign" && (
            <Button onClick={handleClose} className="w-full gradient-primary">
              Done
            </Button>
          )}

        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
