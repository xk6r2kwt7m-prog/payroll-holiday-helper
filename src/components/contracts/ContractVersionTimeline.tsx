import { useContractVersionHistory } from "@/hooks/useContractAmendments";
import { ContractStateBadge } from "./ContractStateBadge";
import { amendmentTypeLabel } from "@/lib/contract-amendments";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  /** Any contract id in the chain — root or descendant. */
  contractId: string;
}

export function ContractVersionTimeline({ contractId }: Props) {
  const { data: versions, isLoading } = useContractVersionHistory(contractId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!versions?.length) {
    return <p className="text-xs text-muted-foreground">No contract history.</p>;
  }

  return (
    <ol className="space-y-3">
      {versions.map((v, idx) => {
        const row = v as Record<string, unknown>;
        const versionNumber = (row.version_number as number) ?? 1;
        const state = row.contract_state as string | null;
        const amendmentType = row.amendment_type as string | null;
        const amendmentSummary = row.amendment_summary as string | null;
        const finalSigned = row.final_signed_pdf_url as string | null;
        const isLast = idx === versions.length - 1;

        return (
          <li key={row.id as string} className="relative pl-6">
            <span
              className={`absolute left-0 top-2 h-3 w-3 rounded-full border-2 ${
                state === "signed"
                  ? "bg-primary border-primary"
                  : state === "issued"
                  ? "bg-warning border-warning"
                  : state === "terminated"
                  ? "bg-destructive border-destructive"
                  : "bg-background border-border"
              }`}
            />
            {!isLast && <span className="absolute left-[5px] top-5 bottom-[-12px] w-px bg-border" />}

            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">v{versionNumber}</span>
                  <ContractStateBadge state={state} />
                  {versionNumber === 1 && (
                    <span className="text-[10px] text-muted-foreground">Original</span>
                  )}
                </div>
                {finalSigned && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      window.open(`/document/view?id=${row.id}&variant=final`, "_blank")
                    }
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Signed PDF
                  </Button>
                )}
                {!finalSigned && (row.file_path as string) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      window.open(`/document/view?id=${row.id}&variant=original`, "_blank")
                    }
                  >
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    Draft PDF
                  </Button>
                )}
              </div>
              {versionNumber > 1 && (amendmentType || amendmentSummary) && (
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-medium">{amendmentTypeLabel(amendmentType)}:</span>{" "}
                  {amendmentSummary || "—"}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">
                Created{" "}
                {new Date(row.created_at as string).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                {row.effective_date && (
                  <>
                    {" · "}Effective{" "}
                    {new Date(row.effective_date as string).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </>
                )}
                {row.terminated_at && (
                  <>
                    {" · "}Terminated{" "}
                    {new Date(row.terminated_at as string).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </>
                )}
              </p>
              {row.terminated_reason ? (
                <p className="text-[10px] text-destructive mt-1">
                  Reason: {row.terminated_reason as string}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
