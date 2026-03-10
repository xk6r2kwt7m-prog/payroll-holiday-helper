import { useState, useMemo } from "react";
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
  MapPin,
  ShieldCheck,
  User,
} from "lucide-react";
import type { ContractVariables, ContractType, EmploymentType } from "./contractTemplates";
import {
  CONTRACT_TYPE_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  JOB_TITLES,
  WORK_LOCATIONS,
  getDefaultJobTitle,
  getEmploymentTypeLabel,
} from "./contractTemplates";
import { ContractPDF } from "./ContractPDF";

interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "fill" | "confirm" | "sign";

export function ContractFormDialog({ open, onOpenChange }: ContractFormDialogProps) {
  const { toast } = useToast();
  const { data: employees } = useEmployees();
  const uploadDocument = useUploadDocument();
  const generateSigningLink = useGenerateSigningLink();

  const [step, setStep] = useState<Step>("fill");
  const [generating, setGenerating] = useState(false);
  const [contractType, setContractType] = useState<ContractType>("foh");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [variables, setVariables] = useState<ContractVariables>({
    employeeName: "",
    homeAddress: "",
    jobTitle: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    hourlyRate: "",
    weeklyHours: "40",
    noticePeriod: "two weeks",
    probationPeriod: "2 months",
    workLocation: WORK_LOCATIONS[0],
    employmentType: "variable_hours",
  });

  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null);
  const [employeeSignLink, setEmployeeSignLink] = useState<string | null>(null);
  const [employerSignLink, setEmployerSignLink] = useState<string | null>(null);
  const [generatingEmployeeLink, setGeneratingEmployeeLink] = useState(false);
  const [generatingEmployerLink, setGeneratingEmployerLink] = useState(false);

  const activeEmployees = useMemo(
    () => employees?.filter((e) => e.status === "active") || [],
    [employees]
  );

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    const emp = activeEmployees.find((e) => e.id === employeeId);
    if (emp) {
      const deptMap: Record<string, ContractType> = { FOH: "foh", BOH: "kitchen", CPU: "kitchen" };
      const autoType: ContractType = deptMap[emp.department] || "foh";
      setContractType(autoType);

      setVariables((prev) => ({
        ...prev,
        employeeName: `${emp.forename} ${emp.surname}`,
        hourlyRate: emp.hourly_rate?.toString() || "",
        jobTitle: getDefaultJobTitle(autoType),
        effectiveDate: emp.start_date || new Date().toISOString().split("T")[0],
        noticePeriod: "two weeks",
        probationPeriod: "2 months",
      }));
    }
  };

  const handleContractTypeChange = (type: ContractType) => {
    setContractType(type);
    setVariables((prev) => ({
      ...prev,
      jobTitle: getDefaultJobTitle(type),
    }));
  };

  const updateField = (field: keyof ContractVariables, value: string) => {
    setVariables((prev) => ({ ...prev, [field]: value }));
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
    return true;
  };

  const handleConfirmAndSave = async () => {
    setGenerating(true);
    try {
      const blob = await pdf(
        <ContractPDF variables={variables} contractType={contractType} />
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
      setStep("sign");

      toast({
        title: "Contract saved",
        description: "Contract generated and stored. Now send for signing.",
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

      const link = `${window.location.origin}/sign/${result.token}`;
      setLink(link);
    } catch {
      toast({ title: "Error", description: "Failed to generate link", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({ title: "Copied!", description: "Link copied to clipboard" });
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("fill");
      setSavedDocumentId(null);
      setEmployeeSignLink(null);
      setEmployerSignLink(null);
      setSelectedEmployeeId("");
      setVariables({
        employeeName: "",
        homeAddress: "",
        jobTitle: "",
        effectiveDate: new Date().toISOString().split("T")[0],
        hourlyRate: "",
        weeklyHours: "40",
        noticePeriod: "two weeks",
        probationPeriod: "2 months",
        workLocation: WORK_LOCATIONS[0],
        employmentType: "variable_hours",
      });
    }, 300);
  };

  const stepNumber = step === "fill" ? 1 : step === "confirm" ? 2 : 3;

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
            {step === "fill" && "New Employment Contract"}
            {step === "confirm" && "Confirm Details"}
            {step === "sign" && "Send for Signing"}
          </DialogTitle>
          <DialogDescription>
            {step === "fill" && "Fill in the employment details below to generate a UK-compliant contract."}
            {step === "confirm" && "Review the contract details before generating."}
            {step === "sign" && "Generate signing links for the employee and yourself."}
          </DialogDescription>
          {/* Step indicator */}
          <div className="flex items-center gap-2 pt-3">
            {[1, 2, 3].map((s) => (
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
            <span>Sign</span>
          </div>
        </DialogHeader>

        <div className="px-5 py-4 sm:px-6 space-y-5">
          {/* STEP 1: Fill Details */}
          {step === "fill" && (
            <>
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
                        {activeEmployees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.forename} {emp.surname} — {emp.department}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Full Name *</Label>
                      <Input value={variables.employeeName} onChange={(e) => updateField("employeeName", e.target.value)} placeholder="e.g. John Smith" className="bg-card" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Job Title *</Label>
                      <Input value={variables.jobTitle} onChange={(e) => updateField("jobTitle", e.target.value)} className="bg-card" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Home Address</Label>
                    <Input value={variables.homeAddress} onChange={(e) => updateField("homeAddress", e.target.value)} placeholder="e.g. 52 Thornton Avenue, West Drayton, UB7 9JX" className="bg-card" />
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
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Hourly Rate (£)</Label>
                    <Input value={variables.hourlyRate} onChange={(e) => updateField("hourlyRate", e.target.value)} placeholder="12.50" className="bg-card" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Average Weekly Hours</Label>
                    <Input value={variables.weeklyHours} onChange={(e) => updateField("weeklyHours", e.target.value)} placeholder="40" className="bg-card" />
                  </div>
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
                        {WORK_LOCATIONS.map((loc) => (
                          <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* STEP 2: Confirm Details */}
          {step === "confirm" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Employee
                </h3>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium text-foreground">{variables.employeeName}</span>
                  <span className="text-muted-foreground">Job Title</span>
                  <span className="font-medium text-foreground">{variables.jobTitle}</span>
                  {variables.homeAddress && (
                    <>
                      <span className="text-muted-foreground">Address</span>
                      <span className="font-medium text-foreground">{variables.homeAddress}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" /> Contract Terms
                </h3>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-medium text-foreground">{contractType === "foh" ? "🍽️ Front of House" : "👨‍🍳 Kitchen"}</span>
                  <span className="text-muted-foreground">Employment Type</span>
                  <span className="font-medium text-foreground">{getEmploymentTypeLabel(variables.employmentType)}</span>
                  <span className="text-muted-foreground">Start Date</span>
                  <span className="font-medium text-foreground">
                    {new Date(variables.effectiveDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <span className="text-muted-foreground">Hourly Rate</span>
                  <span className="font-medium text-foreground">£{variables.hourlyRate}/hr</span>
                  <span className="text-muted-foreground">Weekly Hours</span>
                  <span className="font-medium text-foreground">{variables.weeklyHours}h</span>
                  <span className="text-muted-foreground">Notice Period</span>
                  <span className="font-medium text-foreground capitalize">{variables.noticePeriod}</span>
                  <span className="text-muted-foreground">Probation</span>
                  <span className="font-medium text-foreground">{variables.probationPeriod}</span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> Work Location
                </h3>
                <p className="text-sm text-foreground">{variables.workLocation}</p>
              </div>

              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary inline mr-1" />
                Clicking "Generate & Save" will create the PDF contract (17 sections, UK-compliant) and store it securely. You'll then be able to send it for signing.
              </div>
            </div>
          )}

          {/* STEP 3: Sign */}
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
                  {employeeSignLink ? (
                    <Badge className="bg-primary/10 text-primary border-0 text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Ready
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
                    <div className="bg-muted/50 rounded-lg border border-border p-2 text-xs text-muted-foreground break-all select-all">
                      {employeeSignLink}
                    </div>
                    <Button onClick={() => copyToClipboard(employeeSignLink)} variant="outline" size="sm" className="w-full">
                      <Copy className="h-3 w-3" /> Copy Link
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
          {step === "fill" && (
            <>
              <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto order-2 sm:order-1">
                Cancel
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
                onClick={handleConfirmAndSave}
                disabled={generating}
                className="gradient-primary w-full sm:w-auto order-1 sm:order-2"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {generating ? "Generating..." : "Generate & Save"}
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
