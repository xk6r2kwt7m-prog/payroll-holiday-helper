import { describe, it, expect } from "vitest";
import {
  UD_SITES, JULY_2026_MENU_AVAILABILITY, NOT_ON_JULY_2026_MENUS,
  menuSitesForDish, resolveSiteBranchIds,
} from "@/data/allergen/ud-july-2026-menus";
import { DRAFT_DISH_LINES } from "@/data/allergen/ud-allergen-draft";
import { canScoreDishQuestion } from "@/lib/allergen-sources";

describe("July 2026 customer menus", () => {
  it("has exactly three sites", () => {
    expect([...UD_SITES]).toEqual(["Carnaby", "Brixton", "Fitzrovia"]);
  });

  it("never lists a site outside the three", () => {
    for (const sites of Object.values(JULY_2026_MENU_AVAILABILITY)) {
      for (const s of sites) expect(UD_SITES).toContain(s);
    }
  });

  it("keeps Brixton-only flavours to Brixton", () => {
    expect(menuSitesForDish("Curry Goat")).toEqual(["Brixton"]);
    expect(menuSitesForDish("Corn Fritters")).toEqual(["Brixton"]);
    expect(menuSitesForDish("Biscoff Banana")).toEqual(["Brixton"]);
    expect(menuSitesForDish("Lamb & Harissa")).toEqual(["Carnaby", "Fitzrovia"]);
  });

  it("covers every documented flavour either as on-menu or reference only", () => {
    for (const d of DRAFT_DISH_LINES) {
      const onMenu = menuSitesForDish(d.dish_name).length > 0;
      expect(onMenu || NOT_ON_JULY_2026_MENUS.includes(d.dish_name)).toBe(true);
    }
  });

  it("gives no sites to a flavour that is not on either menu", () => {
    for (const name of NOT_ON_JULY_2026_MENUS) {
      expect(menuSitesForDish(name)).toEqual([]);
    }
  });

  it("reports an unknown site instead of guessing", () => {
    const branches = [{ id: "b1", name: "Carnaby" }, { id: "b2", name: "Brixton" }];
    const res = resolveSiteBranchIds(["Carnaby", "Fitzrovia"], branches);
    expect(res.ids).toEqual(["b1"]);
    expect(res.unmatched).toEqual(["Fitzrovia"]);
  });

  it("menu presence alone does not make a dish question scorable", () => {
    expect(canScoreDishQuestion(
      { is_confirmed: false, active_branch_ids: ["b1"] } as any,
      "b1",
    )).toBe(false);
  });
});

describe("site name matching", () => {
  it("matches the real site records, which are named UD Carnaby and so on", () => {
    const branches = [
      { id: "c", name: "UD Carnaby" },
      { id: "b", name: "UD Brixton" },
      { id: "f", name: "UD Fitzrovia" },
    ];
    const res = resolveSiteBranchIds(["Carnaby", "Brixton", "Fitzrovia"], branches);
    expect(res.ids).toEqual(["c", "b", "f"]);
    expect(res.unmatched).toEqual([]);
  });
});
