import { useState } from "react";
import { useEmployees } from "@/hooks/useEmployees";
import { useDeleteDocument } from "@/hooks/useEmployeeDocuments";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Trash2, Search, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentUploadDialog } from "@/components/employees/DocumentUploadDialog";

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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contracts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className="w-[200px]">
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Signed Contracts ({filtered?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Loading...</p>
          ) : !filtered?.length ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No signed contracts uploaded yet. Generate a contract, get it signed, then upload it here.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Document Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">
                      {contract.employees?.forename} {contract.employees?.surname}
                    </TableCell>
                    <TableCell>{contract.document_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{contract.employees?.department}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(contract.created_at).toLocaleDateString("en-GB")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(contract.file_path, contract.document_name)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(contract.id, contract.file_path)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
