import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateVacancy, useUpdateVacancy, type Vacancy } from "@/hooks/useVacancies";
import { toast } from "sonner";

interface VacancyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vacancy?: Vacancy | null;
}

export function VacancyFormDialog({ open, onOpenChange, vacancy }: VacancyFormDialogProps) {
  const createVacancy = useCreateVacancy();
  const updateVacancy = useUpdateVacancy();
  const isEdit = !!vacancy;

  const [form, setForm] = useState({
    title: vacancy?.title || "",
    description: vacancy?.description || "",
    location: vacancy?.location || "",
    country: vacancy?.country || "",
    employment_type: vacancy?.employment_type || "permanent",
    hourly_rate_min: vacancy?.hourly_rate_min?.toString() || "",
    hourly_rate_max: vacancy?.hourly_rate_max?.toString() || "",
    urgency: vacancy?.urgency || "normal",
    start_date: vacancy?.start_date || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Job title is required");
      return;
    }

    const payload = {
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      country: form.country || null,
      employment_type: form.employment_type,
      hourly_rate_min: form.hourly_rate_min ? parseFloat(form.hourly_rate_min) : null,
      hourly_rate_max: form.hourly_rate_max ? parseFloat(form.hourly_rate_max) : null,
      urgency: form.urgency,
      start_date: form.start_date || null,
    };

    try {
      if (isEdit) {
        await updateVacancy.mutateAsync({ id: vacancy.id, ...payload });
        toast.success("Vacancy updated");
      } else {
        await createVacancy.mutateAsync(payload);
        toast.success("Vacancy created as draft");
      }
      onOpenChange(false);
    } catch {
      toast.error("Failed to save vacancy");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Vacancy" : "Post a Vacancy"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Job Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Head Chef, Bartender, Restaurant Manager"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="What does this role involve? What are you looking for?"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Soho, London"
              />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="e.g. United Kingdom"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Employment Type</Label>
              <Select value={form.employment_type} onValueChange={(v) => setForm({ ...form, employment_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="temporary">Temporary</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Urgency</Label>
              <Select value={form.urgency} onValueChange={(v) => setForm({ ...form, urgency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Hourly Rate Min (£)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.hourly_rate_min}
                onChange={(e) => setForm({ ...form, hourly_rate_min: e.target.value })}
                placeholder="e.g. 12.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Hourly Rate Max (£)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.hourly_rate_max}
                onChange={(e) => setForm({ ...form, hourly_rate_max: e.target.value })}
                placeholder="e.g. 16.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createVacancy.isPending || updateVacancy.isPending}>
              {isEdit ? "Save Changes" : "Create Draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
