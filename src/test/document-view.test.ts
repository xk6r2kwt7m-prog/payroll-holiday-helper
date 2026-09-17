import { describe, it, expect } from "vitest";
import {
  classifyLoadFailure,
  loadFailureReference,
  resolveVariant,
  retryDelayMs,
  shouldRetry,
} from "@/lib/document-view";

describe("resolveVariant", () => {
  it("only treats an explicit final as the signed copy", () => {
    expect(resolveVariant("final")).toBe("final");
    expect(resolveVariant("original")).toBe("original");
    expect(resolveVariant(null)).toBe("original");
    expect(resolveVariant(undefined)).toBe("original");
    expect(resolveVariant("")).toBe("original");
    expect(resolveVariant("FINAL")).toBe("original");
  });
});

describe("classifyLoadFailure", () => {
  it("offers the original when the signed copy is not built", () => {
    const e = classifyLoadFailure(409);
    expect(e.kind).toBe("not_ready");
    expect(e.fallbackVariant).toBe("original");
  });

  it("treats an expired link as permanent", () => {
    expect(classifyLoadFailure(410).retryable).toBe(false);
  });

  it("asks for sign-in on auth failures", () => {
    expect(classifyLoadFailure(401).kind).toBe("auth_required");
    expect(classifyLoadFailure(403).kind).toBe("auth_required");
  });

  it("marks connection problems retryable", () => {
    const e = classifyLoadFailure(null);
    expect(e.kind).toBe("network");
    expect(e.retryable).toBe(true);
  });

  it("keeps the server message for a missing document", () => {
    expect(classifyLoadFailure(404, "Document not found").message).toContain("not found");
  });
});

describe("retry policy", () => {
  it("retries momentary failures up to three attempts", () => {
    const net = classifyLoadFailure(null);
    expect(shouldRetry(net, 1)).toBe(true);
    expect(shouldRetry(net, 2)).toBe(true);
    expect(shouldRetry(net, 3)).toBe(false);
  });

  it("never retries permanent failures", () => {
    expect(shouldRetry(classifyLoadFailure(410), 1)).toBe(false);
    expect(shouldRetry(classifyLoadFailure(404), 1)).toBe(false);
  });

  it("does not loop on a missing signed copy", () => {
    expect(shouldRetry(classifyLoadFailure(409), 1)).toBe(false);
  });

  it("backs off between attempts", () => {
    expect(retryDelayMs(1)).toBe(400);
    expect(retryDelayMs(2)).toBe(800);
    expect(retryDelayMs(3)).toBe(1600);
    expect(retryDelayMs(9)).toBeLessThanOrEqual(4000);
  });
});

describe("loadFailureReference", () => {
  it("produces a traceable reference", () => {
    const ref = loadFailureReference("network", new Date("2026-09-17T14:05:00Z"));
    expect(ref).toBe("DOC-NETW-20260917140500");
  });
});
