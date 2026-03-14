import { useMemo, useCallback } from "react";
import { format, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import {
  useShifts, useCreateShift, useUpdateShift, useDeleteShift,
  usePublishWeek, useUnpublishWeek, useCopyPreviousWeek,
  useLoadTemplate, useBulkDeleteShifts, useBulkUpdateShifts, useBulkCreateShifts,
} from "@/hooks/useSchedule";
import { useSaveScheduleTemplate } from "@/hooks/useScheduleTemplates";
import { useTenant } from "@/hooks/useTenant";
import { useNotifications } from "@/hooks/useNotifications";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { type DayOfWeek, DAY_ABBR, getMinimumStaff } from "@/components/schedule/shiftDefaults";

interface UseScheduleActionsParams {
  currentDate: Date;
  selectedBranch: string;
  selectedDept: string;
}

export function useScheduleActions({ currentDate, selectedBranch, selectedDept }: UseScheduleActionsParams) {
  const { tenantId } = useTenant();
  const { sendNotification } = useNotifications();
  const { data: companySettings } = useCompanySettings();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");

  const { data: shifts, isLoading } = useShifts(weekStartStr, weekEndStr);

  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();
  const publishWeek = usePublishWeek();
  const unpublishWeek = useUnpublishWeek();
  const copyPrevWeek = useCopyPreviousWeek();
  const loadTemplate = useLoadTemplate();
  const saveTemplate = useSaveScheduleTemplate();
  const bulkDelete = useBulkDeleteShifts();
  const bulkUpdate = useBulkUpdateShifts();
  const bulkCreate = useBulkCreateShifts();

  // Filtered shift sets
  const branchShifts = useMemo(
    () => shifts?.filter((s: any) => s.branch === selectedBranch) || [],
    [shifts, selectedBranch]
  );

  const branchDeptShifts = useMemo(
    () => selectedDept === "All"
      ? branchShifts
      : branchShifts.filter((s: any) => s.department === selectedDept),
    [branchShifts, selectedDept]
  );

  const publishedCount = branchShifts.filter((s: any) => s.is_published).length;
  const unpublishedCount = branchShifts.filter((s: any) => !s.is_published && s.employee_id).length;
  const openShiftCount = branchShifts.filter((s: any) => !s.employee_id).length;
  const hasUnpublished = branchShifts.some((s: any) => !s.is_published);

  // Handlers
  const handleCreateShift = useCallback(async (data: any) => {
    if (!tenantId) {
      toast.error("Unable to create shift: no workspace selected.");
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await createShift.mutateAsync({ ...data, created_by: user?.id });
      toast.success("Shift added");
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [tenantId, createShift]);

  const handleUpdateShift = useCallback(async (id: string, updates: any) => {
    try {
      await updateShift.mutateAsync({ id, updates });
      toast.success("Shift updated");
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [updateShift]);

  const handleDeleteShift = useCallback((id: string) => {
    if (confirm("Delete this shift?")) {
      deleteShift.mutate(id, {
        onSuccess: () => toast.success("Shift deleted"),
        onError: (err) => toast.error(err.message),
      });
    }
  }, [deleteShift]);

  const handlePublish = useCallback(async () => {
    try {
      await publishWeek.mutateAsync({
        startDate: weekStartStr,
        endDate: weekEndStr,
        branch: selectedBranch,
      });
      toast.success(`${selectedBranch} rota published — staff will be notified`);
      const adminEmail = companySettings?.company_email;
      if (adminEmail) {
        sendNotification({
          to: adminEmail,
          subject: `Schedule Published: ${selectedBranch} – ${format(weekStart, "d MMM")} to ${format(weekEnd, "d MMM")}`,
          type: "shift_update",
          data: {
            message: `The ${selectedBranch} rota for ${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM")} has been published.`,
            shift_date: weekStartStr,
            start_time: format(weekStart, "d MMM"),
            end_time: format(weekEnd, "d MMM"),
            branch: selectedBranch,
          },
        });
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [publishWeek, weekStartStr, weekEndStr, selectedBranch, companySettings, sendNotification, weekStart, weekEnd]);

  const handleUnpublish = useCallback(async () => {
    if (!confirm("Unpublish this week's rota? Staff will no longer see it.")) return;
    try {
      await unpublishWeek.mutateAsync({ startDate: weekStartStr, endDate: weekEndStr, branch: selectedBranch });
      toast.success("Rota unpublished");
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [unpublishWeek, weekStartStr, weekEndStr, selectedBranch]);

  const handleCopyPrevWeek = useCallback(async (prevStart: string, prevEnd: string) => {
    try {
      const result = await copyPrevWeek.mutateAsync({
        prevStartDate: prevStart,
        prevEndDate: prevEnd,
        targetWeekStart: weekStartStr,
        branch: selectedBranch,
        department: selectedDept,
      });
      toast.success(`Copied ${(result as any[])?.length || 0} shifts from last week`);
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [copyPrevWeek, weekStartStr, selectedBranch, selectedDept]);

  const handleSaveTemplate = useCallback(async (name: string) => {
    const currentShifts = branchDeptShifts.map((s: any) => {
      const shiftDate = new Date(s.shift_date + "T00:00:00");
      const dayOfWeek = shiftDate.getDay() === 0 ? 6 : shiftDate.getDay() - 1;
      return { day_of_week: dayOfWeek, employee_id: s.employee_id, start_time: s.start_time, end_time: s.end_time, notes: s.notes || null };
    });
    await saveTemplate.mutateAsync({ name, branch: selectedBranch, department: selectedDept, shifts: currentShifts });
  }, [saveTemplate, branchDeptShifts, selectedBranch, selectedDept]);

  const handleLoadTemplate = useCallback(async (templateId: string) => {
    try {
      const result = await loadTemplate.mutateAsync({ templateId, targetWeekStart: weekStartStr, branch: selectedBranch, department: selectedDept });
      toast.success(`Loaded ${(result as any[])?.length || 0} shifts from template`);
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [loadTemplate, weekStartStr, selectedBranch, selectedDept]);

  const handleDeleteAllShifts = useCallback(async () => {
    if (!confirm(`Delete all ${branchDeptShifts.length} shifts for ${selectedDept} at ${selectedBranch} this week?`)) return;
    const ids = branchDeptShifts.map((s: any) => s.id);
    if (ids.length === 0) return;
    await bulkDelete.mutateAsync(ids);
    toast.success(`Deleted ${ids.length} shifts`);
  }, [bulkDelete, branchDeptShifts, selectedDept, selectedBranch]);

  const handleClearAssignments = useCallback(async () => {
    if (!confirm("Clear all employee assignments? This turns them into open shifts.")) return;
    const assigned = branchDeptShifts.filter((s: any) => s.employee_id);
    const ids = assigned.map((s: any) => s.id);
    if (ids.length === 0) return;
    await bulkUpdate.mutateAsync({ shiftIds: ids, updates: { employee_id: null, status: "open" as const } });
    toast.success(`Cleared ${ids.length} assignments`);
  }, [bulkUpdate, branchDeptShifts]);

  const handleRemoveEmptyShifts = useCallback(async () => {
    const emptyShifts = branchDeptShifts.filter((s: any) => !s.employee_id);
    if (emptyShifts.length === 0) { toast.info("No empty shifts to remove"); return; }
    if (!confirm(`Remove ${emptyShifts.length} empty shifts?`)) return;
    await bulkDelete.mutateAsync(emptyShifts.map((s: any) => s.id));
    toast.success(`Removed ${emptyShifts.length} empty shifts`);
  }, [bulkDelete, branchDeptShifts]);

  const handleBulkCreateShifts = useCallback(async (newShifts: any[]) => {
    if (!tenantId) { toast.error("No workspace selected"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const withCreator = newShifts.map((s) => ({ ...s, created_by: user?.id || null }));
    await bulkCreate.mutateAsync(withCreator as any);
    toast.success(`Created ${newShifts.length} shift${newShifts.length !== 1 ? "s" : ""}`);
  }, [tenantId, bulkCreate]);

  // Coverage stats
  const understaffedDays = useMemo(() => {
    let count = 0;
    const dept = selectedDept === "All" ? "FOH" : selectedDept;
    for (const day of weekDays) {
      const dayAbbr = DAY_ABBR[day.getDay() === 0 ? 6 : day.getDay() - 1] as DayOfWeek;
      const dayShifts = branchDeptShifts.filter((s: any) => isSameDay(new Date(s.shift_date + "T00:00:00"), day));
      const assigned = dayShifts.filter((s: any) => s.employee_id).length;
      const min = getMinimumStaff(selectedBranch, dept as any, dayAbbr);
      if (assigned < min) count++;
    }
    return count;
  }, [branchDeptShifts, selectedBranch, selectedDept, weekDays]);

  return {
    // Data
    shifts,
    isLoading,
    branchShifts,
    branchDeptShifts,
    weekStart,
    weekEnd,
    weekDays,
    weekStartStr,
    weekEndStr,
    // Counts
    publishedCount,
    unpublishedCount,
    openShiftCount,
    hasUnpublished,
    understaffedDays,
    // Handlers
    handleCreateShift,
    handleUpdateShift,
    handleDeleteShift,
    handlePublish,
    handleUnpublish,
    handleCopyPrevWeek,
    handleSaveTemplate,
    handleLoadTemplate,
    handleDeleteAllShifts,
    handleClearAssignments,
    handleRemoveEmptyShifts,
    handleBulkCreateShifts,
    // Pending states
    isPending: createShift.isPending || updateShift.isPending,
    isPublishing: publishWeek.isPending,
    isCopying: copyPrevWeek.isPending,
    isSavingTemplate: saveTemplate.isPending,
    isLoadingTemplate: loadTemplate.isPending,
    isBulkCreating: bulkCreate.isPending,
  };
}
