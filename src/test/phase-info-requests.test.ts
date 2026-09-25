import { describe, it, expect } from "vitest";
import {
  expandRequestedFields,
  sectionsForItems,
  documentKindForItems,
  needsDocumentUpload,
  describeRequestedItems,
  INFO_PRESETS,
  INFO_ITEM_KEYS,
} from "@/lib/info-request-items";
import { buildPortalSteps } from "@/pages/StaffDetailsPortal";
import { infoRequestState, type EmployeeInfoRequest } from "@/hooks/useInfoRequests";

const day = 86400000;

describe("requested items", () => {
  it("keeps old four-section requests working by expanding them", () => {
    const items = expandRequestedFields(["personal", "rtw"]);
    expect(items).toContain("legal_name");
    expect(items).toContain("address");
    expect(items).toContain("visa");
    expect(items).not.toContain("bank");
  });

  it("passes item keys straight through and ignores unknown values", () => {
    expect(expandRequestedFields(["visa", "nonsense"])).toEqual(["visa"]);
  });

  it("never repeats an item when sections and items are mixed", () => {
    expect(expandRequestedFields(["personal", "address"]).filter((k) => k === "address")).toHaveLength(1);
  });

  it("maps items back to the sections answers are stored in", () => {
    expect(sectionsForItems(["visa"])).toEqual(["rtw"]);
    expect(sectionsForItems(["bank", "emergency"])).toEqual(["bank", "emergency"]);
    expect(sectionsForItems(["address", "dob"])).toEqual(["personal"]);
  });

  it("files the upload as the document that was asked for", () => {
    expect(documentKindForItems(["visa", "passport"])).toBe("visa");
    expect(documentKindForItems(["passport"])).toBe("passport");
    expect(documentKindForItems(["share_code"])).toBe("right_to_work");
    expect(needsDocumentUpload(["address"])).toBe(false);
    expect(needsDocumentUpload(["share_code"])).toBe(true);
  });

  it("describes a request in plain words for emails and lists", () => {
    expect(describeRequestedItems(["email", "phone"])).toBe("Email address, Mobile number");
  });

  it("only offers presets made of real items", () => {
    for (const preset of INFO_PRESETS) {
      for (const item of preset.items) expect(INFO_ITEM_KEYS).toContain(item);
    }
  });
});

describe("staff form shows only what was asked", () => {
  it("asks a right-to-work refresh for nothing else", () => {
    const steps = buildPortalSteps(expandRequestedFields(["nationality", "visa"]));
    const ids = steps.map((s) => s.id);
    expect(ids).toEqual(["rtw_status", "rtw_doc"]);
    expect(ids).not.toContain("bank");
  });

  it("asks for an expiry date whenever a document is requested", () => {
    const doc = buildPortalSteps(["visa"]).find((s) => s.id === "rtw_doc")!;
    expect(doc.upload).toBe(true);
    expect(doc.fields.some((f) => f.key === "expires_at")).toBe(true);
  });

  it("still asks bank details twice and never stores the second answer", () => {
    const steps = buildPortalSteps(["bank"]);
    const confirmFields = steps.flatMap((s) => s.fields).filter((f) => f.confirmOnly);
    expect(confirmFields.map((f) => f.key)).toEqual(["confirm_sort_code", "confirm_account_number"]);
  });

  it("leaves the National Insurance number optional", () => {
    const ni = buildPortalSteps(["ni_number"])[0].fields.find(f => f.key === "ni_number")!;
    expect(ni.required).toBeUndefined();
  });

  it("builds the full new-starter journey from every item", () => {
    const ids = buildPortalSteps([...INFO_ITEM_KEYS]).map((s) => s.id);
    expect(ids).toEqual(["name", "dob_phone", "email", "address", "ni", "rtw_status", "rtw_doc", "bank", "bank_account", "emergency"]);
  });

  it("asks for nothing when nothing was ticked", () => {
    expect(buildPortalSteps([])).toHaveLength(0);
  });
});

const request = (over: Partial<EmployeeInfoRequest> = {}): EmployeeInfoRequest => ({
  id: "r1",
  employee_id: "e1",
  requested_fields: ["visa"],
  recipient_email: "a@b.com",
  requested_by_name: "Manager",
  status: "sent",
  request_kind: "existing_staff_update",
  preset: "right_to_work",
  sent_at: new Date(Date.now() - day).toISOString(),
  opened_at: null,
  submitted_at: null,
  token_expires_at: new Date(Date.now() + 6 * day).toISOString(),
  rtw_uploaded_count: 0,
  reminder_count: 0,
  last_reminder_at: null,
  cancelled_at: null,
  ...over,
});

describe("tracking what was sent", () => {
  it("reports a truthful state for each link", () => {
    expect(infoRequestState(request())).toBe("waiting");
    expect(infoRequestState(request({ opened_at: new Date().toISOString() }))).toBe("opened");
    expect(infoRequestState(request({ submitted_at: new Date().toISOString() }))).toBe("completed");
    expect(infoRequestState(request({ status: "revoked", cancelled_at: new Date().toISOString() }))).toBe("cancelled");
    expect(infoRequestState(request({ token_expires_at: new Date(Date.now() - day).toISOString() }))).toBe("expired");
  });

  it("counts a completed request as completed even if it also expired", () => {
    const r = request({
      submitted_at: new Date().toISOString(),
      token_expires_at: new Date(Date.now() - day).toISOString(),
    });
    expect(infoRequestState(r)).toBe("completed");
  });
});
