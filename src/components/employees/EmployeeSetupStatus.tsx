import { 
  CheckCircle2, Clock, AlertTriangle, Send, FileText, Shield, 
  CreditCard, BookOpen, Calendar, Link2, Mail, ExternalLink, UserPlus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useInviteEmail } from "@/hooks/useInviteEmail";
import { toast } from "sonner";
import type { Employee } from "@/hooks/useEmployees";

interface SetupItem {
  key: string;
  label: string;
  status: "done" | "pending" | "warning";
  action?: { label: string; path?: string; onClick?: () => void };
  icon: any;
}

interface EmployeeSetupStatusProps {
  employee: Employee;
  compact?: boolean;
}

export function EmployeeSetupStatus({ employee, compact = false }: EmployeeSetupStatusProps) {
  const navigate = useNavigate();
  const { sendInviteEmail } = useInviteEmail();

  const handleSendInvite = async () => {
    if (!employee.email) {
      toast.error("Add an email address first.");
      return;
    }
    const result = await sendInviteEmail({
      recipientEmail: employee.email,
      employeeName: `${employee.forename} ${employee.surname}`,
      tenantId: employee.tenant_id,
    });
    if (result.success) {
      toast.success(`Invite sent to ${employee.email}`);
    } else {
      toast.error(`Invite failed: ${result.error || "Unknown error"}`);
    }
  };

  const items: SetupItem[] = [
    {
      key: "record",
      label: "Employee record created",
      status: "done",
      icon: CheckCircle2,
    },
    {
      key: "email",
      label: employee.email ? "Email on file" : "No email address",
      status: employee.email ? "done" : "warning",
      icon: Mail,
      action: !employee.email ? { label: "Add email", path: `/employees?edit=${employee.id}&tab=personal` } : undefined,
    },
    {
      key: "invite",
      label: employee.user_id ? "Account linked" : "Invite not sent",
      status: employee.user_id ? "done" : "pending",
      icon: employee.user_id ? Link2 : Send,
      action: !employee.user_id && employee.email ? { label: "Send invite", onClick: handleSendInvite } : undefined,
    },
    {
      key: "contract",
      label: "Contract",
      status: "pending",
      icon: FileText,
      action: { label: "Create contract", path: "/contracts" },
    },
    {
      key: "rtw",
      label: employee.settlement_status ? `RTW: ${employee.settlement_status.replace(/_/g, " ")}` : "Right to work pending",
      status: employee.settlement_status ? "done" : "warning",
      icon: Shield,
      action: !employee.settlement_status ? { label: "Complete RTW", path: `/employees?edit=${employee.id}&tab=rtw` } : undefined,
    },
    {
      key: "banking",
      label: employee.bank_account_no ? "Bank details on file" : "Bank details missing",
      status: employee.bank_account_no ? "done" : "pending",
      icon: CreditCard,
      action: !employee.bank_account_no ? { label: "Add bank details", path: `/employees?edit=${employee.id}&tab=banking` } : undefined,
    },
    {
      key: "training",
      label: "Training",
      status: "pending",
      icon: BookOpen,
      action: { label: "Assign training", path: "/training" },
    },
  ];

  const doneCount = items.filter(i => i.status === "done").length;
  const totalCount = items.length;
  const percentage = Math.round((doneCount / totalCount) * 100);

  if (compact) {
    const pendingItems = items.filter(i => i.status !== "done");
    if (pendingItems.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {pendingItems.slice(0, 3).map(item => (
          <Badge
            key={item.key}
            variant="outline"
            className={cn(
              "text-[10px] h-5 px-1.5 gap-0.5 cursor-pointer hover:bg-muted/50",
              item.status === "warning" ? "border-warning/40 text-warning bg-warning/5" : "border-muted-foreground/30 text-muted-foreground"
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (item.action?.onClick) item.action.onClick();
              else if (item.action?.path) navigate(item.action.path);
            }}
          >
            <item.icon className="h-3 w-3" />
            {item.label}
          </Badge>
        ))}
        {pendingItems.length > 3 && (
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-muted-foreground">
            +{pendingItems.length - 3} more
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          Setup Progress
        </h4>
        <Badge variant="outline" className="text-xs">
          {doneCount}/{totalCount} · {percentage}%
        </Badge>
      </div>

      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="space-y-1">
        {items.map(item => {
          const statusColor = item.status === "done" ? "text-success" : item.status === "warning" ? "text-warning" : "text-muted-foreground";
          return (
            <div
              key={item.key}
              className={cn(
                "flex items-center gap-2.5 py-1.5 px-2 rounded-md",
                item.action && "cursor-pointer hover:bg-muted/50 transition-colors"
              )}
              onClick={() => {
                if (item.action?.onClick) item.action.onClick();
                else if (item.action?.path) navigate(item.action.path);
              }}
              role={item.action ? "button" : undefined}
              tabIndex={item.action ? 0 : undefined}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", statusColor)} />
              <span className={cn("text-sm flex-1", item.status === "done" ? "text-foreground" : "text-muted-foreground")}>
                {item.label}
              </span>
              {item.action && (
                <span className="text-[11px] text-primary flex items-center gap-0.5">
                  {item.action.label}
                  <ExternalLink className="h-3 w-3" />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
