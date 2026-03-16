/**
 * ModuleSignalMappingManager — Admin-only component
 *
 * Shows resolved signal mappings for a module.
 * Auto-derived mappings shown alongside manual overrides.
 * Admins can toggle, add manual, or disable auto mappings.
 */

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Link2,
  Unlink,
  Zap,
  UserPen,
  Info,
  Trash2,
} from "lucide-react";
import { useModuleSignalMappings } from "@/hooks/useModuleSignalMappings";
import {
  deriveSignalTags,
  resolveModuleMappings,
  getSignalTagLabel,
  ALL_SIGNAL_TAGS,
  type ResolvedMapping,
} from "@/lib/signal-mapping";
import type { StandardsMetadata } from "@/data/training-standards/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  moduleId: string;
  standardsMetadata: StandardsMetadata | null | undefined;
  readOnly?: boolean;
}

export function ModuleSignalMappingManager({ moduleId, standardsMetadata, readOnly }: Props) {
  const { mappings, upsertMapping, toggleMapping, deleteMapping } =
    useModuleSignalMappings(moduleId);
  const [addOpen, setAddOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const autoTags = useMemo(
    () => deriveSignalTags(standardsMetadata),
    [standardsMetadata]
  );

  const resolved = useMemo(
    () => resolveModuleMappings(autoTags, mappings),
    [autoTags, mappings]
  );

  const activeMappings = resolved.filter((m) => m.is_active);
  const inactiveMappings = resolved.filter((m) => !m.is_active);

  // Tags not yet mapped — available for manual add
  const availableTags = ALL_SIGNAL_TAGS.filter(
    (t) => !resolved.some((m) => m.signal_tag === t)
  );

  const handleToggle = (mapping: ResolvedMapping, checked: boolean) => {
    if (mapping.record_id) {
      toggleMapping.mutate({ id: mapping.record_id, is_active: checked });
    } else {
      // Auto-derived, not yet persisted — create a DB record to disable it
      upsertMapping.mutate({
        module_id: moduleId,
        signal_tag: mapping.signal_tag,
        mapping_source: "auto",
        is_active: checked,
      });
    }
  };

  const handleAddManual = () => {
    if (!newTag) return;
    upsertMapping.mutate(
      {
        module_id: moduleId,
        signal_tag: newTag,
        mapping_source: "manual",
        is_active: true,
        notes: newNotes || undefined,
      },
      {
        onSuccess: () => {
          setAddOpen(false);
          setNewTag("");
          setNewNotes("");
          toast.success("Manual mapping added");
        },
      }
    );
  };

  const handleDelete = (mapping: ResolvedMapping) => {
    if (mapping.record_id) {
      deleteMapping.mutate(mapping.record_id);
    }
  };

  if (resolved.length === 0 && readOnly) {
    return (
      <div className="text-xs text-muted-foreground italic py-2">
        No signal mappings configured for this module.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Signal Mappings
          </span>
          <Badge variant="outline" className="text-xs">
            {activeMappings.length} active
          </Badge>
        </div>
        {!readOnly && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                <Plus className="h-3 w-3" /> Add Manual
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Add Manual Signal Mapping</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div>
                  <Label className="text-xs">Signal Tag</Label>
                  <Select value={newTag} onValueChange={setNewTag}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select signal..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTags.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {getSignalTagLabel(tag)}
                        </SelectItem>
                      ))}
                      {availableTags.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                          All signals already mapped
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Notes (optional)</Label>
                  <Textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Why this mapping was added..."
                    className="text-xs"
                    rows={2}
                  />
                </div>
                <Button
                  onClick={handleAddManual}
                  disabled={!newTag || upsertMapping.isPending}
                  className="w-full"
                  size="sm"
                >
                  {upsertMapping.isPending ? "Saving..." : "Add Mapping"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Active mappings */}
      <div className="space-y-1">
        {activeMappings.map((m) => (
          <MappingRow
            key={m.signal_tag}
            mapping={m}
            readOnly={readOnly}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Inactive / disabled */}
      {inactiveMappings.length > 0 && (
        <div className="space-y-1 pt-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Disabled
          </p>
          {inactiveMappings.map((m) => (
            <MappingRow
              key={m.signal_tag}
              mapping={m}
              readOnly={readOnly}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {resolved.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          No signal tags derived. Add manual mappings or enrich the module's
          standards metadata.
        </p>
      )}
    </div>
  );
}

function MappingRow({
  mapping,
  readOnly,
  onToggle,
  onDelete,
}: {
  mapping: ResolvedMapping;
  readOnly?: boolean;
  onToggle: (m: ResolvedMapping, checked: boolean) => void;
  onDelete: (m: ResolvedMapping) => void;
}) {
  const isAuto = mapping.source === "auto";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors",
        mapping.is_active
          ? "border-border bg-card"
          : "border-border/50 bg-muted/30 opacity-60"
      )}
    >
      {/* Source badge */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] gap-0.5 shrink-0",
                isAuto
                  ? "bg-accent/50 text-accent-foreground"
                  : "bg-primary/10 text-primary"
              )}
            >
              {isAuto ? (
                <Zap className="h-2.5 w-2.5" />
              ) : (
                <UserPen className="h-2.5 w-2.5" />
              )}
              {isAuto ? "Auto" : "Manual"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-[200px]">
            {isAuto
              ? "Derived from standards metadata"
              : "Manually added by admin"}
            {mapping.notes && (
              <p className="mt-1 text-muted-foreground">{mapping.notes}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Tag label */}
      <span className="flex-1 truncate font-medium">
        {getSignalTagLabel(mapping.signal_tag)}
      </span>

      {/* Notes indicator */}
      {mapping.notes && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground shrink-0" />
            </TooltipTrigger>
            <TooltipContent className="text-xs max-w-[200px]">
              {mapping.notes}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Toggle + Delete */}
      {!readOnly && (
        <>
          <Switch
            checked={mapping.is_active}
            onCheckedChange={(checked) => onToggle(mapping, checked)}
            className="scale-75"
          />
          {mapping.record_id && mapping.source === "manual" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(mapping)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
