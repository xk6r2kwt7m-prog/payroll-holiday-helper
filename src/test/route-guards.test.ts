/**
 * Route-guard logic tests — verifies the tenant resolution state machine
 * drives correct redirect decisions without false onboarding redirects.
 *
 * These are pure logic tests; they validate the decision table used by
 * ProtectedRoute, SelectWorkspace, and CompanyOnboarding without rendering.
 */
import { describe, it, expect } from "vitest";

// ── Decision table (mirrors ProtectedRoute + SelectWorkspace + CompanyOnboarding) ──

type RouteDecision =
  | "loading"
  | "redirect:/auth"
  | "redirect:/onboard"
  | "redirect:/select-workspace"
  | "redirect:/"
  | "render";

interface TenantState {
  user: { id: string } | null;
  authLoading: boolean;
  tenantLoading: boolean;
  tenantResolved: boolean;
  membershipCount: number; // -1 = unresolved
  tenantId: string | null;
  showTenantPicker: boolean;
  isPlatformAdmin: boolean;
  tenantStatus: string | null;
}

/** Replicates the gate chain in ProtectedRoute */
function protectedRouteDecision(s: TenantState): RouteDecision {
  // GATE 1
  if (s.authLoading || s.tenantLoading) return "loading";
  // GATE 2
  if (!s.user) return "redirect:/auth";
  // GATE 3
  if (!s.tenantResolved) return "loading";
  // GATE 4
  if (s.showTenantPicker && s.membershipCount > 1 && !s.tenantId) return "redirect:/select-workspace";
  // GATE 5
  if (s.membershipCount === 0 && s.tenantResolved && !s.tenantId && !s.isPlatformAdmin) return "redirect:/onboard";
  // remaining gates (role, module, etc.) are out of scope — pass
  return "render";
}

/** Replicates the guard chain in CompanyOnboarding */
function onboardPageDecision(s: TenantState): RouteDecision {
  if (!s.user) return "redirect:/auth";
  if (s.tenantResolved && s.tenantId) return "redirect:/";
  if (s.tenantResolved && s.membershipCount > 0 && !s.tenantId) return "redirect:/select-workspace";
  if (!s.tenantResolved || s.tenantLoading) return "loading";
  return "render";
}

/** Replicates the guard chain in SelectWorkspace */
function selectWorkspaceDecision(s: TenantState & { availableTenants: number }): RouteDecision {
  if (s.authLoading || s.tenantLoading || !s.tenantResolved) return "loading";
  if (!s.user) return "redirect:/auth";
  if (s.tenantId && !s.showTenantPicker) return "redirect:/";
  if (s.tenantResolved && s.membershipCount === 0) return "redirect:/onboard";
  if (!s.showTenantPicker || s.availableTenants === 0) return "redirect:/";
  return "render";
}

// ── Helpers ──

const baseState: TenantState = {
  user: { id: "user-123" },
  authLoading: false,
  tenantLoading: false,
  tenantResolved: false,
  membershipCount: -1,
  tenantId: null,
  showTenantPicker: false,
  isPlatformAdmin: false,
  tenantStatus: null,
};

// ── Tests ──

describe("Route guard — existing user with multiple memberships (no saved tenant)", () => {
  const resolvedMulti: TenantState = {
    ...baseState,
    tenantResolved: true,
    membershipCount: 2,
    showTenantPicker: true,
  };

  it("ProtectedRoute sends to /select-workspace, NOT /onboard", () => {
    expect(protectedRouteDecision(resolvedMulti)).toBe("redirect:/select-workspace");
  });

  it("CompanyOnboarding redirects to /select-workspace", () => {
    expect(onboardPageDecision(resolvedMulti)).toBe("redirect:/select-workspace");
  });

  it("SelectWorkspace renders the picker", () => {
    expect(selectWorkspaceDecision({ ...resolvedMulti, availableTenants: 2 })).toBe("render");
  });
});

describe("Route guard — existing user refresh with saved tenant resolved", () => {
  const resolvedSaved: TenantState = {
    ...baseState,
    tenantResolved: true,
    membershipCount: 1,
    tenantId: "tenant-abc",
  };

  it("ProtectedRoute renders children", () => {
    expect(protectedRouteDecision(resolvedSaved)).toBe("render");
  });

  it("CompanyOnboarding redirects to /", () => {
    expect(onboardPageDecision(resolvedSaved)).toBe("redirect:/");
  });

  it("SelectWorkspace redirects to /", () => {
    expect(selectWorkspaceDecision({ ...resolvedSaved, availableTenants: 0 })).toBe("redirect:/");
  });
});

describe("Route guard — existing user manually visits /onboard", () => {
  it("redirects to / when tenantId is set", () => {
    const s: TenantState = {
      ...baseState,
      tenantResolved: true,
      membershipCount: 1,
      tenantId: "tenant-abc",
    };
    expect(onboardPageDecision(s)).toBe("redirect:/");
  });

  it("redirects to /select-workspace when memberships > 0 but no active tenant", () => {
    const s: TenantState = {
      ...baseState,
      tenantResolved: true,
      membershipCount: 2,
      showTenantPicker: true,
    };
    expect(onboardPageDecision(s)).toBe("redirect:/select-workspace");
  });
});

describe("Route guard — true zero-membership user", () => {
  const zeroMember: TenantState = {
    ...baseState,
    tenantResolved: true,
    membershipCount: 0,
  };

  it("ProtectedRoute sends to /onboard", () => {
    expect(protectedRouteDecision(zeroMember)).toBe("redirect:/onboard");
  });

  it("CompanyOnboarding renders the wizard", () => {
    expect(onboardPageDecision(zeroMember)).toBe("render");
  });
});

describe("Route guard — unresolved state never triggers /onboard", () => {
  it("membershipCount=-1, tenantResolved=false shows loading", () => {
    expect(protectedRouteDecision(baseState)).toBe("loading");
  });

  it("membershipCount=-1, tenantResolved=true does NOT redirect to /onboard", () => {
    const s: TenantState = { ...baseState, tenantResolved: true, membershipCount: -1 };
    // -1 !== 0, so Gate 5 must not fire
    expect(protectedRouteDecision(s)).toBe("render");
  });

  it("mid-fetch state (loading=true) shows loading", () => {
    const s: TenantState = { ...baseState, tenantLoading: true };
    expect(protectedRouteDecision(s)).toBe("loading");
  });
});

describe("Route guard — platform admin bypass", () => {
  it("platform admin with 0 memberships is NOT sent to /onboard", () => {
    const s: TenantState = {
      ...baseState,
      tenantResolved: true,
      membershipCount: 0,
      isPlatformAdmin: true,
    };
    expect(protectedRouteDecision(s)).toBe("render");
  });
});
