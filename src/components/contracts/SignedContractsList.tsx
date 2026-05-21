import { useState, useMemo } from "react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Download, Trash2, Search, Upload, FilePlus2, ChevronDown, ShieldAlert, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentUploadDialog } from "@/components/employees/DocumentUploadDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ContractSigningActions } from "./ContractSigningActions";
import { ContractStateBadge } from "./ContractStateBadge";
import { ContractVersionTimeline } from "./ContractVersionTimeline";
import { CreateAmendmentDialog } from "./CreateAmendmentDialog";
import { TerminateContractDialog } from "./TerminateContractDialog";
import { useTenant } from "@/hooks/useTenant";

const deptStyles: Record<string, string> = {
  FOH: "bg-accent/10 text-accent",
  BOH: "bg-primary/10 text-primary",
  CPU: "bg-warning/10 text-warning",
};

interface ContractRow {
  id: string;
  document_name: string;
  file_path: string;
  created_at: string;
  contract_state?: string | null;
  contract_send_status?: string | null;
  contract_sent_to?: string | null;
  contract_sent_at?: string | null;
  final_signed_pdf_url?: string | null;
  version_number?: number | null;
  parent_contract_id?: string | null;
  root_contract_id?: string | null;
  superseded_by?: string | null;
  amendment_type?: string | null;
  amendment_summary?: string | null;
  employees?: {
    id: string;
    forename: string;
    surname: string;
    department: string;
    email: string;
  };
}

export function SignedContractsList() {
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const { data: employees } = useEmployees();
  const [search, setSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const deleteDocument = useDeleteDocument();
  const queryClient = useQueryClient();

  const [amendmentTarget, setAmendmentTarget] = useState<ContractRow | null>(null);
  const [terminateTarget, setTerminateTarget] = useState<ContractRow | null>(null);
  const [openChainIds, setOpenChainIds] = useState<Set<string>>(new Set());

  const { data: contracts, isLoading } = useQuery({
    queryKey: ["all_contracts", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("employee_documents")
        .select(`*, employees ( id, forename, surname, department, email )`)
        .eq("tenant_id", tenantId)
        .eq("document_type", "contract")
        .order("version_number", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as ContractRow[];
    },
    enabled: !!tenantId,
  });

  // Group contracts by root_contract_id; current = highest version_number in chain.
  const chains = useMemo(() => {
    if (!contracts) return [];
    const byRoot = new Map<string, ContractRow[]>();
    for (const c of contracts) {
      const root = c.root_contract_id || c.id;
      const list = byRoot.get(root) || [];
      list.push(c);
      byRoot.set(root, list);
    }
    return Array.from(byRoot.entries()).map(([rootId, rows]) => {
      rows.sort((a, b) => (b.version_number ?? 1) - (a.version_number ?? 1));
      return { rootId, current: rows[0], all: rows };
    });
  }, [contracts]);

  const filtered = chains.filter(({ current }) => {
    const empName = `${current.employees?.forename} ${current.employees?.surname}`.toLowerCase();
    const docName = current.document_name.toLowerCase();
    return empName.includes(search.toLowerCase()) || docName.includes(search.toLowerCase());
  });

  const handleDownload = (id: string, variant: string) => {
    window.open(`/document/view?id=${id}&variant=${variant}`, "_blank");
  };

  const handleDelete = async (c: ContractRow) => {
    if (c.contract_state && ["signed", "superseded", "terminated"].includes(c.contract_state)) {
      toast({
        title: "Locked",
        description: "Signed contracts cannot be deleted. Create an amendment or terminate.",
        variant: "destructive",
      });
      return;
    }
    if (!confirm("Delete this draft contract?")) return;
    try {
      await deleteDocument.mutateAsync({ id: c.id, filePath: c.file_path });
      queryClient.invalidateQueries({ queryKey: ["all_contracts"] });
      toast({ title: "Deleted", description: "Draft contract removed." });
    } catch (err) {
      toast({ title: "Could not delete", description: (err as Error).message, variant: "destructive" });
    }
  };

  const toggleChain = (rootId: string) => {
    setOpenChainIds((prev) => {
      const next = new Set(prev);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return next;
    });
  };

  const activeEmployees = employees?.filter((e) => e.status === "active") || [];
  const selectedEmployee = activeEmployees.find((e) => e.id === selectedEmployeeId);

  return (
    <div className="space-y-4">
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

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl bg-card p-4 shadow-card animate-pulse">
              <div className="h-10 w-10 rounded-full bg-muted" />
            </div>
          ))}
        </div>
      ) : !filtered.length ? (
        <div className="rounded-xl bg-card shadow-card p-8 sm:p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-4">
            <Upload className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-base font-semibold mb-1">No contracts yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Generate a contract, get it signed, then upload it here for safekeeping.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(({ rootId, current, all }) => {
            const isMultiVersion = all.length > 1;
            const open = openChainIds.has(rootId);
            const state = current.contract_state || "draft";
            const isLocked = ["signed", "superseded", "terminated"].includes(state);
            const isSigned = state === "signed";

            return (
              <div
                key={rootId}
                className="rounded-xl bg-card shadow-card p-4 transition-all hover:shadow-elevated"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {current.employees?.forename?.[0]}
                      {current.employees?.surname?.[0]}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {current.employees?.forename} {current.employees?.surname}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground truncate">
                        {current.document_name}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${deptStyles[current.employees?.department || ""] || ""}`}
                      >
                        {current.employees?.department}
                      </Badge>
                      <ContractStateBadge state={state} />
                      {(current.version_number ?? 1) > 1 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          v{current.version_number}
                        </Badge>
                      )}
                      {isMultiVersion && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/50">
                          {all.length} versions
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(current.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {current.contract_send_status === "sent" && current.contract_sent_to && (
                        <span className="ml-2 text-amber-600">· Sent to {current.contract_sent_to}</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <ContractSigningActions
                      documentId={current.id}
                      employeeId={current.employees?.id || ""}
                      employeeName={`${current.employees?.forename} ${current.employees?.surname}`}
                      employeeEmail={current.employees?.email}
                      contractSendStatus={current.contract_send_status as never}
                      contractSentAt={current.contract_sent_at as never}
                      contractSentTo={current.contract_sent_to as never}
                      finalSignedFilePath={current.final_signed_pdf_url as never}
                      filePath={current.file_path}
                      documentName={current.document_name}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() =>
                        handleDownload(current.id, current.final_signed_pdf_url ? "final" : "original")
                      }
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {!isLocked && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(current)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Action row for signed contracts */}
                {isSigned && (
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setAmendmentTarget(current)}
                    >
                      <FilePlus2 className="h-3.5 w-3.5 mr-1" />
                      Create amendment
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-destructive hover:text-destructive"
                      onClick={() => setTerminateTarget(current)}
                    >
                      <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                      Terminate
                    </Button>
                  </div>
                )}

                {isMultiVersion && (
                  <Collapsible open={open} onOpenChange={() => toggleChain(rootId)} className="mt-3">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 text-xs w-full justify-start">
                        <History className="h-3.5 w-3.5 mr-1" />
                        Version history ({all.length})
                        <ChevronDown
                          className={`h-3.5 w-3.5 ml-auto transition-transform ${open ? "rotate-180" : ""}`}
                        />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">
                      <ContractVersionTimeline contractId={rootId} />
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            );
          })}
        </div>
      )}

      {amendmentTarget && (
        <CreateAmendmentDialog
          open={!!amendmentTarget}
          onOpenChange={(o) => !o && setAmendmentTarget(null)}
          previousContractId={amendmentTarget.id}
          previousContractName={amendmentTarget.document_name}
          employeeName={`${amendmentTarget.employees?.forename || ""} ${amendmentTarget.employees?.surname || ""}`}
        />
      )}
      {terminateTarget && (
        <TerminateContractDialog
          open={!!terminateTarget}
          onOpenChange={(o) => !o && setTerminateTarget(null)}
          contractId={terminateTarget.id}
          contractName={terminateTarget.document_name}
          employeeName={`${terminateTarget.employees?.forename || ""} ${terminateTarget.employees?.surname || ""}`}
        />
      )}
    </div>
  );
}
