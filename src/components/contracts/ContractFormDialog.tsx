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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useEmployees } from "@/hooks/useEmployees";
import { Download, FileText, Loader2, User, Briefcase, MapPin, Clock } from "lucide-react";
import type { ContractVariables, ContractType } from "./contractTemplates";
import {
  CONTRACT_TYPE_OPTIONS,
  getDefaultJobTitle,
} from "./contractTemplates";
import { ContractPDF } from "./ContractPDF";

interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WORK_LOCATIONS = [
  "30 Rathbone Place, W1T 1JJ, London",
  "1 Newburgh St, London, W1F 7RB",
];

export function ContractFormDialog({
  open,
  onOpenChange,
}: ContractFormDialogProps) {
  const { toast } = useToast();
  const { data: employees } = useEmployees();
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
  });

  const activeEmployees = useMemo(
    () => employees?.filter((e) => e.status === "active") || [],
    [employees]
  );

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    const emp = activeEmployees.find((e) => e.id === employeeId);
    if (emp) {
      setVariables((prev) => ({
        ...prev,
        employeeName: `${emp.forename} ${emp.surname}`,
        hourlyRate: emp.hourly_rate?.toString() || "",
        jobTitle: prev.jobTitle || getDefaultJobTitle(contractType),
      }));
    }
  };

  const handleContractTypeChange = (type: ContractType) => {
    setContractType(type);
    setVariables((prev) => ({
      ...prev,
      jobTitle: getDefaultJobTitle(type),
      noticePeriod: type === "kitchen" ? "1 month" : "two weeks",
      probationPeriod: type === "kitchen" ? "1 month" : "2 months",
    }));
  };

  const updateField = (field: keyof ContractVariables, value: string) => {
    setVariables((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    if (!variables.employeeName || !variables.jobTitle) {
      toast({
        title: "Missing fields",
        description: "Please fill in at least the employee name and job title.",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const blob = await pdf(
        <ContractPDF variables={variables} contractType={contractType} />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Employment_Contract_${variables.employeeName.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Contract generated",
        description: `Contract for ${variables.employeeName} has been downloaded.`,
      });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast({
        title: "Error generating contract",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-5 pt-5 pb-0 sm:px-6 sm:pt-6">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            Generate Contract
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to generate an employment contract PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 sm:px-6 space-y-5">
          {/* Section 1: Contract Type */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Briefcase className="h-4 w-4 text-primary" />
              Contract Type
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
                  {opt.value === "foh" ? "🍽️" : "👨‍🍳"} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Employee Details */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <User className="h-4 w-4 text-primary" />
              Employee Details
            </div>
            
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Quick Select Employee</Label>
                <Select
                  value={selectedEmployeeId}
                  onValueChange={handleEmployeeSelect}
                >
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder="Choose existing employee to pre-fill..." />
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
                  <Input
                    value={variables.employeeName}
                    onChange={(e) => updateField("employeeName", e.target.value)}
                    placeholder="e.g. John Smith"
                    className="bg-card"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Job Title *</Label>
                  <Input
                    value={variables.jobTitle}
                    onChange={(e) => updateField("jobTitle", e.target.value)}
                    className="bg-card"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Home Address *</Label>
                <Input
                  value={variables.homeAddress}
                  onChange={(e) => updateField("homeAddress", e.target.value)}
                  placeholder="e.g. 52 Thornton Avenue, West Drayton, UB7 9JX"
                  className="bg-card"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Employment Terms */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock className="h-4 w-4 text-primary" />
              Employment Terms
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Start Date</Label>
                <Input
                  type="date"
                  value={variables.effectiveDate}
                  onChange={(e) => updateField("effectiveDate", e.target.value)}
                  className="bg-card"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Hourly Rate (£)</Label>
                <Input
                  value={variables.hourlyRate}
                  onChange={(e) => updateField("hourlyRate", e.target.value)}
                  placeholder="12.50"
                  className="bg-card"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Weekly Hours</Label>
                <Input
                  value={variables.weeklyHours}
                  onChange={(e) => updateField("weeklyHours", e.target.value)}
                  placeholder="40"
                  className="bg-card"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Notice Period</Label>
                <Select
                  value={variables.noticePeriod}
                  onValueChange={(v) => updateField("noticePeriod", v)}
                >
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
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
                <Select
                  value={variables.probationPeriod}
                  onValueChange={(v) => updateField("probationPeriod", v)}
                >
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1 month">1 month</SelectItem>
                    <SelectItem value="2 months">2 months</SelectItem>
                    <SelectItem value="3 months">3 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Work Location</Label>
                <Select
                  value={variables.workLocation}
                  onValueChange={(v) => updateField("workLocation", v)}
                >
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_LOCATIONS.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 pb-5 sm:px-6 sm:pb-6 gap-2 flex-col sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="gradient-primary w-full sm:w-auto order-1 sm:order-2"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {generating ? "Generating..." : "Generate PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}