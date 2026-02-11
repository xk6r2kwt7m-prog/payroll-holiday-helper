import { useState } from "react";
import { useEmployees } from "@/hooks/useEmployees";
import { useDeleteDocument } from "@/hooks/useEmployeeDocuments";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Trash2, Search, FileText, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentUploadDialog } from "@/components/employees/DocumentUploadDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const deptStyles: Record<string, string> = {
  FOH: "bg-accent/10 text-accent",
  BOH: "bg-primary/10 text-primary",
  CPU: "bg-warning/10 text-warning",
};

export function SignedContractsList() {
  const { toast } = useToast();
  const { data: employees } = useEmployees();
  const [search, setSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const deleteDocument = useDeleteDocument();
  const queryClient = useQueryClient();

  const { data: contracts, isLoading } = useQuery({
    queryKey: ["all_contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_documents")
        .select(`
          *,
          employees (
            id,
            forename,
            surname,
            department
          )
        `)
        .eq("document_type", "contract")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const filtered = contracts?.filter((c) => {
    const empName = `${c.employees?.forename} ${c.employees?.surname}`.toLowerCase();
    const docName = c.document_name.toLowerCase();
    return empName.includes(search.toLowerCase()) || docName.includes(search.toLowerCase());
  });

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from("employee-documents")
      .createSignedUrl(filePath, 3600);

    if (error) {
      toast({ title: "Error", description: "Could not generate download link.", variant: "destructive" });
      return;
    }

    const link = document.createElement("a");
    link.href = data.signedUrl;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: string, filePath: string) => {
    if (!confirm("Are you sure you want to delete this signed contract?")) return;
    try {
      await deleteDocument.mutateAsync({ id, filePath });
      queryClient.invalidateQueries({ queryKey: ["all_contracts"] });
      toast({ title: "Deleted", description: "Signed contract removed." });
    } catch {
      toast({ title: "Error", description: "Could not delete.", variant: "destructive" });
    }
  };

  const activeEmployees = employees?.filter((e) => e.status === "active") || [];
  const selectedEmployee = activeEmployees.find((e) => e.id === selectedEmployeeId);

  return (
    <div className="space-y-4">
      {/* Search & Upload Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contracts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Select employee..." />
            </SelectTrigger>
            <SelectContent>
              {activeEmployees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.forename} {emp.surname}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedEmployee && (
            <DocumentUploadDialog
              employeeId={selectedEmployeeId}
              employeeName={`${selectedEmployee.forename} ${selectedEmployee.surname}`}
            />
          )}
        </div>
      </div>

      {/* Contracts List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl bg-card p-4 shadow-card animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-48 bg-muted rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !filtered?.length ? (
        <div className="rounded-xl bg-card shadow-card p-8 sm:p-12 text-center animate-fade-in">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-4">
            <Upload className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-card-foreground mb-1">No signed contracts yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Generate a contract, get it signed, then upload it here for safekeeping.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((contract) => (
            <div
              key={contract.id}
              className="rounded-xl bg-card shadow-card p-4 flex items-center gap-3 transition-all hover:shadow-elevated animate-fade-in"
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {contract.employees?.forename?.[0]}{contract.employees?.surname?.[0]}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-card-foreground truncate">
                  {contract.employees?.forename} {contract.employees?.surname}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-muted-foreground truncate">
                    {contract.document_name}
                  </span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${deptStyles[contract.employees?.department || ""] || ""}`}>
                    {contract.employees?.department}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(contract.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => handleDownload(contract.file_path, contract.document_name)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(contract.id, contract.file_path)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}