import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useNotifyEvent } from "@/hooks/useNotifyEvent";
import { toast } from "sonner";
import { assertPermission } from "@/lib/permission-guard";

export interface MarketplaceListing {
  id: string;
  tenant_id: string;
  shift_id: string;
  offered_by: string | null;
  listing_type: string;
  status: string;
  swap_target_shift_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  shift?: any;
  offered_by_employee?: any;
}

export interface MarketplaceRequest {
  id: string;
  tenant_id: string;
  listing_id: string;
  requested_by: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  notes: string | null;
  created_at: string;
  requested_by_employee?: any;
  listing?: MarketplaceListing;
}

export function useMarketplaceListings() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["shift-marketplace", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("shift_marketplace" as any)
        .select(`
          *,
          shift:shifts!shift_marketplace_shift_id_fkey(
            id, shift_date, start_time, end_time, branch, department, employee_id,
            employee:employees!shifts_employee_id_fkey(id, forename, surname, department)
          ),
          offered_by_employee:employees!shift_marketplace_offered_by_fkey(id, forename, surname, department)
        `)
        .eq("tenant_id", tenantId)
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as MarketplaceListing[];
    },
    enabled: !!tenantId,
  });
}

export function useMyMarketplaceRequests() {
  const { tenantId } = useTenant();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-marketplace-requests", tenantId, user?.id],
    queryFn: async () => {
      if (!tenantId || !user) return [];

      const { data, error } = await supabase
        .from("shift_marketplace_requests" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .in("status", ["pending"]);

      if (error) throw error;
      return (data || []) as unknown as MarketplaceRequest[];
    },
    enabled: !!tenantId && !!user,
  });
}

export function usePendingApprovals() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["marketplace-pending-approvals", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("shift_marketplace_requests" as any)
        .select(`
          *,
          requested_by_employee:employees!shift_marketplace_requests_requested_by_fkey(id, forename, surname, department),
          listing:shift_marketplace!shift_marketplace_requests_listing_id_fkey(
            *,
            shift:shifts!shift_marketplace_shift_id_fkey(id, shift_date, start_time, end_time, branch, department,
              employee:employees!shifts_employee_id_fkey(id, forename, surname)
            )
          )
        `)
        .eq("tenant_id", tenantId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as MarketplaceRequest[];
    },
    enabled: !!tenantId,
  });
}

/** Helper: fetch shift details for notification messages */
async function getShiftLabel(shiftId: string): Promise<{ label: string; branch: string; date: string }> {
  const { data } = await supabase
    .from("shifts")
    .select("shift_date, start_time, end_time, branch")
    .eq("id", shiftId)
    .single();
  if (!data) return { label: "a shift", branch: "", date: "" };
  const d = new Date(data.shift_date + "T00:00:00");
  const dateStr = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const start = (data.start_time || "").slice(0, 5);
  const end = (data.end_time || "").slice(0, 5);
  return {
    label: `${dateStr} ${start}–${end}${data.branch ? ` at ${data.branch}` : ""}`,
    branch: data.branch || "",
    date: data.shift_date,
  };
}

/** Helper: get employee name and user_id */
async function getEmployeeInfo(employeeId: string): Promise<{ name: string; userId: string | null }> {
  const { data } = await supabase
    .from("employees" as any)
    .select("forename, surname, user_id")
    .eq("id", employeeId)
    .single();
  if (!data) return { name: "An employee", userId: null };
  return { name: `${(data as any).forename} ${(data as any).surname}`, userId: (data as any).user_id };
}

export function useOfferShift() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const { notifyAdmins } = useNotifyEvent();

  return useMutation({
    mutationFn: async ({ shiftId, employeeId, notes }: { shiftId: string; employeeId: string; notes?: string }) => {
      if (!tenantId) throw new Error("No tenant");

      const { data, error } = await supabase
        .from("shift_marketplace" as any)
        .insert({
          tenant_id: tenantId,
          shift_id: shiftId,
          offered_by: employeeId,
          listing_type: "offer",
          status: "open",
          notes: notes || null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Notify admins with shift details
      const [shift, emp] = await Promise.all([getShiftLabel(shiftId), getEmployeeInfo(employeeId)]);
      await notifyAdmins(
        "shift_offered",
        `${emp.name} offered a shift`,
        `${shift.label} is now on the marketplace.`,
        "/shift-marketplace",
        { shift_id: shiftId, employee_id: employeeId }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-marketplace"] });
      toast.success("Shift offered to marketplace");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useRequestShift() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const { notifyAdmins } = useNotifyEvent();

  return useMutation({
    mutationFn: async ({ listingId, employeeId, shiftId, notes }: { listingId: string; employeeId: string; shiftId?: string; notes?: string }) => {
      if (!tenantId) throw new Error("No tenant");

      const { data, error } = await supabase
        .from("shift_marketplace_requests" as any)
        .insert({
          tenant_id: tenantId,
          listing_id: listingId,
          requested_by: employeeId,
          status: "pending",
          notes: notes || null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Notify admins with details
      const emp = await getEmployeeInfo(employeeId);
      let shiftLabel = "a marketplace shift";
      if (shiftId) {
        const shift = await getShiftLabel(shiftId);
        shiftLabel = shift.label;
      }
      await notifyAdmins(
        "shift_requested",
        `${emp.name} requested a shift`,
        `${shiftLabel} — approval needed.`,
        "/shift-marketplace",
        { listing_id: listingId, employee_id: employeeId }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["my-marketplace-requests"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-pending-approvals"] });
      toast.success("Shift request submitted for approval");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useApproveRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const { notify, notifyMany } = useNotifyEvent();

  return useMutation({
    mutationFn: async ({ requestId, listingId, shiftId, newEmployeeId }: {
      requestId: string; listingId: string; shiftId: string; newEmployeeId: string;
    }) => {
      await assertPermission("edit_schedules", tenantId);
      // 1. Update request status
      await supabase
        .from("shift_marketplace_requests" as any)
        .update({ status: "approved", reviewed_by: user?.id, reviewed_at: new Date().toISOString() } as any)
        .eq("id", requestId);

      // 2. Get old employee before reassign
      const { data: oldShift } = await supabase
        .from("shifts")
        .select("employee_id")
        .eq("id", shiftId)
        .single();
      const oldEmployeeId = oldShift?.employee_id;

      // 3. Reassign shift
      await supabase
        .from("shifts")
        .update({ employee_id: newEmployeeId })
        .eq("id", shiftId);

      // 4. Close listing
      await supabase
        .from("shift_marketplace" as any)
        .update({ status: "claimed" } as any)
        .eq("id", listingId);

      // 5. Reject other pending requests for same listing
      const { data: rejectedRequests } = await supabase
        .from("shift_marketplace_requests" as any)
        .update({ status: "rejected", reviewed_by: user?.id, reviewed_at: new Date().toISOString(), review_notes: "Another request was approved" } as any)
        .eq("listing_id", listingId)
        .eq("status", "pending")
        .neq("id", requestId)
        .select("requested_by");

      // 6. Notifications
      const [shift, newEmp] = await Promise.all([getShiftLabel(shiftId), getEmployeeInfo(newEmployeeId)]);

      // Notify the approved requester
      if (newEmp.userId) {
        await notify({
          userId: newEmp.userId,
          eventType: "shift_claim_approved",
          title: "Shift request approved",
          body: `You've been assigned: ${shift.label}.`,
          link: "/schedule",
          metadata: { shift_id: shiftId, listing_id: listingId },
        });
      }

      // Notify old employee that their shift was picked up
      if (oldEmployeeId && oldEmployeeId !== newEmployeeId) {
        const oldEmp = await getEmployeeInfo(oldEmployeeId);
        if (oldEmp.userId) {
          await notify({
            userId: oldEmp.userId,
            eventType: "shift_cover_found",
            title: "Cover found for your shift",
            body: `${newEmp.name} will cover ${shift.label}.`,
            link: "/schedule",
            metadata: { shift_id: shiftId, covered_by: newEmployeeId },
          });
        }
      }

      // Notify rejected requesters
      if (rejectedRequests && rejectedRequests.length > 0) {
        const rejectedEmpIds = (rejectedRequests as any[]).map(r => r.requested_by).filter(Boolean);
        if (rejectedEmpIds.length > 0) {
          const { data: rejEmps } = await supabase
            .from("employees" as any)
            .select("id, user_id")
            .in("id", rejectedEmpIds);
          const rejUserIds = ((rejEmps || []) as any[]).map(e => e.user_id).filter(Boolean);
          if (rejUserIds.length > 0) {
            await notifyMany(
              rejUserIds,
              "shift_claim_rejected",
              "Shift request not approved",
              `${shift.label} was assigned to another team member.`,
              "/shift-marketplace",
              { shift_id: shiftId, listing_id: listingId }
            );
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Request approved – shift reassigned");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useRejectRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { notify } = useNotifyEvent();

  return useMutation({
    mutationFn: async ({ requestId, employeeId, shiftId, reviewNotes }: { requestId: string; employeeId?: string; shiftId?: string; reviewNotes?: string }) => {
      await supabase
        .from("shift_marketplace_requests" as any)
        .update({ status: "rejected", reviewed_by: user?.id, reviewed_at: new Date().toISOString(), review_notes: reviewNotes || null } as any)
        .eq("id", requestId);

      // Notify the requester
      if (employeeId) {
        const emp = await getEmployeeInfo(employeeId);
        if (emp.userId) {
          let body = "Your shift request was not approved.";
          if (shiftId) {
            const shift = await getShiftLabel(shiftId);
            body = `Your request for ${shift.label} was not approved.${reviewNotes ? ` Reason: ${reviewNotes}` : ""}`;
          }
          await notify({
            userId: emp.userId,
            eventType: "shift_claim_rejected",
            title: "Shift request rejected",
            body,
            link: "/shift-marketplace",
            metadata: { request_id: requestId },
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-pending-approvals"] });
      toast.success("Request rejected");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useCancelListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listingId: string) => {
      await supabase
        .from("shift_marketplace" as any)
        .update({ status: "cancelled" } as any)
        .eq("id", listingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-marketplace"] });
      toast.success("Listing cancelled");
    },
  });
}
