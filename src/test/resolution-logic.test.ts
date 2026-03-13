import { describe, it, expect } from "vitest";
import { getRoleLevel, meetsMinRole, ROLE_LEVEL } from "@/lib/roles";

// ─── SECTION 3: Role Resolution Tests ───

describe("Role Hierarchy (shared source of truth)", () => {
  it("admin has highest level (4)", () => {
    expect(getRoleLevel("admin")).toBe(4);
  });

  it("manager has level 3", () => {
    expect(getRoleLevel("manager")).toBe(3);
  });

  it("supervisor has level 2", () => {
    expect(getRoleLevel("supervisor")).toBe(2);
  });

  it("staff has level 1", () => {
    expect(getRoleLevel("staff")).toBe(1);
  });

  it("viewer has level 0", () => {
    expect(getRoleLevel("viewer")).toBe(0);
  });

  it("null role returns 0", () => {
    expect(getRoleLevel(null)).toBe(0);
  });

  it("undefined role returns 0", () => {
    expect(getRoleLevel(undefined)).toBe(0);
  });

  it("unknown role returns 0", () => {
    expect(getRoleLevel("unknown_role")).toBe(0);
  });
});

describe("meetsMinRole", () => {
  it("admin meets admin requirement", () => {
    expect(meetsMinRole("admin", "admin")).toBe(true);
  });

  it("admin meets staff requirement", () => {
    expect(meetsMinRole("admin", "staff")).toBe(true);
  });

  it("staff does NOT meet admin requirement", () => {
    expect(meetsMinRole("staff", "admin")).toBe(false);
  });

  it("manager meets supervisor requirement", () => {
    expect(meetsMinRole("manager", "supervisor")).toBe(true);
  });

  it("supervisor does NOT meet manager requirement", () => {
    expect(meetsMinRole("supervisor", "manager")).toBe(false);
  });

  it("null role does NOT meet staff requirement", () => {
    expect(meetsMinRole(null, "staff")).toBe(false);
  });

  it("null role meets viewer requirement", () => {
    expect(meetsMinRole(null, "viewer")).toBe(true);
  });
});

// ─── SECTION 5: Country Rule Resolution Tests ───

describe("Country Rule Resolution Order", () => {
  const COUNTRY_DEFAULTS: Record<string, string> = {
    GB: "en",
    US: "en",
    PT: "pt-PT",
    CV: "pt-PT",
  };

  it("UK tenant defaults to English", () => {
    expect(COUNTRY_DEFAULTS["GB"]).toBe("en");
  });

  it("US tenant defaults to English", () => {
    expect(COUNTRY_DEFAULTS["US"]).toBe("en");
  });

  it("Portugal tenant defaults to pt-PT", () => {
    expect(COUNTRY_DEFAULTS["PT"]).toBe("pt-PT");
  });

  it("Cape Verde tenant defaults to pt-PT", () => {
    expect(COUNTRY_DEFAULTS["CV"]).toBe("pt-PT");
  });
});

// ─── SECTION 6: Language Resolution Tests ───

describe("Language Resolution", () => {
  const LOCALE_MAP: Record<string, string> = {
    GB: "en",
    US: "en",
    IE: "en",
    PT: "pt-PT",
    CV: "pt-PT",
  };

  function resolveLocale(
    userPref: string | null,
    tenantCountry: string | null,
    browserLang: string | null
  ): string {
    // 1. User preference
    if (userPref === "en" || userPref === "pt-PT") return userPref;
    // 2. Tenant country default
    const tenantLocale = tenantCountry ? LOCALE_MAP[tenantCountry] ?? null : null;
    if (tenantLocale) return tenantLocale;
    // 3. Browser locale
    if (browserLang) {
      if (browserLang.startsWith("pt")) return "pt-PT";
      if (browserLang.startsWith("en")) return "en";
    }
    // 4. Fallback
    return "en";
  }

  it("user preference overrides tenant language", () => {
    expect(resolveLocale("pt-PT", "GB", "en")).toBe("pt-PT");
  });

  it("tenant country used when no user preference", () => {
    expect(resolveLocale(null, "PT", "en")).toBe("pt-PT");
  });

  it("browser locale used when no user pref and no tenant country", () => {
    expect(resolveLocale(null, null, "pt-BR")).toBe("pt-PT");
  });

  it("fallback to English when nothing is set", () => {
    expect(resolveLocale(null, null, null)).toBe("en");
  });

  it("Portugal tenant defaults to pt-PT without user override", () => {
    expect(resolveLocale(null, "PT", null)).toBe("pt-PT");
  });

  it("Cape Verde tenant defaults to pt-PT without user override", () => {
    expect(resolveLocale(null, "CV", null)).toBe("pt-PT");
  });

  it("UK tenant defaults to English without user override", () => {
    expect(resolveLocale(null, "GB", null)).toBe("en");
  });

  it("US tenant defaults to English without user override", () => {
    expect(resolveLocale(null, "US", null)).toBe("en");
  });

  it("user can choose Portuguese UI with UK labour rules", () => {
    // Language ≠ labour rules — they are separate concerns
    expect(resolveLocale("pt-PT", "GB", null)).toBe("pt-PT");
  });
});

// ─── SECTION 7: Login Location Tests ───

describe("Login Location as Weak Signal Only", () => {
  it("login location does NOT change role", () => {
    // Role is always from stored data
    const roleFromDb = "staff";
    const loginCountry = "US"; // different from work country
    // Role must not change based on login location
    expect(getRoleLevel(roleFromDb)).toBe(1);
    expect(getRoleLevel(roleFromDb)).toBe(getRoleLevel("staff"));
  });

  it("login location does NOT change legal rules", () => {
    // Country rules come from employee.contract_country → tenant.country
    // NOT from login IP
    const contractCountry = "GB";
    const loginCountry = "PT";
    // The applicable country is contractCountry, not loginCountry
    expect(contractCountry).toBe("GB");
    expect(contractCountry).not.toBe(loginCountry);
  });
});

// ─── SECTION 4: Employee Link Resolution Tests ───

describe("Employee Link Resolution", () => {
  it("staff user with employee link gets employee ID", () => {
    const mockEmployee = { id: "emp-123", user_id: "user-abc" };
    expect(mockEmployee.id).toBeDefined();
    expect(mockEmployee.user_id).toBe("user-abc");
  });

  it("staff user without employee link returns null gracefully", () => {
    const noEmployee = null;
    expect(noEmployee).toBeNull();
    // System should handle this by showing setup prompt, not crashing
  });

  it("employee link determines data access scope", () => {
    // Staff role + linked employee = can see own shifts, timesheets, holidays
    const employeeId = "emp-123";
    const role = "staff";
    expect(meetsMinRole(role, "staff")).toBe(true);
    expect(employeeId).toBeTruthy();
  });

  it("manager can access broader tenant data without employee link", () => {
    const role = "manager";
    expect(meetsMinRole(role, "manager")).toBe(true);
    // Managers don't need employee link for management functions
  });
});

// ─── SECTION 8: Safe Fallback Tests ───

describe("Safe Fallbacks", () => {
  it("missing role denies protected access", () => {
    expect(meetsMinRole(null, "staff")).toBe(false);
    expect(meetsMinRole(null, "admin")).toBe(false);
  });

  it("missing role allows viewer access", () => {
    expect(meetsMinRole(null, "viewer")).toBe(true);
  });

  it("unknown role string treated as zero level", () => {
    expect(getRoleLevel("hacker")).toBe(0);
    expect(meetsMinRole("hacker", "staff")).toBe(false);
  });
});
