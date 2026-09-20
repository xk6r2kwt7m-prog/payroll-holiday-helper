import { describe, expect, it } from "vitest";
import {
  ALL_SITES_BRANCH,
  buildDpsAuthorisationAllSites,
  groupAwaitingConfirmation,
  isGroupReadyToSend,
  withAdditionalSites,
  buildStaffAlcoholAuthorisation,
  type LicenceSite,
} from "@/lib/licensing-documents";

const site = (branch: string, over: Partial<LicenceSite> = {}): LicenceSite => ({
  branch,
  premises_name: `Ugly Dumpling ${branch}`,
  premises_address: `1 ${branch} Street, London`,
  licence_number: `LIC-${branch}`,
  licence_holder: "Ugly Dumpling Ltd",
  issuing_authority: "Westminster City Council",
  dps_name: "Sam Reed",
  dps_personal_licence_number: "PL-123",
  ...over,
});

const sites = [site("Carnaby"), site("Brixton"), site("Fitzrovia")];

describe("one DPS signature covering every site", () => {
  it("names all three premises and their licence numbers", () => {
    const doc = buildDpsAuthorisationAllSites(sites, null);
    const text = JSON.stringify(doc);
    for (const b of ["Carnaby", "Brixton", "Fitzrovia"]) {
      expect(text).toContain(b);
      expect(text).toContain(`LIC-${b}`);
    }
    expect(doc.title).toContain("ALL PREMISES");
  });

  it("is a standing authorisation, so it survives people joining and leaving", () => {
    const doc = buildDpsAuthorisationAllSites(sites, null);
    expect(JSON.stringify(doc.paragraphs).toLowerCase()).toContain("withdrawn in writing");
  });

  it("holds the send back until every site's licence details are confirmed", () => {
    const incomplete = [site("Carnaby"), site("Brixton", { licence_number: "" })];
    expect(isGroupReadyToSend(incomplete)).toBe(false);
    expect(groupAwaitingConfirmation(incomplete).join(" ")).toContain("Brixton");
    expect(isGroupReadyToSend(sites)).toBe(true);
    expect(groupAwaitingConfirmation(sites)).toEqual([]);
  });

  it("never treats no sites at all as ready", () => {
    expect(isGroupReadyToSend([])).toBe(false);
  });

  it("uses a single reserved label rather than a real branch name", () => {
    expect(ALL_SITES_BRANCH).toBe("All sites");
    expect(sites.map((s) => s.branch)).not.toContain(ALL_SITES_BRANCH);
  });
});

describe("staff who work at more than one site sign once", () => {
  it("adds the other premises to their authorisation without changing the wording", () => {
    const base = buildStaffAlcoholAuthorisation(site("Carnaby"), "Rehana Raman", "2026-02-01");
    const extended = withAdditionalSites(base, ["Ugly Dumpling Brixton"]);
    expect(extended.paragraphs.slice(0, base.paragraphs.length)).toEqual(base.paragraphs);
    expect(JSON.stringify(extended)).toContain("Ugly Dumpling Brixton");
    expect(JSON.stringify(extended).toLowerCase()).toContain("only need to sign once");
  });

  it("leaves a single-site authorisation exactly as it was", () => {
    const base = buildStaffAlcoholAuthorisation(site("Carnaby"), "Rehana Raman", "2026-02-01");
    expect(withAdditionalSites(base, [])).toEqual(base);
    expect(withAdditionalSites(base, ["", "  "])).toEqual(base);
  });
});
