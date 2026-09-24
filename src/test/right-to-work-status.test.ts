import { describe, it, expect } from "vitest";
import {
  isRightToWorkCleared,
  rightToWorkFollowUp,
  type RtwDocument,
  type RtwOnboardingData,
  type RtwCheck,
} from "@/lib/right-to-work-status";

const mkDoc = (
  document_type: RtwDocument["document_type"],
  document_status: RtwDocument["document_status"]
): RtwDocument => ({ document_type, document_status });

const mkCheck = (
  result: RtwCheck["result"],
  opts: Partial<RtwCheck> = {}
): RtwCheck => ({
  result,
  ...opts,
});

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

  it("returns rejected when rtw_status is rejected and only a non-qualifying verified doc", () => {
    // non-qualifying document types don't count toward clearance
    const nonRtw = {
      document_type: "id_document" as unknown as RtwDocument["document_type"],
      document_status: "verified" as RtwDocument["document_status"],
    };
    expect(isRightToWorkCleared({ rtw_status: "rejected" }, [nonRtw])).toBe(
      "rejected"
    );
  });

  it("returns rejected when rtw_status is rejected and qualifying doc is expired", () => {
    // rejected status with no verified doc wins over "doc exists but not verified"
    expect(
      isRightToWorkCleared({ rtw_status: "rejected" }, [
        mkDoc("right_to_work", "expired"),
      ])
    ).toBe("rejected");
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

  // --- checks parameter ---
  describe("with checks", () => {
    const today = new Date("2026-09-24T12:00:00Z");

    it("returns cleared for an unlimited check", () => {
      expect(
        isRightToWorkCleared(null, [], [mkCheck("unlimited")], today)
      ).toBe("cleared");
    });

    it("returns cleared for a valid time-limited check (expiry today)", () => {
      expect(
        isRightToWorkCleared(
          null,
          [],
          [mkCheck("time_limited", { permission_expires_on: "2026-09-24" })],
          today
        )
      ).toBe("cleared");
    });

    it("returns cleared for a valid time-limited check (expiry in future)", () => {
      expect(
        isRightToWorkCleared(
          null,
          [],
          [mkCheck("time_limited", { permission_expires_on: "2026-12-01" })],
          today
        )
      ).toBe("cleared");
    });

    it("returns missing for an expired time-limited check", () => {
      expect(
        isRightToWorkCleared(
          null,
          [],
          [mkCheck("time_limited", { permission_expires_on: "2026-09-23" })],
          today
        )
      ).toBe("missing");
    });

    it("returns missing for a time-limited check with no permission_expires_on", () => {
      expect(
        isRightToWorkCleared(null, [], [mkCheck("time_limited")], today)
      ).toBe("missing");
    });

    it("returns rejected for a no_right_to_work check", () => {
      expect(
        isRightToWorkCleared(null, [], [mkCheck("no_right_to_work")], today)
      ).toBe("rejected");
    });

    it("uses only the latest check (by checked_on)", () => {
      const checks = [
        mkCheck("no_right_to_work", { checked_on: "2026-09-01" }),
        mkCheck("unlimited", { checked_on: "2026-09-15" }),
      ];
      expect(isRightToWorkCleared(null, [], checks, today)).toBe("cleared");
    });

    it("a newer check replacing an older one: unlimited supersedes no_right_to_work", () => {
      const checks = [
        mkCheck("no_right_to_work", { checked_on: "2026-08-01" }),
        mkCheck("unlimited", { checked_on: "2026-09-10" }),
      ];
      expect(isRightToWorkCleared(null, [], checks, today)).toBe("cleared");
    });

    it("two checks on the same date: later created_at wins", () => {
      const checks = [
        mkCheck("no_right_to_work", {
          checked_on: "2026-09-10",
          created_at: "2026-09-10T08:00:00Z",
        }),
        mkCheck("unlimited", {
          checked_on: "2026-09-10",
          created_at: "2026-09-10T10:00:00Z",
        }),
      ];
      expect(isRightToWorkCleared(null, [], checks, today)).toBe("cleared");
    });

    it("two checks on the same date: earlier created_at loses", () => {
      const checks = [
        mkCheck("unlimited", {
          checked_on: "2026-09-10",
          created_at: "2026-09-10T08:00:00Z",
        }),
        mkCheck("no_right_to_work", {
          checked_on: "2026-09-10",
          created_at: "2026-09-10T10:00:00Z",
        }),
      ];
      expect(isRightToWorkCleared(null, [], checks, today)).toBe("rejected");
    });

    it("checks override documents and onboarding data", () => {
      // even with approved onboarding + verified doc, a no_right_to_work check wins
      expect(
        isRightToWorkCleared(
          { rtw_status: "approved" },
          [mkDoc("passport", "verified")],
          [mkCheck("no_right_to_work", { checked_on: "2026-09-10" })],
          today
        )
      ).toBe("rejected");
    });

    it("no checks: existing behaviour unchanged (approved onboarding)", () => {
      expect(
        isRightToWorkCleared({ rtw_status: "approved" }, [], [], today)
      ).toBe("cleared");
    });

    it("no checks: existing behaviour unchanged (missing)", () => {
      expect(isRightToWorkCleared(null, [], [], today)).toBe("missing");
    });

    it("no checks: existing behaviour unchanged (pending)", () => {
      expect(
        isRightToWorkCleared({ rtw_status: "submitted" }, [], [], today)
      ).toBe("pending");
    });

    it("null checks treated as empty (existing behaviour)", () => {
      expect(isRightToWorkCleared(null, [], null, today)).toBe("missing");
    });
  });
});

describe("rightToWorkFollowUp", () => {
  const today = new Date("2026-09-24T12:00:00Z");

  it("returns null when checks is empty", () => {
    expect(rightToWorkFollowUp([], today)).toBeNull();
  });

  it("returns null when checks is null", () => {
    expect(rightToWorkFollowUp(null, today)).toBeNull();
  });

  it("returns null for an unlimited check", () => {
    expect(
      rightToWorkFollowUp([mkCheck("unlimited", { checked_on: "2026-09-10" })], today)
    ).toBeNull();
  });

  it("returns null for a no_right_to_work check", () => {
    expect(
      rightToWorkFollowUp([mkCheck("no_right_to_work", { checked_on: "2026-09-10" })], today)
    ).toBeNull();
  });

  it("returns follow-up for a time-limited check expiring in future", () => {
    const result = rightToWorkFollowUp(
      [mkCheck("time_limited", { checked_on: "2026-09-10", permission_expires_on: "2026-12-01" })],
      today
    );
    expect(result).not.toBeNull();
    expect(result!.dueOn).toBe("2026-12-01");
    expect(result!.daysLeft).toBe(68);
    expect(result!.overdue).toBe(false);
  });

  it("returns follow-up with overdue=true when expiry is in the past", () => {
    const result = rightToWorkFollowUp(
      [mkCheck("time_limited", { checked_on: "2026-09-10", permission_expires_on: "2026-09-20" })],
      today
    );
    expect(result).not.toBeNull();
    expect(result!.dueOn).toBe("2026-09-20");
    expect(result!.daysLeft).toBe(-4);
    expect(result!.overdue).toBe(true);
  });

  it("returns daysLeft=0 when expiry is today (not overdue)", () => {
    const result = rightToWorkFollowUp(
      [mkCheck("time_limited", { checked_on: "2026-09-10", permission_expires_on: "2026-09-24" })],
      today
    );
    expect(result).not.toBeNull();
    expect(result!.dueOn).toBe("2026-09-24");
    expect(result!.daysLeft).toBe(0);
    expect(result!.overdue).toBe(false);
  });

  it("uses only the latest check for follow-up", () => {
    const checks = [
      mkCheck("time_limited", { checked_on: "2026-08-01", permission_expires_on: "2026-08-31" }),
      mkCheck("unlimited", { checked_on: "2026-09-10" }),
    ];
    expect(rightToWorkFollowUp(checks, today)).toBeNull();
  });

  it("uses the latest time-limited check for follow-up", () => {
    const checks = [
      mkCheck("unlimited", { checked_on: "2026-08-01" }),
      mkCheck("time_limited", { checked_on: "2026-09-10", permission_expires_on: "2026-10-15" }),
    ];
    const result = rightToWorkFollowUp(checks, today);
    expect(result).not.toBeNull();
    expect(result!.dueOn).toBe("2026-10-15");
  });
});
