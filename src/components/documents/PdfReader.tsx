import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { AlertTriangle, Download, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  classifyLoadFailure,
  loadFailureReference,
  retryDelayMs,
  shouldRetry,
  type DocumentLoadError,
} from "@/lib/document-view";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface PdfFetchResult {
  blob: Blob;
}

export interface PdfFetchFailure {
  status: number | null;
  message?: string | null;
}

interface PdfReaderProps {
  /** Downloads the file. Throws a PdfFetchFailure-shaped object on failure. */
  load: () => Promise<Blob>;
  fileName?: string;
  /** Extra note shown above the pages (e.g. reading the original copy). */
  notice?: string | null;
  className?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Renders every page of a PDF as an image inside the page.
 * Phones and in-app browsers (WhatsApp, Gmail) refuse to scroll an embedded
 * PDF beyond the first page, so we draw the pages ourselves.
 */
export function PdfReader({ load, fileName = "contract.pdf", notice, className }: PdfReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<(DocumentLoadError & { reference: string }) | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [renderedPages, setRenderedPages] = useState(0);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const urlRef = useRef<string | null>(null);

  const render = useCallback(async (blob: Blob) => {
    const buffer = await blob.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    setPageCount(doc.numPages);

    const host = containerRef.current;
    if (!host) return;
    host.innerHTML = "";

    const width = Math.min(host.clientWidth || 720, 1100);
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const scale = (width / base.width) * Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = "100%";
      canvas.style.height = "auto";
      canvas.className = "block w-full rounded-md border border-border bg-white shadow-sm";
      canvas.setAttribute("aria-label", `Page ${n} of ${doc.numPages}`);
      host.appendChild(canvas);

      const ctx = canvas.getContext("2d");
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
      }
      setRenderedPages(n);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      setRenderedPages(0);

      let attempt = 0;
      while (!cancelled) {
        attempt += 1;
        try {
          const blob = await load();
          if (cancelled) return;
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          const url = URL.createObjectURL(blob);
          urlRef.current = url;
          setObjectUrl(url);
          await render(blob);
          if (!cancelled) setLoading(false);
          return;
        } catch (err: any) {
          const failure = classifyLoadFailure(
            typeof err?.status === "number" ? err.status : err?.status === null ? null : 500,
            err?.message,
          );
          if (shouldRetry(failure, attempt)) {
            await sleep(retryDelayMs(attempt));
            continue;
          }
          if (!cancelled) {
            setError({ ...failure, reference: loadFailureReference(failure.kind) });
            setLoading(false);
          }
          return;
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [load, render, reloadKey]);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  return (
    <div className={className}>
      {(notice || objectUrl) && (
        <div className="flex flex-col gap-2 border-b border-border bg-muted/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {notice ||
              (pageCount > 0
                ? `${pageCount} page${pageCount === 1 ? "" : "s"} — scroll to read all of it`
                : "Preparing the pages…")}
          </p>
          {objectUrl && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild>
                <a href={objectUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open
                </a>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={objectUrl} download={fileName}>
                  <Download className="h-4 w-4" />
                  Save a copy
                </a>
              </Button>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {pageCount > 0 ? `Preparing page ${renderedPages + 1} of ${pageCount}…` : "Loading the document…"}
          </p>
        </div>
      )}

      {error && (
        <div className="space-y-3 p-4 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
          <h3 className="text-base font-semibold text-foreground">{error.title}</h3>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          {error.retryable && (
            <Button size="sm" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          )}
          <p className="text-xs text-muted-foreground">Reference: {error.reference}</p>
        </div>
      )}

      <div
        ref={containerRef}
        className="flex flex-col gap-3 bg-muted/30 p-2 sm:p-3"
        style={{ display: error ? "none" : undefined }}
      />

      {!loading && !error && pageCount > 0 && (
        <p className="px-3 py-2 text-center text-xs text-muted-foreground">
          End of document — {pageCount} page{pageCount === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}

/** Fetch helper that throws the shape PdfReader expects. */
export async function fetchPdf(url: string, headers: Record<string, string> = {}): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch(url, { headers });
  } catch {
    throw Object.assign(new Error("Network request failed"), { status: null });
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body?.error || "Failed to load document"), { status: res.status });
  }
  return await res.blob();
}
