import { describe, it, expect } from "vitest";
import {
  evaluateContractSend,
  normaliseSendMode,
} from "@/lib/contract-send-rules";

const NOW = new Date("2026-09-16T09:00:00Z");

describe("contract send rules", () => {
  it("allows sending immediately in manual mode", () => {
    const r = evaluateContractSend({ mode: "manual", employerSigned: false, now: NOW });
    expect(r.canSend).toBe(true);
    expect(r.reason).toBeNull();
  });

  it("blocks sending until the employer has signed when policy requires it", () => {
    const r = evaluateContractSend({
      mode: "after_employer_signs",
      employerSigned: false,
      now: NOW,
    });
    expect(r.canSend).toBe(false);
    expect(r.reason).toBe("employer_signature_required");
  });

  it("allows sending once the employer has signed", () => {
    const r = evaluateContractSend({
      mode: "after_employer_signs",
      employerSigned: true,
      now: NOW,
    });
    expect(r.canSend).toBe(true);
  });

  it("holds a contract scheduled for a future date", () => {
    const r = evaluateContractSend({
      mode: "manual",
      employerSigned: true,
      scheduledSendAt: "2026-09-20T08:00:00Z",
      now: NOW,
    });
    expect(r.canSend).toBe(false);
    expect(r.reason).toBe("scheduled_for_later");
    expect(r.scheduledPending).toBe(true);
    expect(r.scheduledDue).toBe(false);
  });

  it("releases a contract whose scheduled date has arrived", () => {
    const r = evaluateContractSend({
      mode: "manual",
      employerSigned: true,
      scheduledSendAt: "2026-09-16T08:00:00Z",
      now: NOW,
    });
    expect(r.canSend).toBe(true);
    expect(r.scheduledDue).toBe(true);
  });

  it("employer signature requirement outranks a due schedule", () => {
    const r = evaluateContractSend({
      mode: "after_employer_signs",
      employerSigned: false,
      scheduledSendAt: "2026-09-01T08:00:00Z",
      now: NOW,
    });
    expect(r.reason).toBe("employer_signature_required");
  });

  it("ignores invalid schedule values", () => {
    const r = evaluateContractSend({
      mode: "manual",
      employerSigned: false,
      scheduledSendAt: "not-a-date",
      now: NOW,
    });
    expect(r.canSend).toBe(true);
    expect(r.scheduledPending).toBe(false);
  });

  it("defaults unknown modes to manual", () => {
    expect(normaliseSendMode(null)).toBe("manual");
    expect(normaliseSendMode("weird")).toBe("manual");
    expect(normaliseSendMode("after_employer_signs")).toBe("after_employer_signs");
  });
});
