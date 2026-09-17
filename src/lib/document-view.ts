// Pure helpers for viewing stored contract documents.
// Kept free of browser APIs so they can be unit tested directly.

export type DocumentVariant = "original" | "final";

/**
 * The document page must never guess which version of a contract it wants.
 * Anything other than an explicit "final" means the original document.
 */
export function resolveVariant(raw: string | null | undefined): DocumentVariant {
  return raw === "final" ? "final" : "original";
}

export type DocumentLoadFailure =
  | "expired"
  | "not_found"
  | "auth_required"
  | "not_ready"
  | "network"
  | "server";

export interface DocumentLoadError {
  kind: DocumentLoadFailure;
  title: string;
  message: string;
  /** True when trying again is likely to work. */
  retryable: boolean;
  /** When the signed copy is missing, the original can still be read. */
  fallbackVariant?: DocumentVariant;
}

export function classifyLoadFailure(
  status: number | null,
  serverMessage?: string | null,
): DocumentLoadError {
  if (status === null) {
    return {
      kind: "network",
      title: "Connection problem",
      message:
        "The document could not be downloaded. Check your internet connection and try again — nothing has been lost.",
      retryable: true,
    };
  }
  if (status === 410) {
    return {
      kind: "expired",
      title: "This link has expired",
      message: "Ask your manager to send you a new link and you can carry on where you left off.",
      retryable: false,
    };
  }
  if (status === 401 || status === 403) {
    return {
      kind: "auth_required",
      title: "Please sign in again",
      message: "Your session has ended. Sign in and open the document again.",
      retryable: false,
    };
  }
  if (status === 409) {
    return {
      kind: "not_ready",
      title: "Signed copy still being prepared",
      message:
        "The completed signed copy is not ready yet. You can read the original contract below in the meantime.",
      retryable: true,
      fallbackVariant: "original",
    };
  }
  if (status === 404) {
    return {
      kind: "not_found",
      title: "Document not found",
      message: serverMessage || "This document is no longer available. Please contact your manager.",
      retryable: false,
    };
  }
  return {
    kind: "server",
    title: "Could not load the document",
    message: serverMessage || "Something went wrong loading the file. Trying again usually fixes it.",
    retryable: true,
  };
}

/** Momentary failures are retried; permanent ones are not. */
export function shouldRetry(error: DocumentLoadError, attempt: number, maxAttempts = 3): boolean {
  return error.retryable && error.kind !== "not_ready" && attempt < maxAttempts;
}

export function retryDelayMs(attempt: number): number {
  return Math.min(4000, 400 * 2 ** (attempt - 1));
}

/** Short reference shown on screen so a repeat failure is traceable. */
export function loadFailureReference(kind: DocumentLoadFailure, now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `DOC-${kind.toUpperCase().slice(0, 4)}-${stamp}`;
}
