import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/hooks/useI18n";

interface ModuleUnavailableProps {
  moduleName?: string;
}

export function ModuleUnavailable({ moduleName }: ModuleUnavailableProps) {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {moduleName ? `${moduleName}` : t("modules.not_included", { module: "This module" })}
        </h1>
        <p className="text-muted-foreground mb-4">
          {t("modules.not_included", { module: moduleName || "This feature" })}
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          {t("modules.upgrade_prompt")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate("/", { replace: true })} variant="outline">
            {t("nav.dashboard")}
          </Button>
          <Button onClick={() => navigate("/settings?section=features")} className="gradient-primary">
            {t("common.upgrade")}
          </Button>
        </div>
      </div>
    </div>
  );
}
