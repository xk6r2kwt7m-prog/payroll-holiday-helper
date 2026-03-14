import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Lock, Image } from "lucide-react";

interface StepAccountProps {
  data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    logoUrl: string;
  };
  onChange: (field: string, value: string) => void;
  isExistingUser?: boolean;
}

export function StepAccount({ data, onChange, isExistingUser }: StepAccountProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Create your workspace</h2>
        <p className="text-sm text-muted-foreground mt-1">
          This workspace will be used to manage schedules, attendance, and payroll for your team.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">First name</Label>
          <Input
            placeholder="Alex"
            value={data.firstName}
            onChange={(e) => onChange("firstName", e.target.value)}
            className="h-12 rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Last name</Label>
          <Input
            placeholder="Morgan"
            value={data.lastName}
            onChange={(e) => onChange("lastName", e.target.value)}
            className="h-12 rounded-xl"
          />
        </div>
      </div>

      {!isExistingUser && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Business email</Label>
            <Input
              type="email"
              placeholder="you@company.com"
              value={data.email}
              onChange={(e) => onChange("email", e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Password</Label>
            <Input
              type="password"
              placeholder="Min 8 characters"
              value={data.password}
              onChange={(e) => onChange("password", e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Workspace name</Label>
        <Input
          placeholder="e.g. The Golden Fork"
          value={data.logoUrl}
          onChange={(e) => onChange("logoUrl", e.target.value)}
          className="h-12 rounded-xl"
        />
        <p className="text-[11px] text-muted-foreground">This is your company or venue name</p>
      </div>
    </div>
  );
}
