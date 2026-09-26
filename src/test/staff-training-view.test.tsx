import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StaffTrainingView } from "@/components/training/StaffTrainingView";
const state = vi.hoisted(() => ({ data: [] as any[], isError: false, refetch: vi.fn(), mutate: vi.fn() }));
vi.mock("@/hooks/useTrainingLibrary", () => ({ useMyTrainingAssignments: () => ({ ...state, isLoading: false }), useUpdateAssignment: () => ({ mutate: state.mutate }), LIBRARY_CATEGORIES: [] }));
vi.mock("@/hooks/useTrainingModules", () => ({ COMPLETION_TYPES: [] }));
vi.mock("@/components/training/QuizTaker", () => ({ QuizTaker: () => <p>Assessment</p> }));
vi.mock("@/components/training/LessonViewer", () => ({ LessonViewer: () => <p>Lesson</p> }));
vi.mock("@/data/training-standards/lessons", () => ({ getLessonContent: () => null }));
afterEach(cleanup);
beforeEach(() => { state.data = []; state.isError = false; vi.clearAllMocks(); });
const show = () => render(<MemoryRouter><StaffTrainingView employeeId="staff" /></MemoryRouter>);
const task = (id: string, due_date: string) => ({ id, status: "assigned", due_date, training_library: { title: id, status: "published" } });
describe("phone training journey", () => {
  it("shows one next task initially and lets staff expand the plan", () => {
    state.data = [task("Urgent safety", "2020-01-01"), task("Later handbook", "2099-01-01")]; show();
    expect(screen.getByText("Urgent safety")).toBeInTheDocument();
    expect(screen.queryByText("Later handbook")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View my full plan and completed work" }));
    expect(screen.getByText("Later handbook")).toBeInTheDocument();
    expect(state.mutate).not.toHaveBeenCalled();
  });
  it("shows an error and retry instead of falsely saying nothing is assigned", () => {
    state.isError = true; show();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("No training assigned yet")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(state.refetch).toHaveBeenCalledOnce();
  });
  it("tells staff when the remaining step belongs to their manager", () => {
    state.data = [{ ...task("Practical", "2020-01-01"), viewed_at: "2020-01-01", signoff_required: true }]; show();
    expect(screen.getByText(/Your next step is with your manager/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Your next task" })).not.toBeInTheDocument();
  });
});
