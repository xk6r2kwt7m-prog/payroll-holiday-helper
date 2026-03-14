import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeftRight, Clock, MapPin, Users, Hand, CheckCircle2,
  XCircle, Loader2, ShoppingBag, Send, AlertTriangle, Inbox,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { useEmployees } from "@/hooks/useEmployees";
import { useShifts } from "@/hooks/useSchedule";
import {
  useMarketplaceListings, usePendingApprovals, useMyMarketplaceRequests,
  useOfferShift, useRequestShift, useApproveRequest, useRejectRequest,
  useCancelListing, type MarketplaceListing, type MarketplaceRequest,
} from "@/hooks/useShiftMarketplace";
import { startOfWeek, endOfWeek } from "date-fns";

const anim = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

/* ─── Shift Card ─── */
function ShiftListingCard({
  listing,
  currentEmployeeId,
  myRequestIds,
  onRequest,
  onCancel,
}: {
  listing: MarketplaceListing;
  currentEmployeeId?: string;
  myRequestIds: Set<string>;
  onRequest: (listing: MarketplaceListing) => void;
  onCancel: (id: string) => void;
}) {
  const shift = listing.shift;
  if (!shift) return null;

  const isOwnListing = listing.offered_by === currentEmployeeId;
  const alreadyRequested = myRequestIds.has(listing.id);
  const shiftDate = new Date(shift.shift_date + "T00:00:00");

  return (
    <motion.div {...anim} transition={{ duration: 0.2 }}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-4 space-y-3">
          {/* Date + type badge */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {format(shiftDate, "EEE d MMM")}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <Clock className="h-3 w-3" />
                {shift.start_time?.slice(0, 5)} – {shift.end_time?.slice(0, 5)}
              </div>
            </div>
            <Badge
              variant={listing.listing_type === "open_shift" ? "default" : "secondary"}
              className="text-[10px] capitalize"
            >
              {listing.listing_type === "open_shift" ? "Open Shift" : listing.listing_type === "swap" ? "Swap" : "Available"}
            </Badge>
          </div>

          {/* Location + role */}
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" /> {shift.branch}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground capitalize">
              <Users className="h-3 w-3" /> {shift.department?.replace(/_/g, " ")}
            </span>
          </div>

          {/* Offered by */}
          {listing.offered_by_employee && (
            <div className="text-xs text-muted-foreground">
              Offered by: <span className="font-medium text-foreground">
                {listing.offered_by_employee.forename} {listing.offered_by_employee.surname}
              </span>
            </div>
          )}

          {listing.notes && (
            <p className="text-xs text-muted-foreground italic">"{listing.notes}"</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {isOwnListing ? (
              <Button size="sm" variant="outline" className="w-full gap-1 text-xs" onClick={() => onCancel(listing.id)}>
                <XCircle className="h-3 w-3" /> Cancel Listing
              </Button>
            ) : alreadyRequested ? (
              <Button size="sm" variant="secondary" disabled className="w-full gap-1 text-xs">
                <CheckCircle2 className="h-3 w-3" /> Requested
              </Button>
            ) : (
              <Button size="sm" className="w-full gap-1 text-xs" onClick={() => onRequest(listing)}>
                <Hand className="h-3 w-3" /> Pick Up Shift
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Approval Card ─── */
function ApprovalCard({
  request,
  onApprove,
  onReject,
  isLoading,
}: {
  request: MarketplaceRequest;
  onApprove: (r: MarketplaceRequest) => void;
  onReject: (r: MarketplaceRequest) => void;
  isLoading: boolean;
}) {
  const listing = request.listing as any;
  const shift = listing?.shift;
  const requester = request.requested_by_employee as any;
  if (!shift || !requester) return null;

  const shiftDate = new Date(shift.shift_date + "T00:00:00");

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {requester.forename} {requester.surname}
            </p>
            <p className="text-xs text-muted-foreground">wants to pick up a shift</p>
          </div>
          <Badge variant="outline" className="text-[10px]">Pending</Badge>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-xs">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-muted-foreground" />
            {format(shiftDate, "EEE d MMM")} · {shift.start_time?.slice(0, 5)} – {shift.end_time?.slice(0, 5)}
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 text-muted-foreground" /> {shift.branch}
          </div>
          {shift.employee && (
            <div className="text-muted-foreground">
              Currently: {shift.employee.forename} {shift.employee.surname}
            </div>
          )}
        </div>

        {request.notes && (
          <p className="text-xs text-muted-foreground italic">"{request.notes}"</p>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 gap-1 text-xs"
            onClick={() => onApprove(request)}
            disabled={isLoading}
          >
            <CheckCircle2 className="h-3 w-3" /> Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1 text-xs"
            onClick={() => onReject(request)}
            disabled={isLoading}
          >
            <XCircle className="h-3 w-3" /> Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Offer Shift Sheet ─── */
function OfferShiftSheet({
  open,
  onOpenChange,
  shifts,
  employeeId,
  onOffer,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shifts: any[];
  employeeId: string;
  onOffer: (shiftId: string, notes: string) => void;
  isPending: boolean;
}) {
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const myShifts = shifts.filter(
    (s: any) => s.employee_id === employeeId && s.is_published && new Date(s.shift_date) >= new Date()
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>Offer Your Shift</SheetTitle>
          <SheetDescription>Select a shift you'd like to offer to the marketplace</SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          {myShifts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No upcoming published shifts to offer
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-xs">Select Shift</Label>
                <Select value={selectedShiftId} onValueChange={setSelectedShiftId}>
                  <SelectTrigger><SelectValue placeholder="Choose a shift..." /></SelectTrigger>
                  <SelectContent>
                    {myShifts.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {format(new Date(s.shift_date + "T00:00:00"), "EEE d MMM")} · {s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)} · {s.branch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Reason (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Doctor's appointment"
                  rows={2}
                  className="text-sm"
                />
              </div>
            </>
          )}
        </div>

        <SheetFooter className="pt-4">
          <Button
            className="w-full gap-2"
            disabled={!selectedShiftId || isPending}
            onClick={() => {
              onOffer(selectedShiftId, notes);
              setSelectedShiftId("");
              setNotes("");
            }}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Offer Shift
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ─── Main Page ─── */
export default function ShiftMarketplace() {
  const { isManagerOrAbove } = useAuth();
  const { employee: currentEmployee } = useCurrentEmployee();
  const today = new Date();
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data: shifts = [] } = useShifts(weekStart, weekEnd);
  const { data: listings = [], isLoading: listingsLoading } = useMarketplaceListings();
  const { data: myRequests = [] } = useMyMarketplaceRequests();
  const { data: pendingApprovals = [], isLoading: approvalsLoading } = usePendingApprovals();

  const offerShift = useOfferShift();
  const requestShift = useRequestShift();
  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();
  const cancelListing = useCancelListing();

  const [offerOpen, setOfferOpen] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<MarketplaceListing | null>(null);
  const [requestNotes, setRequestNotes] = useState("");

  const myRequestListingIds = new Set(myRequests.map((r: any) => r.listing_id));
  const currentEmployeeId = currentEmployee?.id;

  const handleOffer = (shiftId: string, notes: string) => {
    if (!currentEmployeeId) return;
    offerShift.mutate({ shiftId, employeeId: currentEmployeeId, notes }, {
      onSuccess: () => setOfferOpen(false),
    });
  };

  const handleRequestConfirm = () => {
    if (!confirmRequest || !currentEmployeeId) return;
    const shift = (confirmRequest as any).shift;
    requestShift.mutate({
      listingId: confirmRequest.id,
      employeeId: currentEmployeeId,
      shiftId: shift?.id || (confirmRequest as any).shift_id,
      notes: requestNotes,
    }, {
      onSuccess: () => {
        setConfirmRequest(null);
        setRequestNotes("");
      },
    });
  };

  const handleApprove = (request: MarketplaceRequest) => {
    const listing = request.listing as any;
    approveRequest.mutate({
      requestId: request.id,
      listingId: request.listing_id,
      shiftId: listing?.shift_id || listing?.shift?.id,
      newEmployeeId: request.requested_by,
    });
  };

  const handleReject = (request: MarketplaceRequest) => {
    const listing = request.listing as any;
    rejectRequest.mutate({
      requestId: request.id,
      employeeId: request.requested_by,
      shiftId: listing?.shift_id || listing?.shift?.id,
    });
  };

  const tab = isManagerOrAbove ? "approvals" : "available";

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-4 pb-24">
        {/* Header */}
        <motion.div {...anim} className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Shift Marketplace
            </h1>
            <p className="text-sm text-muted-foreground">Pick up, offer, or swap shifts</p>
          </div>
          {currentEmployeeId && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setOfferOpen(true)}>
              <ArrowLeftRight className="h-4 w-4" /> Offer Shift
            </Button>
          )}
        </motion.div>

        <Tabs defaultValue={tab}>
          <TabsList className="w-full bg-muted/50">
            <TabsTrigger value="available" className="flex-1 gap-1 text-xs">
              <ShoppingBag className="h-3.5 w-3.5" /> Available
              {listings.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 text-[10px]">{listings.length}</Badge>
              )}
            </TabsTrigger>
            {isManagerOrAbove && (
              <TabsTrigger value="approvals" className="flex-1 gap-1 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5" /> Approvals
                {pendingApprovals.length > 0 && (
                  <Badge className="ml-1 h-4 text-[10px] bg-primary">{pendingApprovals.length}</Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Available shifts tab */}
          <TabsContent value="available" className="mt-4 space-y-3">
            {listingsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : listings.length === 0 ? (
              <div className="py-12 text-center">
                <Inbox className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">No shifts available right now</p>
                <p className="text-muted-foreground text-xs mt-1">Check back later or offer one of your shifts</p>
              </div>
            ) : (
              listings.map((listing: any) => (
                <ShiftListingCard
                  key={listing.id}
                  listing={listing}
                  currentEmployeeId={currentEmployeeId}
                  myRequestIds={myRequestListingIds}
                  onRequest={setConfirmRequest}
                  onCancel={id => cancelListing.mutate(id)}
                />
              ))
            )}
          </TabsContent>

          {/* Approvals tab (managers+) */}
          {isManagerOrAbove && (
            <TabsContent value="approvals" className="mt-4 space-y-3">
              {approvalsLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : pendingApprovals.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-sm">No pending approvals</p>
                </div>
              ) : (
                pendingApprovals.map((req: any) => (
                  <ApprovalCard
                    key={req.id}
                    request={req}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    isLoading={approveRequest.isPending || rejectRequest.isPending}
                  />
                ))
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Offer shift sheet */}
      {currentEmployeeId && (
        <OfferShiftSheet
          open={offerOpen}
          onOpenChange={setOfferOpen}
          shifts={shifts}
          employeeId={currentEmployeeId}
          onOffer={handleOffer}
          isPending={offerShift.isPending}
        />
      )}

      {/* Confirm request dialog */}
      <AlertDialog open={!!confirmRequest} onOpenChange={v => !v && setConfirmRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request this shift?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRequest?.shift && (
                <span>
                  {format(new Date(confirmRequest.shift.shift_date + "T00:00:00"), "EEEE d MMM")} ·{" "}
                  {confirmRequest.shift.start_time?.slice(0, 5)} – {confirmRequest.shift.end_time?.slice(0, 5)} ·{" "}
                  {confirmRequest.shift.branch}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Note for manager (optional)</Label>
            <Textarea
              value={requestNotes}
              onChange={e => setRequestNotes(e.target.value)}
              placeholder="e.g. I'm available and have the right skills"
              rows={2}
              className="text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRequestConfirm} disabled={requestShift.isPending}>
              {requestShift.isPending ? "Submitting..." : "Request Shift"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
