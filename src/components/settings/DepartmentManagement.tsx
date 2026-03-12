import { useState } from "react";
import { Plus, Edit2, Loader2, MoreHorizontal, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEmployees } from "@/hooks/useEmployees";
import { toast } from "sonner";

interface Department {
  key: string;
  label: string;
  emoji: string;
  description: string;
  isSystem: boolean;
  isActive: boolean;
}

const SYSTEM_DEPARTMENTS: Department[] = [
  { key: "FOH", label: "Front of House", emoji: "🍽️", description: "Customer-facing roles", isSystem: true, isActive: true },
  { key: "BOH", label: "Back of House", emoji: "👨‍🍳", description: "Kitchen & prep roles", isSystem: true, isActive: true },
  { key: "CPU", label: "Central Production", emoji: "🏭", description: "Central production unit", isSystem: true, isActive: true },
];

export function DepartmentManagement() {
  const { data: employees = [] } = useEmployees();
  const [departments, setDepartments] = useState<Department[]>(SYSTEM_DEPARTMENTS);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state
  const [formLabel, setFormLabel] = useState("");
  const [formEmoji, setFormEmoji] = useState("📋");
  const [formDescription, setFormDescription] = useState("");
  const [formActive, setFormActive] = useState(true);

  const deptCounts = departments.map(d => ({
    ...d,
    count: employees.filter(e => e.department === d.key && e.status === "active").length,
  }));

  const openCreate = () => {
    setEditingDept(null);
    setFormLabel("");
    setFormEmoji("📋");
    setFormDescription("");
    setFormActive(true);
    setIsDialogOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormLabel(dept.label);
    setFormEmoji(dept.emoji);
    setFormDescription(dept.description);
    setFormActive(dept.isActive);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formLabel.trim()) {
      toast.error("Department name is required");
      return;
    }

    if (editingDept) {
      setDepartments(prev =>
        prev.map(d =>
          d.key === editingDept.key
            ? { ...d, label: formLabel, emoji: formEmoji, description: formDescription, isActive: formActive }
            : d
        )
      );
      toast.success(`${formLabel} updated`);
    } else {
      const key = formLabel.toUpperCase().replace(/\s+/g, "_").slice(0, 10);
      if (departments.some(d => d.key === key)) {
        toast.error("Department key already exists");
        return;
      }
      setDepartments(prev => [
        ...prev,
        { key, label: formLabel, emoji: formEmoji, description: formDescription, isSystem: false, isActive: formActive },
      ]);
      toast.success(`${formLabel} created`);
    }
    setIsDialogOpen(false);
    setEditingDept(null);
  };

  const toggleArchive = (dept: Department) => {
    setDepartments(prev =>
      prev.map(d =>
        d.key === dept.key ? { ...d, isActive: !d.isActive } : d
      )
    );
    toast.success(`${dept.label} ${dept.isActive ? "archived" : "restored"}`);
  };

  const activeDepts = deptCounts.filter(d => d.isActive);
  const archivedDepts = deptCounts.filter(d => !d.isActive);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {activeDepts.length} active department{activeDepts.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={openCreate} className="text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Department
        </Button>
      </div>

      {/* Active departments */}
      <div className="space-y-2">
        {activeDepts.map((dept) => (
          <div
            key={dept.key}
            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
          >
            <span className="text-lg">{dept.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{dept.label}</p>
                {dept.isSystem && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground">System</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{dept.description}</p>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">
              {dept.count} active
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(dept)}>
                  <Edit2 className="h-3.5 w-3.5 mr-2" />
                  Edit
                </DropdownMenuItem>
                {!dept.isSystem && (
                  <DropdownMenuItem onClick={() => toggleArchive(dept)} className="text-destructive">
                    <Archive className="h-3.5 w-3.5 mr-2" />
                    Archive
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      {/* Archived */}
      {archivedDepts.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Archived</p>
          {archivedDepts.map((dept) => (
            <div
              key={dept.key}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 opacity-60"
            >
              <span className="text-lg">{dept.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{dept.label}</p>
              </div>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => toggleArchive(dept)}>
                Restore
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingDept ? "Edit Department" : "Add Department"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-[60px_1fr] gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Emoji</Label>
                <Input value={formEmoji} onChange={e => setFormEmoji(e.target.value)} className="h-9 text-center text-lg" maxLength={2} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Name *</Label>
                <Input value={formLabel} onChange={e => setFormLabel(e.target.value)} placeholder="e.g. Bar Staff" className="h-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Short description" className="h-9" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Active</span>
              <Switch checked={formActive} onCheckedChange={setFormActive} />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>
              {editingDept ? "Save Changes" : "Create Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
