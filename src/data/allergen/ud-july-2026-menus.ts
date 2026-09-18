/**
 * Ugly Dumpling customer menus — July 2026.
 *
 * Sources (customer-facing menus, downloaded 18 September 2026):
 *  - Ugly-Dumpling-July-2026-All-in-One-Menu-1.pdf  (Carnaby and Fitzrovia)
 *  - Ugly-Dumpling-Brixton-July-2026-All-In-One-Menu.pdf  (Brixton)
 *
 * These menus are used for ONE purpose only: recording which flavours are live
 * on a site's customer menu, so a scored dish question is never produced for a
 * dish a site does not sell. They are NOT used as an allergen authority — the
 * approved allergen matrix and supplier specifications remain the source of
 * allergen truth, and a flavour stays unconfirmed until that matrix is uploaded.
 *
 * The company has three sites only: Carnaby, Brixton and Fitzrovia.
 */

export const UD_SITES = ["Carnaby", "Brixton", "Fitzrovia"] as const;
export type UdSite = (typeof UD_SITES)[number];

export const JULY_2026_MENU_SOURCES = [
  {
    key: "menu_carnaby_fitzrovia_july_2026",
    title: "Customer menu — July 2026 (Carnaby and Fitzrovia)",
    url: "https://uglydumpling.co.uk/wp-content/uploads/2026/07/Ugly-Dumpling-July-2026-All-in-One-Menu-1.pdf",
    sites: ["Carnaby", "Fitzrovia"] as UdSite[],
    source_date: "2026-07-01",
  },
  {
    key: "menu_brixton_july_2026",
    title: "Customer menu — July 2026 (Brixton)",
    url: "https://uglydumpling.co.uk/wp-content/uploads/2026/07/Ugly-Dumpling-Brixton-July-2026-All-In-One-Menu.pdf",
    sites: ["Brixton"] as UdSite[],
    source_date: "2026-07-01",
  },
] as const;

/** Which sites list the flavour on the July 2026 customer menu (main or gluten-free). */
export const JULY_2026_MENU_AVAILABILITY: Record<string, UdSite[]> = {
  /* Classics — on every menu */
  "Pork Belly": ["Carnaby", "Brixton", "Fitzrovia"],
  "Aromatic Duck": ["Carnaby", "Brixton", "Fitzrovia"],
  "Prawn & Chive": ["Carnaby", "Brixton", "Fitzrovia"],
  "Satay Chicken": ["Carnaby", "Brixton", "Fitzrovia"],
  "Spring Roll Dumpling": ["Carnaby", "Brixton", "Fitzrovia"],
  "Spinach & Tofu": ["Carnaby", "Brixton", "Fitzrovia"],

  /* New favourites */
  Cheeseburger: ["Carnaby", "Brixton", "Fitzrovia"],
  "Vegan Burger": ["Carnaby", "Brixton", "Fitzrovia"],
  "Curry Paneer": ["Carnaby", "Brixton", "Fitzrovia"],
  "Mushroom & Truffle": ["Carnaby", "Brixton", "Fitzrovia"],
  "Halloumi & Courgette": ["Carnaby", "Brixton", "Fitzrovia"],
  "Korean Kimchi": ["Carnaby", "Brixton", "Fitzrovia"],

  /* Specials */
  "Beef Rendang": ["Carnaby", "Brixton", "Fitzrovia"],
  "Korean Beef Bulgogi Dumpling": ["Carnaby", "Brixton", "Fitzrovia"],
  "Lamb & Harissa": ["Carnaby", "Fitzrovia"],
  "Curry Goat": ["Brixton"],

  /* Sides */
  "Tempura Aubergine": ["Carnaby", "Brixton", "Fitzrovia"],
  "Ugly Noodles": ["Carnaby", "Brixton", "Fitzrovia"],
  "Mango & Cucumber Salad": ["Carnaby", "Brixton", "Fitzrovia"],
  "Corn Fritters": ["Brixton"],

  /* Sweet */
  "Nutella sweet dumpling": ["Carnaby", "Brixton", "Fitzrovia"],
  "Pecan sweet dumpling": ["Carnaby", "Brixton", "Fitzrovia"],
  "Apple Pie": ["Carnaby", "Brixton", "Fitzrovia"],
  "Biscoff Banana": ["Brixton"],
  "Strawberry Cheesecake": ["Carnaby", "Brixton", "Fitzrovia"],

  /* Drinks listed on both menus */
  Wine: ["Carnaby", "Brixton", "Fitzrovia"],
  "Tiger, Asahi and Sapporo beer": ["Carnaby", "Brixton", "Fitzrovia"],
};

/**
 * Flavours held in the reference library that do NOT appear on either July 2026
 * customer menu. They stay in the library as documented history, and no scored
 * dish question is produced for them.
 */
export const NOT_ON_JULY_2026_MENUS = [
  "Sichuan Vegan Pork Dumplings",
  "GF Cucumber Salad",
  "Laksa Soup",
  "Homemade Chilli Sauce",
  "House Chilli Oil",
];

/** Resolve the menu sites for a dish; an unlisted dish resolves to no sites. */
export function menuSitesForDish(dishName: string): UdSite[] {
  return JULY_2026_MENU_AVAILABILITY[dishName] ?? [];
}

/** Map site names to the tenant's branch records. Unmatched names are reported, never guessed. */
export function resolveSiteBranchIds(
  sites: readonly string[],
  branches: { id: string; name: string }[],
): { ids: string[]; unmatched: string[] } {
  const ids: string[] = [];
  const unmatched: string[] = [];
  const norm = (v: string) => (v ?? "").trim().toLowerCase().replace(/^ud\s+/, "");
  for (const site of sites) {
    /* Site records are named e.g. "UD Carnaby"; match on the site name itself. */
    const hit = branches.find((b) => norm(b.name) === norm(site));
    if (hit) ids.push(hit.id);
    else unmatched.push(site);
  }
  return { ids: Array.from(new Set(ids)), unmatched };
}
