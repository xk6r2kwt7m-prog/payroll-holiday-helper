import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText } from "lucide-react";
import { getFreshAccessToken } from "@/lib/authenticated-function";
import { PdfReader, fetchPdf } from "@/components/documents/PdfReader";
import { resolveVariant } from "@/lib/document-view";

export default function DocumentView() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const documentId = searchParams.get("id");
  const requestedVariant = resolveVariant(searchParams.get("variant"));

  // If the signed copy is not built yet we fall back to the original, clearly labelled.
  const [variant, setVariant] = useState(requestedVariant);
  const [fellBack, setFellBack] = useState(false);

  const load = useCallback(async () => {
    if (!token && !documentId) {
      throw Object.assign(new Error("No document reference provided"), { status: 404 });
    }
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const params = new URLSearchParams();
    if (token) params.set("token", token);
    if (documentId) params.set("id", documentId);
    params.set("variant", variant);

    const headers: Record<string, string> = {};
    if (documentId && !token) {
      headers["Authorization"] = `Bearer ${await getFreshAccessToken()}`;
    }

    const url = `https://${projectId}.supabase.co/functions/v1/serve-document?${params.toString()}`;
    try {
      return await fetchPdf(url, headers);
    } catch (err: any) {
      // Signed copy missing — read the original instead of hitting a dead end.
      if (err?.status === 409 && variant === "final") {
        params.set("variant", "original");
        const original = await fetchPdf(
          `https://${projectId}.supabase.co/functions/v1/serve-document?${params.toString()}`,
          headers,
        );
        setVariant("original");
        setFellBack(true);
        return original;
      }
      throw err;
    }
  }, [token, documentId, variant]);

  const notice = useMemo(
    () =>
      fellBack
        ? "The completed signed copy is still being prepared, so this is the original contract."
        : null,
    [fellBack],
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card px-4 py-3 flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <span className="font-medium text-sm text-foreground">
          {variant === "final" ? "Signed contract" : "Contract document"}
        </span>
      </header>

      <PdfReader load={load} notice={notice} fileName="contract.pdf" className="flex-1" />
    </div>
  );
}
