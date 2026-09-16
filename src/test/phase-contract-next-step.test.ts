import { describe, it, expect } from "vitest";
import { resolveContractNextStep } from "@/lib/contract-next-step";

const base = {
  employeeSigned: false,
  employerSigned: false,
  sent: false,
  employeeName: "Rafaela",
};

describe("resolveContractNextStep", () => {
  it("asks to send an unsent draft", () => {
    const r = resolveContractNextStep(base);
    expect(r.stage).toBe("draft");
    expect(r.action).toBe("send");
    expect(r.tone).toBe("action");
  });

  it("waits for the employee once sent", () => {
    const r = resolveContractNextStep({ ...base, sent: true });
    expect(r.stage).toBe("sent");
    expect(r.action).toBe("remind");
    expect(r.tone).toBe("waiting");
  });

  it("shows a future scheduled send date instead of a draft prompt", () => {
    const r = resolveContractNextStep({
      ...base,
      scheduledSendAt: "2026-12-01T09:00:00Z",
      now: new Date("2026-09-16T00:00:00Z"),
    });
    expect(r.stage).toBe("scheduled");
    expect(r.label).toContain("Scheduled to send");
  });

  it("falls through to draft when the scheduled date has passed", () => {
    const r = resolveContractNextStep({
      ...base,
      scheduledSendAt: "2026-01-01T09:00:00Z",
      now: new Date("2026-09-16T00:00:00Z"),
    });
    expect(r.stage).toBe("draft");
  });

  it("prompts the admin to countersign after the employee signs", () => {
    const r = resolveContractNextStep({ ...base, employeeSigned: true, sent: true });
    expect(r.stage).toBe("employee_signed");
    expect(r.action).toBe("countersign");
    expect(r.label).toContain("Rafaela");
  });

  it("waits for the employee when only the employer signed", () => {
    const r = resolveContractNextStep({ ...base, employerSigned: true });
    expect(r.stage).toBe("employer_signed");
    expect(r.action).toBe("remind");
  });

  it("asks to send the signed copy when fully signed", () => {
    const r = resolveContractNextStep({ ...base, employeeSigned: true, employerSigned: true });
    expect(r.stage).toBe("fully_signed");
    expect(r.action).toBe("send_signed_copy");
    expect(r.tone).toBe("action");
  });

  it("reports done once the signed copy was sent", () => {
    const r = resolveContractNextStep({
      ...base,
      employeeSigned: true,
      employerSigned: true,
      signedCopySent: true,
    });
    expect(r.tone).toBe("done");
    expect(r.label).toContain("signed copy sent");
  });

  it("treats terminated and superseded contracts as closed", () => {
    expect(resolveContractNextStep({ ...base, contractState: "terminated" }).stage).toBe("locked");
    expect(resolveContractNextStep({ ...base, contractState: "superseded" }).stage).toBe("locked");
  });
});
