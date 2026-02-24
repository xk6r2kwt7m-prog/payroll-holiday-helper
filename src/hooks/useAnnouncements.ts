import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  target_branches: string[];
  target_departments: string[];
  published_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReadReceipt {
  id: string;
  announcement_id: string;
  employee_id: string;
  read_at: string;
  employees?: { forename: string; surname: string };
}

export function useAnnouncements() {
  return useQuery({
    queryKey: ["staff_announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_announcements" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Announcement[];
    },
  });
}

export function useReadReceipts(announcementId?: string) {
  return useQuery({
    queryKey: ["announcement_read_receipts", announcementId],
    queryFn: async () => {
      if (!announcementId) return [];
      const { data, error } = await supabase
        .from("announcement_read_receipts" as any)
        .select("*, employees(forename, surname)")
        .eq("announcement_id", announcementId);
      if (error) throw error;
      return (data || []) as unknown as ReadReceipt[];
    },
    enabled: !!announcementId,
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ann: {
      title: string;
      content: string;
      priority?: string;
      target_branches?: string[];
      target_departments?: string[];
      publish_now?: boolean;
    }) => {
      const { publish_now, ...rest } = ann;
      const { error } = await supabase.from("staff_announcements" as any).insert({
        ...rest,
        published_at: publish_now ? new Date().toISOString() : null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff_announcements"] });
      toast.success("Announcement created");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function usePublishAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("staff_announcements" as any)
        .update({ published_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff_announcements"] });
      toast.success("Announcement published");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff_announcements" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff_announcements"] });
      toast.success("Announcement deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
