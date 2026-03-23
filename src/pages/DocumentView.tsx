import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Loader2, AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DocumentView() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const documentId = searchParams.get("id");
  const variant = searchParams.get("variant") || "final";

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDocument() {
      setLoading(true);
      setError(null);

      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const params = new URLSearchParams();
        if (token) params.set("token", token);
        if (documentId) params.set("id", documentId);
        params.set("variant", variant);

        const headers: Record<string, string> = {};

        // If accessing by document ID (authenticated), include auth token
        if (documentId && !token) {
          const { supabase } = await import("@/integrations/supabase/client");
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            headers["Authorization"] = `Bearer ${session.access_token}`;
          }
        }

        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/serve-document?${params.toString()}`,
          { headers }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Failed to load document" }));
          throw new Error(body.error || "Failed to load document");
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (err: any) {
        setError(err.message || "Could not load document");
      } finally {
        setLoading(false);
      }
    }

    if (token || documentId) {
      loadDocument();
    } else {
      setError("No document reference provided");
      setLoading(false);
    }

    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [token, documentId, variant]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground text-sm">Loading document…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3 max-w-md px-6">
          <AlertTriangle className="h-10 w-10 mx-auto text-destructive" />
          <h2 className="text-lg font-semibold text-foreground">Unable to load document</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <span className="font-medium text-sm text-foreground">Contract Document</span>
        </div>
        {pdfUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={pdfUrl} download="contract.pdf">
              <Download className="h-4 w-4 mr-1" />
              Download
            </a>
          </Button>
        )}
      </header>
      <div className="flex-1">
        {pdfUrl && (
          <iframe
            src={pdfUrl}
            className="w-full h-[calc(100vh-57px)] border-0"
            title="Contract Document"
          />
        )}
      </div>
    </div>
  );
}
