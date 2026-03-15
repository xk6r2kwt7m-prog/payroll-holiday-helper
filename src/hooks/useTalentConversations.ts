import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useEffect } from "react";

export interface TalentConversation {
  id: string;
  conversation_type: string;
  application_id: string | null;
  talent_profile_id: string;
  employer_tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  // joined
  last_message?: TalentMessage | null;
  unread_count?: number;
  other_party_name?: string;
  vacancy_title?: string;
}

export interface TalentMessage {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_user_id: string;
  message_text: string | null;
  message_type: string;
  metadata: Record<string, any>;
  read_at: string | null;
  created_at: string;
}

// Employer inbox — conversations for their tenant
export function useEmployerConversations(enabled = true) {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["employer-conversations", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("talent_conversations")
        .select(`
          *,
          talent_applications(
            id, status, cover_message,
            talent_vacancies(title)
          ),
          talent_profiles(
            id,
            employees!inner(forename, surname)
          )
        `)
        .eq("employer_tenant_id", tenantId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;

      // Get unread counts per conversation
      const convIds = (data || []).map((c: any) => c.id);
      let unreadMap: Record<string, number> = {};
      if (convIds.length > 0) {
        const { data: msgs } = await supabase
          .from("talent_messages")
          .select("conversation_id")
          .in("conversation_id", convIds)
          .eq("sender_type", "worker")
          .is("read_at", null);
        (msgs || []).forEach((m: any) => {
          unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1;
        });
      }

      // C1 FIX: Only expose forename + surname initial to employer
      return (data || []).map((c: any) => ({
        ...c,
        other_party_name: c.talent_profiles?.employees
          ? `${c.talent_profiles.employees.forename} ${c.talent_profiles.employees.surname?.charAt(0)?.toUpperCase() || ""}.`
          : "Candidate",
        vacancy_title: c.talent_applications?.talent_vacancies?.title || null,
        unread_count: unreadMap[c.id] || 0,
        // Strip raw join data to prevent accidental full surname access
        talent_profiles: undefined,
      })) as TalentConversation[];
    },
    enabled: !!tenantId && enabled,
  });

  // Realtime subscription
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`employer-conv-${tenantId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "talent_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["employer-conversations", tenantId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, qc]);

  return query;
}

// Worker inbox — conversations for their talent profile
export function useWorkerConversations() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["worker-conversations", user?.id],
    queryFn: async () => {
      // Get employee -> talent_profile
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!employee) return [];

      const { data: profile } = await supabase
        .from("talent_profiles")
        .select("id")
        .eq("employee_id", employee.id)
        .maybeSingle();
      if (!profile) return [];

      const { data, error } = await supabase
        .from("talent_conversations")
        .select(`
          *,
          talent_applications(
            id, status, cover_message,
            talent_vacancies(title, location, country)
          )
        `)
        .eq("talent_profile_id", profile.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;

      // Fetch company names
      const tenantIds = [...new Set((data || []).map((c: any) => c.employer_tenant_id))];
      let companyMap: Record<string, string> = {};
      if (tenantIds.length > 0) {
        const { data: settings } = await supabase
          .from("company_settings")
          .select("tenant_id, company_name")
          .in("tenant_id", tenantIds);
        companyMap = Object.fromEntries((settings || []).map((s: any) => [s.tenant_id, s.company_name]));
      }

      // Unread counts
      const convIds = (data || []).map((c: any) => c.id);
      let unreadMap: Record<string, number> = {};
      if (convIds.length > 0) {
        const { data: msgs } = await supabase
          .from("talent_messages")
          .select("conversation_id")
          .in("conversation_id", convIds)
          .eq("sender_type", "employer")
          .is("read_at", null);
        (msgs || []).forEach((m: any) => {
          unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1;
        });
      }

      return (data || []).map((c: any) => ({
        ...c,
        other_party_name: companyMap[c.employer_tenant_id] || "Company",
        vacancy_title: c.talent_applications?.talent_vacancies?.title || null,
        unread_count: unreadMap[c.id] || 0,
      })) as TalentConversation[];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`worker-conv-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "talent_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["worker-conversations", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  return query;
}

// Messages for a specific conversation
export function useConversationMessages(conversationId: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["conversation-messages", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("talent_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as TalentMessage[];
    },
    enabled: !!conversationId,
  });

  // Realtime for this conversation
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`msgs-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "talent_messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["conversation-messages", conversationId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, qc]);

  return query;
}

// Send message
export function useSendMessage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      conversation_id,
      message_text,
      message_type = "text",
      sender_type,
      metadata = {},
    }: {
      conversation_id: string;
      message_text: string;
      message_type?: string;
      sender_type: "employer" | "worker";
      metadata?: Record<string, any>;
    }) => {
      const { data, error } = await supabase
        .from("talent_messages")
        .insert({
          conversation_id,
          message_text,
          message_type,
          sender_type,
          sender_user_id: user!.id,
          metadata,
        } as any)
        .select()
        .single();
      if (error) throw error;

      // Touch conversation updated_at
      await supabase
        .from("talent_conversations")
        .update({ updated_at: new Date().toISOString() } as any)
        .eq("id", conversation_id);

      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["conversation-messages", vars.conversation_id] });
      qc.invalidateQueries({ queryKey: ["employer-conversations"] });
      qc.invalidateQueries({ queryKey: ["worker-conversations"] });
    },
  });
}

// C2 FIX: Mark messages as read via security-definer RPC (no direct UPDATE)
export function useMarkMessagesRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, senderType }: { conversationId: string; senderType: string }) => {
      const { error } = await supabase.rpc("mark_talent_messages_read", {
        _conversation_id: conversationId,
        _reader_sender_type: senderType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employer-conversations"] });
      qc.invalidateQueries({ queryKey: ["worker-conversations"] });
    },
  });
}
