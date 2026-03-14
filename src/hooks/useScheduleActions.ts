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
import { assertPermission } from "@/lib/permission-guard";

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
      await assertPermission("edit_schedules", tenantId);
      const { data: { user } } = await supabase.auth.getUser();
      await createShift.mutateAsync({ ...data, created_by: user?.id });
      toast.success("Shift added");
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [tenantId, createShift]);

  const notifyShiftChange = useCallback(async (
    userId: string,
    title: string,
    body: string,
    metadata: Record<string, any> = {}
  ) => {
    if (!tenantId) return;
    try {
      await supabase.from("notifications" as any).insert({
        tenant_id: tenantId,
        user_id: userId,
        event_type: "shift_changed",
        title,
        body,
        link: "/schedule",
        metadata,
      } as any);
    } catch (err) {
      console.warn("Failed to send shift change notification:", err);
    }
  }, [tenantId]);

  const handleUpdateShift = useCallback(async (id: string, updates: any) => {
    try {
      await assertPermission("edit_schedules", tenantId);
      // Fetch the current shift before updating to detect published-shift changes
      const { data: oldShift } = await supabase
        .from("shifts")
        .select("*, employees(user_id, forename, surname)")
        .eq("id", id)
        .single();

      await updateShift.mutateAsync({ id, updates });
      toast.success("Shift updated");

      // Only notify for published shifts
      if (!oldShift?.is_published) return;
      const shiftDate = format(new Date(oldShift.shift_date + "T00:00:00"), "EEE d MMM");

      // Case 1: Time changed
      if (updates.start_time || updates.end_time) {
        const oldTimes = `${oldShift.start_time?.slice(0, 5)}–${oldShift.end_time?.slice(0, 5)}`;
        const newStart = updates.start_time?.slice(0, 5) || oldShift.start_time?.slice(0, 5);
        const newEnd = updates.end_time?.slice(0, 5) || oldShift.end_time?.slice(0, 5);
        const newTimes = `${newStart}–${newEnd}`;
        const emp = oldShift.employees as any;
        if (emp?.user_id && oldTimes !== newTimes) {
          await notifyShiftChange(
            emp.user_id,
            "Shift time changed",
            `Your ${shiftDate} shift changed from ${oldTimes} to ${newTimes}.`,
            { shift_id: id, old_times: oldTimes, new_times: newTimes }
          );
        }
      }

      // Case 2: Reassigned to a different employee
      if (updates.employee_id !== undefined && updates.employee_id !== oldShift.employee_id) {
        const times = `${oldShift.start_time?.slice(0, 5)}–${oldShift.end_time?.slice(0, 5)}`;
        // Notify old employee (shift removed)
        const oldEmp = oldShift.employees as any;
        if (oldEmp?.user_id) {
          await notifyShiftChange(
            oldEmp.user_id,
            "Shift removed",
            `Your ${shiftDate} shift (${times}) has been reassigned.`,
            { shift_id: id }
          );
        }
        // Notify new employee (shift assigned)
        if (updates.employee_id) {
          const { data: newEmp } = await supabase
            .from("employees")
            .select("user_id")
            .eq("id", updates.employee_id)
            .maybeSingle();
          if (newEmp?.user_id) {
            await notifyShiftChange(
              newEmp.user_id,
              "New shift assigned",
              `You've been assigned a shift on ${shiftDate} (${times}).`,
              { shift_id: id }
            );
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [updateShift, notifyShiftChange, tenantId]);

  const handleDeleteShift = useCallback(async (id: string) => {
    if (!confirm("Delete this shift?")) return;
    try {
      await assertPermission("edit_schedules", tenantId);
      // Fetch shift before deleting to notify if published
      const { data: shift } = await supabase
        .from("shifts")
        .select("*, employees(user_id, forename, surname)")
        .eq("id", id)
        .single();

      deleteShift.mutate(id, {
        onSuccess: async () => {
          toast.success("Shift deleted");
          if (shift?.is_published) {
            const emp = shift.employees as any;
            if (emp?.user_id) {
              const shiftDate = format(new Date(shift.shift_date + "T00:00:00"), "EEE d MMM");
              const times = `${shift.start_time?.slice(0, 5)}–${shift.end_time?.slice(0, 5)}`;
              await notifyShiftChange(
                emp.user_id,
                "Shift cancelled",
                `Your ${shiftDate} shift (${times}) has been removed from the rota.`,
                { shift_id: id }
              );
            }
          }
        },
        onError: (err) => toast.error(err.message),
      });
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [deleteShift, notifyShiftChange, tenantId]);

  const handlePublish = useCallback(async () => {
    try {
      await assertPermission("publish_schedules", tenantId);
      const { data: { user } } = await supabase.auth.getUser();
      await publishWeek.mutateAsync({
        startDate: weekStartStr,
        endDate: weekEndStr,
        branch: selectedBranch,
        userId: user?.id,
      });
      toast.success(`${selectedBranch} rota published — staff will be notified`);

      // In-app notifications: notify all assigned staff for this week
      const weekShifts = branchShifts.filter((s: any) => s.employee_id);
      const uniqueUserIds = new Map<string, string>();
      for (const s of weekShifts) {
        const emp = (s as any).employees;
        if (emp?.user_id && !uniqueUserIds.has(emp.user_id)) {
          uniqueUserIds.set(emp.user_id, `${emp.forename} ${emp.surname}`);
        }
      }
      if (uniqueUserIds.size > 0 && tenantId) {
        const dateLabel = `${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM")}`;
        const rows = Array.from(uniqueUserIds.keys()).map((uid) => ({
          tenant_id: tenantId,
          user_id: uid,
          event_type: "shift_published",
          title: "New rota published",
          body: `Your ${selectedBranch} schedule for ${dateLabel} is ready. Check your shifts.`,
          link: "/schedule",
          metadata: { branch: selectedBranch, week_start: weekStartStr },
        }));
        await supabase.from("notifications" as any).insert(rows as any);
      }

      // Email notification to admin
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
  }, [publishWeek, weekStartStr, weekEndStr, selectedBranch, companySettings, sendNotification, weekStart, weekEnd, branchShifts, tenantId]);

  const handleUnpublish = useCallback(async () => {
    if (!confirm("Unpublish this week's rota? Staff will no longer see it.")) return;
    try {
      await assertPermission("publish_schedules", tenantId);
      await unpublishWeek.mutateAsync({ startDate: weekStartStr, endDate: weekEndStr, branch: selectedBranch });
      toast.success("Rota unpublished");
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [unpublishWeek, weekStartStr, weekEndStr, selectedBranch, tenantId]);

  const handleCopyPrevWeek = useCallback(async (prevStart: string, prevEnd: string) => {
    try {
      await assertPermission("edit_schedules", tenantId);
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
  }, [copyPrevWeek, weekStartStr, selectedBranch, selectedDept, tenantId]);

  const handleSaveTemplate = useCallback(async (name: string) => {
    try {
      await assertPermission("edit_schedules", tenantId);
      const currentShifts = branchDeptShifts.map((s: any) => {
        const shiftDate = new Date(s.shift_date + "T00:00:00");
        const dayOfWeek = shiftDate.getDay() === 0 ? 6 : shiftDate.getDay() - 1;
        return { day_of_week: dayOfWeek, employee_id: s.employee_id, start_time: s.start_time, end_time: s.end_time, notes: s.notes || null };
      });
      await saveTemplate.mutateAsync({ name, branch: selectedBranch, department: selectedDept, shifts: currentShifts });
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [saveTemplate, branchDeptShifts, selectedBranch, selectedDept, tenantId]);

  const handleLoadTemplate = useCallback(async (templateId: string) => {
    try {
      await assertPermission("edit_schedules", tenantId);
      const result = await loadTemplate.mutateAsync({ templateId, targetWeekStart: weekStartStr, branch: selectedBranch, department: selectedDept });
      toast.success(`Loaded ${(result as any[])?.length || 0} shifts from template`);
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [loadTemplate, weekStartStr, selectedBranch, selectedDept, tenantId]);

  const notifyPublishedShiftStaff = useCallback(async (
    affectedShifts: any[],
    title: string,
    bodyFn: (s: any) => string,
    eventType: string = "shift_changed"
  ) => {
    if (!tenantId) return;
    const publishedAssigned = affectedShifts.filter((s: any) => s.is_published && s.employee_id);
    if (publishedAssigned.length === 0) return;

    // Group by user to send one notification per person
    const byUser = new Map<string, { name: string; dates: string[] }>();
    for (const s of publishedAssigned) {
      const emp = (s as any).employees;
      const userId = emp?.user_id;
      if (!userId) continue;
      const dateLabel = format(new Date(s.shift_date + "T00:00:00"), "EEE d MMM");
      if (!byUser.has(userId)) {
        byUser.set(userId, { name: `${emp.forename} ${emp.surname}`, dates: [] });
      }
      byUser.get(userId)!.dates.push(dateLabel);
    }

    const rows = Array.from(byUser.entries()).map(([userId, info]) => ({
      tenant_id: tenantId,
      user_id: userId,
      event_type: eventType,
      title,
      body: info.dates.length === 1
        ? bodyFn({ date: info.dates[0] })
        : bodyFn({ date: `${info.dates.length} shifts (${info.dates.slice(0, 3).join(", ")}${info.dates.length > 3 ? "…" : ""})` }),
      link: "/schedule",
      metadata: { branch: selectedBranch },
    }));

    try {
      await supabase.from("notifications" as any).insert(rows as any);
    } catch (err) {
      console.warn("Failed to send bulk shift notifications:", err);
    }
  }, [tenantId, selectedBranch]);

  const handleDeleteAllShifts = useCallback(async () => {
    if (!confirm(`Delete all ${branchDeptShifts.length} shifts for ${selectedDept} at ${selectedBranch} this week?`)) return;
    try {
      await assertPermission("edit_schedules", tenantId);
      const ids = branchDeptShifts.map((s: any) => s.id);
      if (ids.length === 0) return;

      const publishedAssigned = branchDeptShifts.filter((s: any) => s.is_published && s.employee_id);

      await bulkDelete.mutateAsync(ids);
      toast.success(`Deleted ${ids.length} shifts`);

      if (publishedAssigned.length > 0) {
        await notifyPublishedShiftStaff(
          publishedAssigned,
          "Shifts cancelled",
          ({ date }) => `Your ${date} at ${selectedBranch} has been removed from the rota. Check your schedule.`,
          "shift_cancelled"
        );
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [bulkDelete, branchDeptShifts, selectedDept, selectedBranch, notifyPublishedShiftStaff, tenantId]);

  const handleClearAssignments = useCallback(async () => {
    if (!confirm("Clear all employee assignments? This turns them into open shifts.")) return;
    const assigned = branchDeptShifts.filter((s: any) => s.employee_id);
    const ids = assigned.map((s: any) => s.id);
    if (ids.length === 0) return;

    // Capture published+assigned shifts before clearing
    const publishedAssigned = assigned.filter((s: any) => s.is_published);

    await bulkUpdate.mutateAsync({ shiftIds: ids, updates: { employee_id: null, status: "open" as const } });
    toast.success(`Cleared ${ids.length} assignments`);

    if (publishedAssigned.length > 0) {
      await notifyPublishedShiftStaff(
        publishedAssigned,
        "Shift assignment removed",
        ({ date }) => `Your ${date} at ${selectedBranch} is no longer assigned to you. Check your schedule.`,
        "shift_changed"
      );
    }
  }, [bulkUpdate, branchDeptShifts, selectedBranch, notifyPublishedShiftStaff]);

  const handleRemoveEmptyShifts = useCallback(async () => {
    const emptyShifts = branchDeptShifts.filter((s: any) => !s.employee_id);
    if (emptyShifts.length === 0) { toast.info("No empty shifts to remove"); return; }
    if (!confirm(`Remove ${emptyShifts.length} empty shifts?`)) return;
    await bulkDelete.mutateAsync(emptyShifts.map((s: any) => s.id));
    toast.success(`Removed ${emptyShifts.length} empty shifts`);
  }, [bulkDelete, branchDeptShifts]);

  const handleBulkUpdateTimes = useCallback(async (startTime: string, endTime: string) => {
    const ids = branchDeptShifts.map((s: any) => s.id);
    if (ids.length === 0) return;

    // Capture published+assigned shifts before updating
    const publishedAssigned = branchDeptShifts.filter((s: any) => s.is_published && s.employee_id);

    await bulkUpdate.mutateAsync({ shiftIds: ids, updates: { start_time: startTime, end_time: endTime } });
    toast.success(`Updated times for ${ids.length} shifts`);

    if (publishedAssigned.length > 0) {
      await notifyPublishedShiftStaff(
        publishedAssigned,
        "Shift times changed",
        ({ date }) => `Your ${date} at ${selectedBranch} has new times: ${startTime.slice(0, 5)}–${endTime.slice(0, 5)}. Check your schedule.`,
        "shift_changed"
      );
    }
  }, [bulkUpdate, branchDeptShifts, selectedBranch, notifyPublishedShiftStaff]);

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

  // 10-minute publish rollback — compute from published_at timestamps
  const publishRollbackInfo = useMemo(() => {
    const publishedShifts = branchShifts.filter((s: any) => s.is_published && s.published_at);
    if (publishedShifts.length === 0) return { canUndo: false, timeRemaining: 0, publishedAt: null };

    // Find the most recent published_at among this week's shifts
    const latestPublishedAt = publishedShifts.reduce((latest: string, s: any) => {
      return s.published_at > latest ? s.published_at : latest;
    }, publishedShifts[0].published_at);

    const publishedTime = new Date(latestPublishedAt).getTime();
    const now = Date.now();
    const elapsed = now - publishedTime;
    const TEN_MINUTES = 10 * 60 * 1000;
    const remaining = TEN_MINUTES - elapsed;

    return {
      canUndo: remaining > 0,
      timeRemaining: Math.max(0, remaining),
      publishedAt: latestPublishedAt,
    };
  }, [branchShifts]);

  const handleUndoPublish = useCallback(async () => {
    if (!publishRollbackInfo.canUndo) {
      toast.error("Undo window has expired. You can still edit and re-publish individual shifts.");
      return;
    }
    if (!confirm("Undo publish? This will revert all recently published shifts back to draft. Staff will no longer see them.")) return;
    try {
      await unpublishWeek.mutateAsync({ startDate: weekStartStr, endDate: weekEndStr, branch: selectedBranch });
      toast.success("Publish reverted — shifts are back in draft");

      // Notify staff that the published rota has been withdrawn
      const publishedAssigned = branchShifts.filter((s: any) => s.is_published && s.employee_id);
      if (publishedAssigned.length > 0) {
        await notifyPublishedShiftStaff(
          publishedAssigned,
          "Rota withdrawn",
          ({ date }) => `The published rota for ${date} at ${selectedBranch} has been withdrawn. An updated rota will follow.`,
          "shift_cancelled"
        );
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [publishRollbackInfo.canUndo, unpublishWeek, weekStartStr, weekEndStr, selectedBranch, branchShifts, notifyPublishedShiftStaff]);

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
    // Publish rollback
    publishRollbackInfo,
    // Handlers
    handleCreateShift,
    handleUpdateShift,
    handleDeleteShift,
    handlePublish,
    handleUnpublish,
    handleUndoPublish,
    handleCopyPrevWeek,
    handleSaveTemplate,
    handleLoadTemplate,
    handleDeleteAllShifts,
    handleClearAssignments,
    handleRemoveEmptyShifts,
    handleBulkUpdateTimes,
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
