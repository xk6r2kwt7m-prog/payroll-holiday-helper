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
import { Download, FileText, Loader2 } from "lucide-react";
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Employment Contract
          </DialogTitle>
          <DialogDescription>
            Fill in the employee details below. The contract will be generated as
            a PDF ready for download and signing.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Contract Type */}
          <div className="grid gap-2">
            <Label>Contract Type</Label>
            <Select
              value={contractType}
              onValueChange={(v) => handleContractTypeChange(v as ContractType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTRACT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Select from existing employees or type manually */}
          <div className="grid gap-2">
            <Label>Select Employee (optional)</Label>
            <Select
              value={selectedEmployeeId}
              onValueChange={handleEmployeeSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose an existing employee to pre-fill..." />
              </SelectTrigger>
              <SelectContent>
                {activeEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.forename} {emp.surname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="employeeName">Full Name *</Label>
              <Input
                id="employeeName"
                value={variables.employeeName}
                onChange={(e) => updateField("employeeName", e.target.value)}
                placeholder="e.g. John Smith"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="jobTitle">Job Title *</Label>
              <Input
                id="jobTitle"
                value={variables.jobTitle}
                onChange={(e) => updateField("jobTitle", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="homeAddress">Home Address *</Label>
            <Input
              id="homeAddress"
              value={variables.homeAddress}
              onChange={(e) => updateField("homeAddress", e.target.value)}
              placeholder="e.g. 52 Thornton Avenue, West Drayton, UB7 9JX, London"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="effectiveDate">Effective Date</Label>
              <Input
                id="effectiveDate"
                type="date"
                value={variables.effectiveDate}
                onChange={(e) => updateField("effectiveDate", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hourlyRate">Hourly Rate (£)</Label>
              <Input
                id="hourlyRate"
                value={variables.hourlyRate}
                onChange={(e) => updateField("hourlyRate", e.target.value)}
                placeholder="e.g. 12.50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="weeklyHours">Weekly Hours</Label>
              <Input
                id="weeklyHours"
                value={variables.weeklyHours}
                onChange={(e) => updateField("weeklyHours", e.target.value)}
                placeholder="e.g. 40"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="workLocation">Work Location</Label>
              <Select
                value={variables.workLocation}
                onValueChange={(v) => updateField("workLocation", v)}
              >
                <SelectTrigger>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="noticePeriod">Notice Period</Label>
              <Select
                value={variables.noticePeriod}
                onValueChange={(v) => updateField("noticePeriod", v)}
              >
                <SelectTrigger>
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
            <div className="grid gap-2">
              <Label htmlFor="probationPeriod">Probation Period</Label>
              <Select
                value={variables.probationPeriod}
                onValueChange={(v) => updateField("probationPeriod", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1 month">1 month</SelectItem>
                  <SelectItem value="2 months">2 months</SelectItem>
                  <SelectItem value="3 months">3 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {generating ? "Generating..." : "Generate & Download PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
