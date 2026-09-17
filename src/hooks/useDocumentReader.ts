import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { logComplianceAudit } from "@/hooks/useCompliance";
import type { ReaderQuestion, ReaderSection } from "@/lib/document-reader";

/** Reading sections for one document, in order. */
export function useReaderSections(documentId?: string) {
  return useQuery({
    queryKey: ["document_reader_sections", documentId],
    queryFn: async (): Promise<ReaderSection[]> => {
      const { data, error } = await supabase
        .from("document_reader_sections")
        .select("id, heading, body, sort_order")
        .eq("document_id", documentId!)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as ReaderSection[];
    },
    enabled: !!documentId,
  });
}

/** All checks for one document, including drafts awaiting approval. */
export function useReaderQuestions(documentId?: string) {
  return useQuery({
    queryKey: ["document_reader_questions", documentId],
    queryFn: async (): Promise<ReaderQuestion[]> => {
      const { data, error } = await supabase
        .from("document_reader_questions")
        .select("id, section_id, question, options, correct_index, explanation, approval_status, origin, sort_order")
        .eq("document_id", documentId!)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).map((q: any) => ({
        ...q,
        options: Array.isArray(q.options) ? q.options.map((o: any) => String(o)) : [],
      })) as ReaderQuestion[];
    },
    enabled: !!documentId,
  });
}

/** Builds (or rebuilds) the on-screen version from the stored file. */
export function useBuildReaderVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ documentId }: { documentId: string }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Please sign in again.");
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/build-document-reader`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ document_id: documentId }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "The reading version could not be prepared.");
      return json as { sections: number; suggested_questions: number };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["document_reader_sections", vars.documentId] });
      qc.invalidateQueries({ queryKey: ["document_reader_questions", vars.documentId] });
      qc.invalidateQueries({ queryKey: ["compliance_documents"] });
    },
  });
}

/** Approve, reject or edit one check. Nothing reaches staff until approved. */
export function useSaveReaderQuestion() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({
      id,
      documentId,
      updates,
      event,
    }: {
      id: string;
      documentId: string;
      updates: Record<string, any>;
      event: "reader_question_approved" | "reader_question_rejected" | "reader_question_edited";
    }) => {
      const { data: previous } = await supabase
        .from("document_reader_questions")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      const patch: Record<string, any> = { ...updates, updated_at: new Date().toISOString() };
      if (event === "reader_question_approved") {
        const { data: { user } } = await supabase.auth.getUser();
        patch.approval_status = "approved";
        patch.approved_by = user?.id ?? null;
        patch.approved_at = new Date().toISOString();
      }
      if (event === "reader_question_rejected") {
        patch.approval_status = "rejected";
      }

      const { error } = await supabase
        .from("document_reader_questions")
        .update(patch as any)
        .eq("id", id);
      if (error) throw error;

      if (tenantId) {
        await logComplianceAudit({
          tenantId,
          table: "document_reader_questions",
          recordId: id,
          event: event as any,
          previous,
          next: { ...previous, ...patch },
        });
      }
      return { documentId };
    },
    onSuccess: ({ documentId }) => {
      qc.invalidateQueries({ queryKey: ["document_reader_questions", documentId] });
    },
  });
}

/** Adds a manager-written check (already approved by definition). */
export function useAddReaderQuestion() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (payload: {
      documentId: string;
      sectionId: string;
      question: string;
      options: string[];
      correctIndex: number;
      explanation?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("document_reader_questions").insert({
        tenant_id: tenantId!,
        document_id: payload.documentId,
        section_id: payload.sectionId,
        question: payload.question,
        options: payload.options,
        correct_index: payload.correctIndex,
        explanation: payload.explanation ?? null,
        origin: "manager",
        approval_status: "approved",
        approved_by: user?.id ?? null,
        approved_at: new Date().toISOString(),
      }).select("id").single();
      if (error) throw error;
      if (tenantId) {
        await logComplianceAudit({
          tenantId,
          table: "document_reader_questions",
          recordId: data.id,
          event: "reader_question_added" as any,
          next: { question: payload.question },
        });
      }
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["document_reader_questions", vars.documentId] });
    },
  });
}

/** Turns the on-screen version on or off for staff. */
export function useSetReaderEnabled() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({ documentId, enabled }: { documentId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("compliance_documents")
        .update({ reader_enabled: enabled })
        .eq("id", documentId);
      if (error) throw error;
      if (tenantId) {
        await logComplianceAudit({
          tenantId,
          table: "compliance_documents",
          recordId: documentId,
          event: (enabled ? "reader_enabled" : "reader_disabled") as any,
          next: { reader_enabled: enabled },
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance_documents"] });
    },
  });
}

/** How far staff have got with an on-screen document (manager view). */
export function useReaderProgressSummary(documentId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["document_reader_progress", tenantId, documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_reader_progress")
        .select("employee_id, section_id, read_at, answered_correctly")
        .eq("tenant_id", tenantId!)
        .eq("document_id", documentId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId && !!documentId,
  });
}
