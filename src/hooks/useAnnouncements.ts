import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { assertPermission } from "@/lib/permission-guard";

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
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["staff_announcements", tenantId],
    queryFn: async () => {
      if (!tenantId) return [] as Announcement[];
      const { data, error } = await supabase
        .from("staff_announcements" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Announcement[];
    },
    enabled: !!tenantId,
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
  const { tenantId } = useTenant();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (ann: {
      title: string;
      content: string;
      priority?: string;
      target_branches?: string[];
      target_departments?: string[];
      publish_now?: boolean;
    }) => {
      if (!tenantId) throw new Error("Unable to create announcement: tenant context missing.");
      await assertPermission("edit_employees", tenantId);
      const { publish_now, ...rest } = ann;
      const { data, error } = await supabase.from("staff_announcements" as any).insert({
        ...rest,
        tenant_id: tenantId,
        created_by: user?.id || null,
        published_at: publish_now ? new Date().toISOString() : null,
      } as any).select().single();
      if (error) throw error;

      // If published immediately, notify all tenant staff
      if (publish_now && tenantId) {
        try {
          const { data: members } = await supabase
            .from("tenant_members" as any)
            .select("user_id")
            .eq("tenant_id", tenantId)
            .eq("is_active", true);

          if (members && members.length > 0) {
            const rows = (members as any[])
              .map((m) => m.user_id)
              .filter((uid: string) => uid && uid !== user?.id)
              .map((uid: string) => ({
                tenant_id: tenantId,
                user_id: uid,
                event_type: "announcement",
                title: "New announcement",
                body: ann.title,
                link: "/announcements",
                metadata: {},
              }));
            if (rows.length > 0) {
              await supabase.from("notifications" as any).insert(rows as any);
            }
          }
        } catch (err) {
          console.warn("Failed to send announcement notifications:", err);
        }
      }
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
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (id: string) => {
      await assertPermission("edit_employees", tenantId!);
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
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (id: string) => {
      await assertPermission("edit_employees", tenantId!);
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
