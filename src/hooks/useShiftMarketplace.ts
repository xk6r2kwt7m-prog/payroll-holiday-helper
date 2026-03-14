import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useNotifyEvent } from "@/hooks/useNotifyEvent";
import { toast } from "sonner";

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
  // Joined data
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
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-marketplace"] });
      notifyAdmins("shift_offered", "Shift offered to marketplace", "An employee has offered their shift on the marketplace", "/shift-marketplace");
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
    mutationFn: async ({ listingId, employeeId, notes }: { listingId: string; employeeId: string; notes?: string }) => {
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
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["my-marketplace-requests"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-pending-approvals"] });
      notifyAdmins("shift_requested", "Shift pickup requested", "An employee has requested to pick up a shift", "/shift-marketplace");
      toast.success("Shift request submitted for approval");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useApproveRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ requestId, listingId, shiftId, newEmployeeId }: {
      requestId: string; listingId: string; shiftId: string; newEmployeeId: string;
    }) => {
      // 1. Update request status
      await supabase
        .from("shift_marketplace_requests" as any)
        .update({ status: "approved", reviewed_by: user?.id, reviewed_at: new Date().toISOString() } as any)
        .eq("id", requestId);

      // 2. Reassign shift
      await supabase
        .from("shifts")
        .update({ employee_id: newEmployeeId })
        .eq("id", shiftId);

      // 3. Close listing
      await supabase
        .from("shift_marketplace" as any)
        .update({ status: "claimed" } as any)
        .eq("id", listingId);

      // 4. Reject other pending requests for same listing
      await supabase
        .from("shift_marketplace_requests" as any)
        .update({ status: "rejected", reviewed_by: user?.id, reviewed_at: new Date().toISOString(), review_notes: "Another request was approved" } as any)
        .eq("listing_id", listingId)
        .eq("status", "pending")
        .neq("id", requestId);
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

  return useMutation({
    mutationFn: async ({ requestId, reviewNotes }: { requestId: string; reviewNotes?: string }) => {
      await supabase
        .from("shift_marketplace_requests" as any)
        .update({ status: "rejected", reviewed_by: user?.id, reviewed_at: new Date().toISOString(), review_notes: reviewNotes || null } as any)
        .eq("id", requestId);
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
