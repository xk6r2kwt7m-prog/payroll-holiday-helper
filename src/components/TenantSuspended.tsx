import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function TenantSuspended() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mx-auto">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Account Suspended</h1>
          <p className="text-muted-foreground mt-2">
            Your company workspace has been suspended. This may be due to billing or an administrative decision.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Please contact your account administrator or support to restore access.
          </p>
        </div>
        <Button variant="outline" onClick={signOut}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}
