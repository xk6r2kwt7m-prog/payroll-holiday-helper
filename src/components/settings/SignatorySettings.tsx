import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

export function SignatorySettings() {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      const { data } = await supabase
        .from("company_settings")
        .select("default_signatory_name, default_signatory_email")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (data) {
        setName((data as any).default_signatory_name || "");
        setEmail((data as any).default_signatory_email || "");
      }
      setLoading(false);
    })();
  }, [tenantId]);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSave = async () => {
    if (!tenantId) return;
    if (email && !isValidEmail(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSaving(true);

    // Check if settings exist
    const { data: existing } = await supabase
      .from("company_settings")
      .select("id")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const updates = {
      default_signatory_name: name.trim() || null,
      default_signatory_email: email.trim() || null,
    } as any;

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("company_settings")
        .update(updates)
        .eq("id", existing.id));
    } else {
      ({ error } = await supabase
        .from("company_settings")
        .insert({ ...updates, tenant_id: tenantId }));
    }

    setSaving(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Default signatory saved");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <UserCheck className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Default Employer Signatory</p>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        This person will automatically receive employer signing links when employees sign their contracts.
        You can override this per contract if needed.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Full Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Aderito Barros"
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Email Address</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. barros.aderito@hotmail.com"
            className="h-9"
          />
        </div>
      </div>

      {(!name.trim() || !email.trim()) && (
        <p className="text-[10px] text-amber-600">
          ⚠ Both name and email are required for automatic employer signing to work.
        </p>
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-3 w-3" />
              Save Signatory
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
