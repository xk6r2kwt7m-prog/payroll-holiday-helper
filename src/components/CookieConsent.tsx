import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface ConsentPrefs {
  essential: true;
  analytics: boolean;
  preferences: boolean;
  timestamp: string;
}

const STORAGE_KEY = "uglo_cookie_consent";

function getStoredConsent(): ConsentPrefs | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeConsent(prefs: ConsentPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [managing, setManaging] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [preferences, setPreferences] = useState(false);

  useEffect(() => {
    const existing = getStoredConsent();
    if (!existing) {
      setVisible(true);
    }
  }, []);

  const accept = useCallback(() => {
    storeConsent({ essential: true, analytics: true, preferences: true, timestamp: new Date().toISOString() });
    setVisible(false);
  }, []);

  const reject = useCallback(() => {
    storeConsent({ essential: true, analytics: false, preferences: false, timestamp: new Date().toISOString() });
    setVisible(false);
  }, []);

  const savePrefs = useCallback(() => {
    storeConsent({ essential: true, analytics, preferences, timestamp: new Date().toISOString() });
    setVisible(false);
    setManaging(false);
  }, [analytics, preferences]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] p-4 sm:p-6">
      <div className="max-w-lg mx-auto rounded-xl border border-border bg-card shadow-lg p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Cookie preferences</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              We use essential cookies to keep the platform working. Optional cookies help us understand usage and remember your preferences.
            </p>
          </div>
          <button onClick={reject} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>

        {managing && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-foreground">Essential cookies</Label>
              <Switch checked disabled className="opacity-60" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-medium text-foreground">Analytics</Label>
                <p className="text-[10px] text-muted-foreground">Helps us understand how the platform is used</p>
              </div>
              <Switch checked={analytics} onCheckedChange={setAnalytics} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-medium text-foreground">Preferences</Label>
                <p className="text-[10px] text-muted-foreground">Remembers your display settings</p>
              </div>
              <Switch checked={preferences} onCheckedChange={setPreferences} />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {managing ? (
            <Button size="sm" onClick={savePrefs} className="text-xs">Save preferences</Button>
          ) : (
            <>
              <Button size="sm" onClick={accept} className="text-xs">Accept all</Button>
              <Button size="sm" variant="outline" onClick={reject} className="text-xs">Reject non-essential</Button>
              <Button size="sm" variant="ghost" onClick={() => setManaging(true)} className="text-xs">Manage</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Button to reopen consent preferences from footer/settings */
export function CookieSettingsButton() {
  const handleClick = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("storage"));
    window.location.reload();
  };

  return (
    <button onClick={handleClick} className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
      Cookie Settings
    </button>
  );
}
