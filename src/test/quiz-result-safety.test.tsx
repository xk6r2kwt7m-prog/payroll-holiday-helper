import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuizTaker } from "@/components/training/QuizTaker";
import { quizCanCompleteAssignment } from "@/lib/staff-training-journey";
const state = vi.hoisted(() => ({ error: false, mutate: vi.fn() }));
vi.mock("@/hooks/useStaffAssessment", () => ({ useStaffAssessmentQuestions: () => ({ data: [{ id: "q", question: "Synthetic question?", options: ["First", "Second"], correct_option: 0 }], isLoading: false, isError: state.error, refetch: vi.fn() }) }));
vi.mock("@/hooks/useTrainingModules", () => ({ useQuizAttempts: () => ({ data: [], isLoading: false, isError: state.error, refetch: vi.fn() }), useSubmitQuiz: () => ({ mutate: state.mutate, isPending: false }) }));
afterEach(cleanup);
beforeEach(() => { state.error = false; vi.clearAllMocks(); });
describe("assessment result safety", () => {
  it("waits for successful persistence before presenting a result", () => {
    render(<QuizTaker moduleId="module" assignmentId="assignment" employeeId="staff" passMark={80} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /First/ }));
    fireEvent.click(screen.getByRole("button", { name: "Submit Quiz" }));
    expect(state.mutate).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Submit Quiz" })).toBeInTheDocument();
    expect(screen.queryByText("100%")).not.toBeInTheDocument();
  });
  it("blocks an assessment when attempt history cannot load", () => {
    state.error = true;
    render(<QuizTaker moduleId="module" assignmentId="assignment" employeeId="staff" passMark={80} onComplete={vi.fn()} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("Synthetic question?")).not.toBeInTheDocument();
  });
  it("requires outstanding acknowledgements and practical sign-off after passing", () => {
    const a = { signoff_required: true, signed_off_at: null, acknowledged_at: null, training_library: { requires_acknowledgement: true } as any };
    expect(quizCanCompleteAssignment(a)).toBe(false);
    expect(quizCanCompleteAssignment({ ...a, signed_off_at: "2026-09-26" })).toBe(false);
    expect(quizCanCompleteAssignment({ ...a, signed_off_at: "2026-09-26", acknowledged_at: "2026-09-26" })).toBe(true);
  });
});
