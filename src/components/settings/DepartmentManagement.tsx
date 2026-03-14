import { useState } from "react";
import { Plus, Edit2, MoreHorizontal, Archive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEmployees } from "@/hooks/useEmployees";
import { useDepartments, useCreateDepartment, useUpdateDepartment } from "@/hooks/useDepartments";
import { toast } from "sonner";

export function DepartmentManagement() {
  const { data: employees = [] } = useEmployees();
  const { data: departments = [], isLoading } = useDepartments(true);
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();

  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
    setFormLabel(""); setFormEmoji("📋"); setFormDescription(""); setFormActive(true);
    setIsDialogOpen(true);
  };

  const openEdit = (dept: any) => {
    setEditingDept(dept);
    setFormLabel(dept.label); setFormEmoji(dept.emoji); setFormDescription(dept.description || ""); setFormActive(dept.is_active);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formLabel.trim()) { toast.error("Department name is required"); return; }

    try {
      if (editingDept) {
        await updateDept.mutateAsync({
          id: editingDept.id,
          updates: { label: formLabel, emoji: formEmoji, description: formDescription, is_active: formActive },
        });
        toast.success(`${formLabel} updated`);
      } else {
        const key = formLabel.toUpperCase().replace(/\s+/g, "_").slice(0, 10);
        await createDept.mutateAsync({ key, label: formLabel, emoji: formEmoji, description: formDescription });
        toast.success(`${formLabel} created`);
      }
      setIsDialogOpen(false);
      setEditingDept(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save department");
    }
  };

  const toggleArchive = async (dept: any) => {
    await updateDept.mutateAsync({ id: dept.id, updates: { is_active: !dept.is_active } });
    toast.success(`${dept.label} ${dept.is_active ? "archived" : "restored"}`);
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const activeDepts = deptCounts.filter(d => d.is_active);
  const archivedDepts = deptCounts.filter(d => !d.is_active);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{activeDepts.length} active department{activeDepts.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={openCreate} className="text-xs"><Plus className="h-3.5 w-3.5 mr-1" />Add Department</Button>
      </div>

      <div className="space-y-2">
        {activeDepts.map((dept) => (
          <div key={dept.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
            <span className="text-lg">{dept.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{dept.label}</p>
                {dept.is_system && <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground">System</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">{dept.description}</p>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">{dept.count} active</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(dept)}><Edit2 className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                {!dept.is_system && (
                  <DropdownMenuItem onClick={() => toggleArchive(dept)} className="text-destructive"><Archive className="h-3.5 w-3.5 mr-2" />Archive</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      {archivedDepts.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Archived</p>
          {archivedDepts.map((dept) => (
            <div key={dept.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 opacity-60">
              <span className="text-lg">{dept.emoji}</span>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground">{dept.label}</p></div>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => toggleArchive(dept)}>Restore</Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingDept ? "Edit Department" : "Add Department"}</DialogTitle></DialogHeader>
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
            <Button size="sm" onClick={handleSave} disabled={createDept.isPending || updateDept.isPending}>
              {editingDept ? "Save Changes" : "Create Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
