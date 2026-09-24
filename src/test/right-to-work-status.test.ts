import { describe, it, expect } from "vitest";
import {
  isRightToWorkCleared,
  type RtwDocument,
  type RtwOnboardingData,
} from "@/lib/right-to-work-status";

const mkDoc = (
  document_type: RtwDocument["document_type"],
  document_status: RtwDocument["document_status"]
): RtwDocument => ({ document_type, document_status });

describe("isRightToWorkCleared", () => {
  // --- cleared ---
  it("returns cleared when rtw_status is approved with no documents", () => {
    expect(isRightToWorkCleared({ rtw_status: "approved" }, [])).toBe("cleared");
  });

  it("returns cleared when rtw_status is approved and documents is null", () => {
    expect(isRightToWorkCleared({ rtw_status: "approved" }, null)).toBe("cleared");
  });

  it("returns cleared when a verified passport exists, rtw_status not_submitted", () => {
    expect(
      isRightToWorkCleared({ rtw_status: "not_submitted" }, [
        mkDoc("passport", "verified"),
      ])
    ).toBe("cleared");
  });

  it("returns cleared when a verified right_to_work exists, no onboarding record", () => {
    expect(isRightToWorkCleared(null, [mkDoc("right_to_work", "verified")])).toBe(
      "cleared"
    );
  });

  it("returns cleared when a verified visa exists, rtw_status rejected", () => {
    // verified document wins over rejected status
    expect(
      isRightToWorkCleared({ rtw_status: "rejected" }, [
        mkDoc("visa", "verified"),
      ])
    ).toBe("cleared");
  });

  it("returns cleared when a verified biometric_residence_permit exists", () => {
    expect(
      isRightToWorkCleared({ rtw_status: "not_submitted" }, [
        mkDoc("biometric_residence_permit", "verified"),
      ])
    ).toBe("cleared");
  });

  // --- rejected ---
  it("returns rejected when rtw_status is rejected and no qualifying document is verified", () => {
    expect(
      isRightToWorkCleared({ rtw_status: "rejected" }, [
        mkDoc("passport", "pending"),
      ])
    ).toBe("rejected");
  });

  it("returns rejected when rtw_status is rejected and no documents", () => {
    expect(isRightToWorkCleared({ rtw_status: "rejected" }, [])).toBe("rejected");
  });

  it("returns rejected when rtw_status is rejected and a non-RTW document is verified", () => {
    // non-qualifying document types don't count
    expect(
      isRightToWorkCleared({ rtw_status: "rejected" }, [
        mkDoc("passport", "verified") as unknown as RtwDocument,
      ])
    ).toBe("cleared"); // passport qualifies, so this is cleared, not rejected
  });

  it("returns rejected when rtw_status is rejected and qualifying doc is expired", () => {
    expect(
      isRightToWorkCleared({ rtw_status: "rejected" }, [
        mkDoc("right_to_work", "expired"),
      ])
    ).toBe("pending"); // pending because a qualifying doc exists but isn't verified
  });

  // --- pending ---
  it("returns pending when rtw_status is submitted with no documents", () => {
    expect(isRightToWorkCleared({ rtw_status: "submitted" }, [])).toBe("pending");
  });

  it("returns pending when rtw_status is pending_review with no documents", () => {
    expect(
      isRightToWorkCleared({ rtw_status: "pending_review" }, [])
    ).toBe("pending");
  });

  it("returns pending when a qualifying document exists but isn't verified", () => {
    expect(
      isRightToWorkCleared({ rtw_status: "not_submitted" }, [
        mkDoc("passport", "pending"),
      ])
    ).toBe("pending");
  });

  it("returns pending when qualifying document is rejected", () => {
    expect(
      isRightToWorkCleared(null, [mkDoc("visa", "rejected")])
    ).toBe("pending");
  });

  it("returns pending when qualifying document is expired", () => {
    expect(
      isRightToWorkCleared({ rtw_status: "not_submitted" }, [
        mkDoc("biometric_residence_permit", "expired"),
      ])
    ).toBe("pending");
  });

  // --- missing ---
  it("returns missing when no onboarding record and no documents", () => {
    expect(isRightToWorkCleared(null, [])).toBe("missing");
  });

  it("returns missing when rtw_status is not_submitted and no documents", () => {
    expect(
      isRightToWorkCleared({ rtw_status: "not_submitted" }, [])
    ).toBe("missing");
  });

  it("returns missing when onboardingData is undefined", () => {
    expect(isRightToWorkCleared(undefined, undefined)).toBe("missing");
  });

  it("returns missing when rtw_status is null and no documents", () => {
    expect(isRightToWorkCleared({ rtw_status: null }, [])).toBe("missing");
  });

  // --- non-qualifying documents don't affect result ---
  it("returns missing when only non-qualifying documents exist", () => {
    const nonRtw = {
      document_type: "id_document" as unknown as RtwDocument["document_type"],
      document_status: "verified" as RtwDocument["document_status"],
    };
    expect(isRightToWorkCleared(null, [nonRtw])).toBe("missing");
  });

  it("returns rejected when rtw_status rejected and only non-qualifying verified doc", () => {
    const nonRtw = {
      document_type: "id_document" as unknown as RtwDocument["document_type"],
      document_status: "verified" as RtwDocument["document_status"],
    };
    expect(isRightToWorkCleared({ rtw_status: "rejected" }, [nonRtw])).toBe(
      "rejected"
    );
  });

  // --- mixed documents ---
  it("returns cleared when one qualifying doc verified among others", () => {
    expect(
      isRightToWorkCleared({ rtw_status: "not_submitted" }, [
        mkDoc("passport", "pending"),
        mkDoc("visa", "verified"),
        mkDoc("right_to_work", "rejected"),
      ])
    ).toBe("cleared");
  });

  it("returns pending when multiple qualifying docs exist, none verified", () => {
    expect(
      isRightToWorkCleared({ rtw_status: "submitted" }, [
        mkDoc("passport", "pending"),
        mkDoc("visa", "expired"),
      ])
    ).toBe("pending");
  });
});
