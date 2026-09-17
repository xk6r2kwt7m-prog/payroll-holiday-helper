import { describe, it, expect } from "vitest";
import {
  isFrontOfHouse,
  alcoholAskState,
  alcoholAskStateLabel,
  needsAlcoholAsk,
  staffNeedingAlcoholAsk,
  shouldAutoAskAlcohol,
} from "@/lib/alcohol-automation";

const staff = (over: Partial<Parameters<typeof needsAlcoholAsk>[0]> = {}) => ({
  id: "e1",
  forename: "Ana",
  surname: "Silva",
  email: "ana@example.com",
  job_title: "Waitress",
  branch: "Fitzrovia",
  status: "active",
  ...over,
});

describe("front of house detection", () => {
  it("recognises service roles", () => {
    ["Waiter", "Bartender", "Bar Supervisor", "Host", "Front of House Team Member", "Runner", "Barista"]
      .forEach((t) => expect(isFrontOfHouse(t)).toBe(true));
  });

  it("leaves kitchen roles out", () => {
    ["Chef de Partie", "Head Chef", "Kitchen Porter", "Commis Chef", "Cleaner"]
      .forEach((t) => expect(isFrontOfHouse(t)).toBe(false));
  });

  it("uses the department when the title says little", () => {
    expect(isFrontOfHouse("Team Member", "Front of House")).toBe(true);
    expect(isFrontOfHouse("Team Member", "Kitchen")).toBe(false);
  });

  it("keeps a kitchen bar role in", () => {
    expect(isFrontOfHouse("Bar and Kitchen Assistant")).toBe(true);
  });

  it("says no when nothing is recorded", () => {
    expect(isFrontOfHouse(null, null)).toBe(false);
  });
});

describe("where someone stands", () => {
  it("is authorised once approved", () => {
    expect(alcoholAskState("e1", [], [{ employee_id: "e1", status: "approved" }])).toBe("authorised");
  });

  it("ignores a revoked authorisation", () => {
    const state = alcoholAskState("e1", [], [
      { employee_id: "e1", status: "approved", revoked_at: "2026-01-01" },
    ]);
    expect(state).toBe("not_asked");
  });

  it("waits for approval after signing", () => {
    expect(alcoholAskState("e1", [{ employee_id: "e1", status: "signed" }], [])).toBe("awaiting_approval");
  });

  it("waits for the signature while the link is live", () => {
    expect(alcoholAskState("e1", [{ employee_id: "e1", status: "sent", expires_at: "2099-01-01" }], []))
      .toBe("awaiting_signature");
  });

  it("treats an expired unsigned link as not asked", () => {
    expect(alcoholAskState("e1", [{ employee_id: "e1", status: "sent", expires_at: "2020-01-01" }], []))
      .toBe("not_asked");
  });

  it("shows when someone said they are not ready", () => {
    expect(alcoholAskState("e1", [{ employee_id: "e1", status: "declined" }], [])).toBe("declined");
  });

  it("ignores test sends", () => {
    expect(alcoholAskState("e1", [{ employee_id: "e1", status: "sent", is_test_record: true, expires_at: "2099-01-01" }], []))
      .toBe("not_asked");
  });

  it("labels every state in plain words", () => {
    (["authorised", "awaiting_approval", "awaiting_signature", "declined", "not_asked"] as const)
      .forEach((s) => expect(alcoholAskStateLabel(s).length).toBeGreaterThan(4));
  });
});

describe("who to ask", () => {
  it("skips leavers, archived, test records and anyone with no email", () => {
    expect(needsAlcoholAsk(staff({ status: "leaver" }), [], [])).toBe(false);
    expect(needsAlcoholAsk(staff({ archived_at: "2026-01-01" }), [], [])).toBe(false);
    expect(needsAlcoholAsk(staff({ is_test_record: true }), [], [])).toBe(false);
    expect(needsAlcoholAsk(staff({ email: null }), [], [])).toBe(false);
    expect(needsAlcoholAsk(staff(), [], [])).toBe(true);
  });

  it("never asks twice while a link is open", () => {
    const open = [{ employee_id: "e1", status: "sent", expires_at: "2099-01-01" }];
    expect(needsAlcoholAsk(staff(), open, [])).toBe(false);
  });

  it("asks again after someone declined", () => {
    expect(needsAlcoholAsk(staff(), [{ employee_id: "e1", status: "declined" }], [])).toBe(true);
  });

  it("lists front-of-house staff at one site in name order", () => {
    const people = [
      staff({ id: "b", forename: "Zoe", surname: "Adams", job_title: "Bartender" }),
      staff({ id: "a", forename: "Ana", surname: "Silva", job_title: "Waitress" }),
      staff({ id: "c", forename: "Kim", surname: "Lee", job_title: "Head Chef" }),
      staff({ id: "d", forename: "Sam", surname: "Ng", job_title: "Waiter", branch: "Brixton" }),
    ];
    const out = staffNeedingAlcoholAsk(people, [], [], { branch: "Fitzrovia" });
    expect(out.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("can include every role when asked to", () => {
    const people = [staff({ id: "c", job_title: "Head Chef" })];
    expect(staffNeedingAlcoholAsk(people, [], [], { branch: "Fitzrovia" })).toHaveLength(0);
    expect(
      staffNeedingAlcoholAsk(people, [], [], { branch: "Fitzrovia", includeAllRoles: true })
    ).toHaveLength(1);
  });
});

describe("automatic sending", () => {
  it("is off unless switched on", () => {
    expect(shouldAutoAskAlcohol(null)).toBe(false);
    expect(shouldAutoAskAlcohol({})).toBe(false);
    expect(shouldAutoAskAlcohol({ auto_alcohol_authorisation: true })).toBe(true);
  });
});
