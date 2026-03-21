import { useState } from "react";
import { Upload, Download, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

interface PayrollSourceInfoProps {
  periodId: string;
}

export function PayrollSourceInfo({ periodId }: PayrollSourceInfoProps) {
  const { tenantId } = useTenant();
  const [downloading, setDownloading] = useState(false);

  const { data: importRecord } = useQuery({
    queryKey: ["payroll_import", periodId, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_imports")
        .select("*")
        .eq("payroll_period_id", periodId)
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!periodId && !!tenantId,
  });

  if (!importRecord) return null;

  const handleDownload = async () => {
    if (!importRecord.file_path) {
      toast.error("Original timesheet file is not available for this import.");
      return;
    }

    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from("payroll-files")
        .createSignedUrl(importRecord.file_path, 300); // 5 min

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || "Failed to generate download link");
      }

      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = importRecord.file_name || "timesheet.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Failed to download original timesheet");
    } finally {
      setDownloading(false);
    }
  };

  const importDate = importRecord.created_at
    ? new Date(importRecord.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unknown";

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground rounded-lg bg-muted/30 border border-border/50 px-3 py-2">
      <Upload className="h-3 w-3 shrink-0" />
      <span>
        Source: <strong className="text-foreground">Manual timesheet upload</strong>
      </span>
      <span className="text-border">·</span>
      <span>{importRecord.file_name || "CSV"}</span>
      <span className="text-border">·</span>
      <span>{importDate}</span>
      <span className="text-border">·</span>
      <Badge variant="secondary" className="text-[10px] h-4">
        {importRecord.records_imported ?? "?"} employees
      </Badge>
      {importRecord.file_path ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs ml-auto"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <Download className="h-3 w-3 mr-1" />
          )}
          Download original
        </Button>
      ) : (
        <span className="ml-auto text-warning text-[10px] flex items-center gap-1">
          <FileText className="h-3 w-3" />
          Original file not stored
        </span>
      )}
    </div>
  );
}
