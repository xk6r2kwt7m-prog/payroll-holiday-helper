import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export interface StaffAssessmentQuestion { id: string; question: string; options: string[]; display_order: number }
export interface StaffAssessmentResult { score: number; passed: boolean; correct: number; total: number; pass_mark: number; attempt_number: number; attempts_remaining: number; completed: boolean }
export function useStaffAssessmentQuestions(assignmentId: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["staff_assessment_questions", tenantId, assignmentId], enabled: !!tenantId && !!assignmentId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("staff_assessment_questions" as never, { _assignment_id: assignmentId } as never);
      if (error) throw error;
      return data as unknown as StaffAssessmentQuestion[];
    },
  });
}
