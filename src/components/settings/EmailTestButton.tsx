import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

export function EmailTestButton() {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const { sendTestEmail } = useNotifications();

  const handleSend = async () => {
    if (!email.trim()) return;
    setIsSending(true);
    setResult(null);

    const res = await sendTestEmail(email.trim());

    if (res.success) {
      setResult({
        success: true,
        message: `Delivered via ${res.diagnostics?.provider || "provider"}${res.diagnostics?.message_id ? ` (ID: ${res.diagnostics.message_id})` : ""}`,
      });
    } else {
      setResult({
        success: false,
        message: res.error || "Unknown error",
      });
    }

    setIsSending(false);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Test Email Delivery</Label>
        <p className="text-[10px] text-muted-foreground">
          Send a test email to verify the notification pipeline is working correctly.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="recipient@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-9 flex-1"
          disabled={isSending}
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={isSending || !email.trim()}
          variant="outline"
        >
          {isSending ? (
            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Sending...</>
          ) : (
            <><Mail className="h-3.5 w-3.5 mr-1.5" />Send Test Email</>
          )}
        </Button>
      </div>

      {result && (
        <div
          className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs ${
            result.success
              ? "border-green-500/20 bg-green-500/5 text-green-700 dark:text-green-400"
              : "border-destructive/20 bg-destructive/5 text-destructive"
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          ) : (
            <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          )}
          <span>{result.message}</span>
        </div>
      )}
    </div>
  );
}
