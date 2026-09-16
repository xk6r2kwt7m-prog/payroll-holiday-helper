import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SignaturePad } from "@/components/letters/SignaturePad";
import { Loader2, Save, UserCheck, PenLine, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import { normaliseSendMode, type ContractSendMode } from "@/lib/contract-send-rules";

export function SignatorySettings() {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [sendMode, setSendMode] = useState<ContractSendMode>("manual");
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [savedSignatureAt, setSavedSignatureAt] = useState<string | null>(null);
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);
  const [redrawing, setRedrawing] = useState(false);

  const handleSignatureChange = useCallback((dataUrl: string | null) => {
    setDrawnSignature(dataUrl);
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      const { data } = await supabase
        .from("company_settings")
        .select(
          "default_signatory_name, default_signatory_email, default_signatory_title, contract_send_mode, default_signature_data, default_signature_updated_at"
        )
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (data) {
        setName((data as any).default_signatory_name || "");
        setEmail((data as any).default_signatory_email || "");
        setTitle((data as any).default_signatory_title || "");
        setSendMode(normaliseSendMode((data as any).contract_send_mode));
        setSavedSignature((data as any).default_signature_data || null);
        setSavedSignatureAt((data as any).default_signature_updated_at || null);
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

    const { data: existing } = await supabase
      .from("company_settings")
      .select("id")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const nextSignature = drawnSignature ?? savedSignature ?? null;
    const signatureChanged = nextSignature !== savedSignature;

    const updates = {
      default_signatory_name: name.trim() || null,
      default_signatory_email: email.trim() || null,
      default_signatory_title: title.trim() || null,
      contract_send_mode: sendMode,
      default_signature_data: nextSignature,
      default_signature_updated_at: signatureChanged
        ? new Date().toISOString()
        : savedSignatureAt,
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
      if (signatureChanged) {
        setSavedSignature(nextSignature);
        setSavedSignatureAt(updates.default_signature_updated_at);
      }
      setDrawnSignature(null);
      setRedrawing(false);
      toast.success("Contract settings saved");
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
        Their name and title will appear in the Employer signature block of the final signed contract.
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

      <div className="space-y-1.5">
        <Label className="text-xs">Job Title / Position</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Director, General Manager"
          className="h-9"
        />
        <p className="text-[10px] text-muted-foreground">
          This title appears on the final signed contract: "Signed for and on behalf of [Company] by [Name], [Title]"
        </p>
      </div>

      {(!name.trim() || !email.trim()) && (
        <p className="text-[10px] text-amber-600">
          ⚠ Both name and email are required for automatic employer signing to work.
        </p>
      )}

      {/* ── My saved signature ── */}
      <div className="rounded-lg border border-border p-3 space-y-3">
        <div className="flex items-center gap-2">
          <PenLine className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">My Signature</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Draw your signature once and reuse it. Every contract still needs your confirmation before it is applied.
        </p>

        {savedSignature && !redrawing ? (
          <div className="space-y-2">
            <div className="rounded-lg border border-border bg-white p-2">
              <img
                src={savedSignature}
                alt="Your saved signature"
                className="h-16 w-auto object-contain"
              />
            </div>
            {savedSignatureAt && (
              <p className="text-[10px] text-muted-foreground">
                Saved {new Date(savedSignatureAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setRedrawing(true)}>
                Replace signature
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSavedSignature(null);
                  setDrawnSignature(null);
                  setRedrawing(true);
                }}
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <SignaturePad onSignatureChange={handleSignatureChange} />
        )}
      </div>

      {/* ── When contracts are sent ── */}
      <div className="rounded-lg border border-border p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">When Contracts Are Sent</p>
        </div>
        <RadioGroup
          value={sendMode}
          onValueChange={(v) => setSendMode(v as ContractSendMode)}
          className="space-y-2"
        >
          <label className="flex items-start gap-2 cursor-pointer">
            <RadioGroupItem value="manual" className="mt-0.5" />
            <span className="text-xs">
              <span className="font-medium text-foreground">Only when I press Send</span>
              <span className="block text-muted-foreground">
                Nothing is emailed until you choose to send it.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <RadioGroupItem value="after_employer_signs" className="mt-0.5" />
            <span className="text-xs">
              <span className="font-medium text-foreground">Only after I have signed it</span>
              <span className="block text-muted-foreground">
                Sending stays locked until you sign, so staff always receive an already-signed contract.
              </span>
            </span>
          </label>
        </RadioGroup>
        <p className="text-[10px] text-muted-foreground">
          You can also set a "send on" date for an individual contract from its signing options.
        </p>
      </div>

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
              Save Settings
            </>
          )}
        </Button>
      </div>

    </div>
  );
}
