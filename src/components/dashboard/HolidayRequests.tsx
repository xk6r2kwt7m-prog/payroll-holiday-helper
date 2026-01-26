import { Calendar, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface HolidayRequest {
  id: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: "pending" | "approved" | "rejected";
}

const requests: HolidayRequest[] = [
  { id: "1", employeeName: "Sarah Johnson", type: "Annual Leave", startDate: "Feb 15", endDate: "Feb 22", days: 5, status: "pending" },
  { id: "2", employeeName: "Michael Chen", type: "Sick Leave", startDate: "Feb 12", endDate: "Feb 13", days: 2, status: "pending" },
  { id: "3", employeeName: "Emily Davis", type: "Personal Day", startDate: "Feb 20", endDate: "Feb 20", days: 1, status: "pending" },
];

export function HolidayRequests() {
  return (
    <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-card-foreground">Pending Requests</h3>
            <p className="text-sm text-muted-foreground">Holiday and leave requests awaiting approval</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <Calendar className="h-5 w-5 text-accent" />
          </div>
        </div>
      </div>
      <div className="divide-y divide-border">
        {requests.map((request) => (
          <div
            key={request.id}
            className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {request.employeeName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-card-foreground">{request.employeeName}</p>
                <p className="text-sm text-muted-foreground">
                  {request.type} · {request.startDate} - {request.endDate}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
                {request.days} {request.days === 1 ? "day" : "days"}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0 text-success hover:bg-success hover:text-success-foreground"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-6 py-3">
        <Button variant="ghost" className="w-full text-primary hover:text-primary">
          View all requests
        </Button>
      </div>
    </div>
  );
}
