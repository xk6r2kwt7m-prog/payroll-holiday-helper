import { Bell, Calendar, ShoppingBag, Palmtree, FileCheck, GraduationCap, Megaphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useNotificationPreferences, PreferenceCategory } from "@/hooks/useNotificationPreferences";
import { useI18n } from "@/hooks/useI18n";
import { toast } from "sonner";

const CATEGORIES: {
  key: PreferenceCategory;
  icon: React.ElementType;
  labelKey: string;
  descKey: string;
  mandatory?: boolean;
}[] = [
  { key: "schedule_updates", icon: Calendar, labelKey: "settings.notif_pref.schedule", descKey: "settings.notif_pref.schedule_desc" },
  { key: "marketplace_activity", icon: ShoppingBag, labelKey: "settings.notif_pref.marketplace", descKey: "settings.notif_pref.marketplace_desc" },
  { key: "leave_updates", icon: Palmtree, labelKey: "settings.notif_pref.leave", descKey: "settings.notif_pref.leave_desc" },
  { key: "documents", icon: FileCheck, labelKey: "settings.notif_pref.documents", descKey: "settings.notif_pref.documents_desc" },
  { key: "training", icon: GraduationCap, labelKey: "settings.notif_pref.training", descKey: "settings.notif_pref.training_desc" },
  { key: "announcements", icon: Megaphone, labelKey: "settings.notif_pref.announcements", descKey: "settings.notif_pref.announcements_desc" },
];

export function NotificationPreferences() {
  const { t } = useI18n();
  const { preferences, isLoading, updatePreference } = useNotificationPreferences();

  const handleToggle = (category: PreferenceCategory, current: boolean) => {
    updatePreference.mutate(
      { category, enabled: !current },
      { onSuccess: () => toast.success("Preference updated") }
    );
  };

  if (isLoading) {
    return <div className="py-6 text-center text-sm text-muted-foreground">Loading preferences…</div>;
  }

  return (
    <div className="space-y-1">
      <div className="px-1 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{t("settings.notif_pref.title")}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{t("settings.notif_pref.subtitle")}</p>
      </div>

      <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden divide-y divide-border">
        {CATEGORIES.map(({ key, icon: Icon, labelKey, descKey }) => {
          const enabled = preferences[key];
          return (
            <div key={key} className="flex items-center gap-3 px-4 py-3">
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{t(labelKey)}</p>
                <p className="text-[11px] text-muted-foreground leading-snug">{t(descKey)}</p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={() => handleToggle(key, enabled)}
                disabled={updatePreference.isPending}
              />
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground/60 px-1 pt-2">
        {t("settings.notif_pref.mandatory_note")}
      </p>
    </div>
  );
}
