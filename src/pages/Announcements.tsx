import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useEmployees } from "@/hooks/useEmployees";
import { useAnnouncements, useCreateAnnouncement, usePublishAnnouncement, useDeleteAnnouncement, useReadReceipts } from "@/hooks/useAnnouncements";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Megaphone, Plus, Trash2, Send, Eye, CheckCircle2, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const PRIORITIES = [
  { value: "low", label: "Low", color: "text-muted-foreground" },
  { value: "normal", label: "Normal", color: "text-foreground" },
  { value: "high", label: "High", color: "text-warning" },
  { value: "urgent", label: "Urgent", color: "text-destructive" },
];

export default function Announcements() {
  const { data: employees = [] } = useEmployees();
  const { data: announcements = [] } = useAnnouncements();
  const createAnn = useCreateAnnouncement();
  const publishAnn = usePublishAnnouncement();
  const deleteAnn = useDeleteAnnouncement();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null);
  const { data: readReceipts = [] } = useReadReceipts(selectedAnnId || undefined);
  const [form, setForm] = useState({ title: "", content: "", priority: "normal" });

  const activeEmployees = employees.filter(e => e.status === "active");

  const handleSubmit = (publishNow: boolean) => {
    if (!form.title || !form.content) return;
    createAnn.mutate({
      title: form.title,
      content: form.content,
      priority: form.priority,
      publish_now: publishNow,
    }, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm({ title: "", content: "", priority: "normal" });
      },
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Staff Announcements</h1>
            <p className="text-muted-foreground">Post announcements and track read receipts</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> New Announcement</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Announcement</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. New allergen policy update" /></div>
                <div><Label>Content</Label><Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={5} placeholder="Write your announcement..." /></div>
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleSubmit(false)} disabled={createAnn.isPending} className="flex-1 gap-2">
                    <Clock className="h-4 w-4" /> Save Draft
                  </Button>
                  <Button onClick={() => handleSubmit(true)} disabled={createAnn.isPending} className="flex-1 gap-2">
                    <Send className="h-4 w-4" /> Publish Now
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Announcements list */}
        <div className="space-y-3">
          {announcements.length === 0 && (
            <div className="rounded-xl bg-card border border-border shadow-card p-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mx-auto mb-4">
                <Megaphone className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">No announcements yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-1.5">
                Use announcements to share important updates with your team — policy changes, shift reminders, or company news.
              </p>
              <p className="text-xs text-muted-foreground/70 max-w-xs mx-auto">
                You can track who has read each announcement with read receipts.
              </p>
            </div>
          )}
          {announcements.map(ann => {
            const priority = PRIORITIES.find(p => p.value === ann.priority);
            const isPublished = !!ann.published_at;
            return (
              <div key={ann.id} className="rounded-xl bg-card border border-border shadow-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-card-foreground">{ann.title}</h3>
                      <Badge variant={isPublished ? "default" : "outline"} className="text-xs">
                        {isPublished ? "Published" : "Draft"}
                      </Badge>
                      <Badge variant="outline" className={cn("text-xs", priority?.color)}>{priority?.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ann.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Created {format(parseISO(ann.created_at), "d MMM yyyy HH:mm")}
                      {ann.published_at && ` · Published ${format(parseISO(ann.published_at), "d MMM yyyy HH:mm")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {isPublished && (
                      <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setSelectedAnnId(ann.id)}>
                        <Eye className="h-3.5 w-3.5" /> Receipts
                      </Button>
                    )}
                    {!isPublished && (
                      <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => publishAnn.mutate(ann.id)}>
                        <Send className="h-3.5 w-3.5" /> Publish
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteAnn.mutate(ann.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Read receipts sheet */}
        <Sheet open={!!selectedAnnId} onOpenChange={() => setSelectedAnnId(null)}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Read Receipts</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-muted-foreground">{readReceipts.length} of {activeEmployees.length} staff have read this</span>
              </div>
              {/* Read */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Read</p>
                {readReceipts.length === 0 && <p className="text-sm text-muted-foreground">No one has read this yet.</p>}
                {readReceipts.map(rr => (
                  <div key={rr.id} className="flex items-center gap-2 py-1.5">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-success/10 text-success text-[10px]">
                        {rr.employees?.forename?.[0]}{rr.employees?.surname?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{rr.employees?.forename} {rr.employees?.surname}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{format(parseISO(rr.read_at), "d MMM HH:mm")}</span>
                  </div>
                ))}
              </div>
              {/* Unread */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Not Yet Read</p>
                {activeEmployees
                  .filter(e => !readReceipts.some(rr => rr.employee_id === e.id))
                  .map(e => (
                    <div key={e.id} className="flex items-center gap-2 py-1.5 opacity-50">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">{e.forename[0]}{e.surname[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">{e.forename} {e.surname}</span>
                    </div>
                  ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}
