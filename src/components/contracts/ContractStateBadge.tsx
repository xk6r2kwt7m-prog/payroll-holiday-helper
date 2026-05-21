import { Badge } from "@/components/ui/badge";
import { contractStateLabel, type ContractState } from "@/lib/contract-amendments";

interface Props {
  state: ContractState | string | null | undefined;
  className?: string;
}

const STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  issued: "bg-warning/10 text-warning border-warning/30",
  signed: "bg-primary/10 text-primary border-primary/30",
  superseded: "bg-muted/50 text-muted-foreground border-border",
  terminated: "bg-destructive/10 text-destructive border-destructive/30",
};

export function ContractStateBadge({ state, className }: Props) {
  const key = state ?? "draft";
  return (
    <Badge
      variant="outline"
      className={`text-[10px] px-1.5 py-0 ${STYLES[key] || STYLES.draft} ${className || ""}`}
    >
      {contractStateLabel(state)}
    </Badge>
  );
}
