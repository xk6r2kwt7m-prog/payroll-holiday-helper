import { useState } from "react";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useAppNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllRead,
} from "@/hooks/useAppNotifications";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const EVENT_ICONS: Record<string, string> = {
  shift_published: "📅",
  shift_changed: "🔄",
  shift_cancelled: "🚫",
  holiday_request: "🏖️",
  holiday_submitted: "🏖️",
  holiday_approved: "✅",
  holiday_rejected: "❌",
  timesheet_review: "⏱️",
  evidence_requested: "📎",
  document_expiry: "📄",
  document_expiry_warning: "⏳",
  document_expired: "🔴",
  document_verified: "✅",
  document_rejected: "⚠️",
  document_uploaded: "📤",
  onboarding_completed: "🎉",
  announcement: "📢",
  shift_offered: "🔄",
  shift_requested: "🙋",
  payroll_ready: "💰",
  training_assigned: "📚",
  training_completed: "🎓",
  training_due_soon: "⏰",
  training_overdue: "🚨",
  shift_claim_approved: "✅",
  shift_claim_rejected: "❌",
  shift_cover_found: "🤝",
  general: "🔔",
};

export function NotificationBell() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: notifications = [] } = useAppNotifications();
  const { data: unreadCount = 0 } = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();

  const handleClick = (notification: any) => {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
          <h3 className="text-sm font-semibold">{t("notifications.title")}</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-3 w-3" />
              {t("notifications.mark_all_read")}
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[360px]">
          {notifications.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t("notifications.empty")}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 transition-colors hover:bg-muted/50",
                    !n.is_read && "bg-primary/5"
                  )}
                >
                  <div className="flex gap-2.5">
                    <span className="text-base shrink-0 mt-0.5">
                      {EVENT_ICONS[n.event_type] || EVENT_ICONS.general}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1.5">
                        <p className={cn("text-xs leading-snug", !n.is_read ? "font-semibold text-foreground" : "text-muted-foreground")}>
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                        )}
                      </div>
                      {n.body && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {n.link && (
                      <ExternalLink className="h-3 w-3 text-muted-foreground/40 shrink-0 mt-1" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
