import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ModuleUnavailableProps {
  moduleName?: string;
}

export function ModuleUnavailable({ moduleName }: ModuleUnavailableProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {moduleName ? `${moduleName} Module` : "Module"} Not Available
        </h1>
        <p className="text-muted-foreground mb-4">
          This module is not enabled for your company's current plan.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Contact your platform administrator to enable this feature or enquire about an upgrade.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate("/", { replace: true })} variant="outline">
            Return to Dashboard
          </Button>
          <Button
            onClick={() => {
              window.location.href = "mailto:support@uglyops.com?subject=Module%20Enquiry";
            }}
            className="gradient-primary"
          >
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
}
