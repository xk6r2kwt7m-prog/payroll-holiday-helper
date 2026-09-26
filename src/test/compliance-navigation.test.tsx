import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DocumentsCompliance from "@/pages/DocumentsCompliance";
const state = vi.hoisted(() => ({ isError: false, refetch: vi.fn() }));
vi.mock("@/components/layout/AppLayout", () => ({ AppLayout: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/hooks/useTenantGuard", () => ({ useTenantGuard: () => ({ tenantReady: true }) }));
vi.mock("@/hooks/useComplianceBranches", () => ({ useComplianceBranches: () => ({ data: { selectable: [{ id: "site", branch: "Test site" }], needsReview: [] }, isLoading: false, ...state }), useConfirmBranchLocation: () => ({}) }));
vi.mock("@/components/compliance/ComplianceAttentionPanel", () => ({ ComplianceAttentionPanel: () => <p>ComplianceAttentionPanel</p> }));
vi.mock("@/components/compliance/StaffInductionSection", () => ({ StaffInductionSection: () => <p>StaffInductionSection</p> }));
vi.mock("@/components/compliance/DocumentLibrarySection", () => ({ DocumentLibrarySection: () => <p>DocumentLibrarySection</p> }));
vi.mock("@/components/compliance/BranchComplianceSection", () => ({ BranchComplianceSection: () => <p>BranchComplianceSection</p> }));
vi.mock("@/components/compliance/CertificatesSection", () => ({ CertificatesSection: () => <p>CertificatesSection</p> }));
vi.mock("@/components/compliance/InspectionFileSection", () => ({ InspectionFileSection: () => <p>InspectionFileSection</p> }));
vi.mock("@/components/compliance/AlcoholAuthorisationsPanel", () => ({ AlcoholAuthorisationsPanel: () => <p>AlcoholAuthorisationsPanel</p> }));
vi.mock("@/components/compliance/AlcoholAuthorisationBoard", () => ({ AlcoholAuthorisationBoard: () => <p>AlcoholAuthorisationBoard</p> }));
vi.mock("@/components/compliance/TrainingAutomationPanel", () => ({ TrainingAutomationPanel: () => <p>TrainingAutomationPanel</p> }));
vi.mock("@/components/compliance/PremisesLicencePanel", () => ({ PremisesLicencePanel: () => <p>PremisesLicencePanel</p> }));
vi.mock("@/components/compliance/SiteEmergencyDetailsCard", () => ({ SiteEmergencyDetailsCard: () => <p>SiteEmergencyDetailsCard</p> }));
vi.mock("@/components/compliance/IncidentBookSection", () => ({ IncidentBookSection: () => <p>IncidentBookSection</p> }));
vi.mock("@/components/compliance/InductionLessonsPanel", () => ({ InductionLessonsPanel: () => <p>InductionLessonsPanel</p> }));
vi.mock("@/components/compliance/allergen/AllergenTrainingReview", () => ({ AllergenTrainingReview: () => <p>Allergen review</p> }));
afterEach(cleanup);
beforeEach(() => { state.isError = false; vi.clearAllMocks(); });
describe("documents and compliance navigation", () => {
  it("opens a bookmarked section", () => {
    render(<MemoryRouter initialEntries={["/documents?tab=library"]}><DocumentsCompliance /></MemoryRouter>);
    expect(screen.getByText("DocumentLibrarySection")).toBeInTheDocument();
    expect(screen.queryByText("StaffInductionSection")).not.toBeInTheDocument();
  });
  it("starts with staff induction and keeps configuration out of the initial view", () => {
    render(<MemoryRouter><DocumentsCompliance /></MemoryRouter>);
    expect(screen.getByText("StaffInductionSection")).toBeInTheDocument();
    expect(screen.queryByText("TrainingAutomationPanel")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "4. Manage reminders and document updates" }));
    expect(screen.getByText("TrainingAutomationPanel")).toBeInTheDocument();
  });
  it("does not present failed location reads as an empty workspace", () => {
    state.isError = true;
    render(<MemoryRouter><DocumentsCompliance /></MemoryRouter>);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("StaffInductionSection")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(state.refetch).toHaveBeenCalledOnce();
  });
});
