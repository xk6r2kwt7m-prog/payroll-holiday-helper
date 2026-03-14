import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle, AlertCircle, DollarSign, FileText } from "lucide-react";
import { PayrollNavStrip } from "@/components/payroll/PayrollNavStrip";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePayrollPeriods } from "@/hooks/usePayroll";
import { formatCurrency } from "@/hooks/useHolidays";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const statusStyles = {
  draft: "bg-muted text-muted-foreground border-muted-foreground/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusIcons = {
  draft: FileText,
  pending: Clock,
  approved: CheckCircle,
  rejected: AlertCircle,
};

const PayrollCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { data: periods = [], isLoading } = usePayrollPeriods();
  const navigate = useNavigate();

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const firstDayOfMonth = startOfMonth(currentMonth).getDay();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Monday = 0

  const getPeriodsForDay = (day: Date) => {
    return periods.filter(period => {
      const startDate = parseISO(period.start_date);
      const endDate = parseISO(period.end_date);
      return isWithinInterval(day, { start: startDate, end: endDate });
    });
  };

  const getPayDatePeriods = (day: Date) => {
    return periods.filter(period => {
      if (!period.pay_date) return false;
      return isSameDay(parseISO(period.pay_date), day);
    });
  };

  const upcomingDeadlines = useMemo(() => {
    const today = new Date();
    return periods
      .filter(p => p.status === "draft" || p.status === "pending")
      .filter(p => parseISO(p.end_date) >= today)
      .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())
      .slice(0, 5);
  }, [periods]);

  const monthPeriods = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    return periods.filter(period => {
      const periodStart = parseISO(period.start_date);
      const periodEnd = parseISO(period.end_date);
      return (
        isWithinInterval(periodStart, { start: monthStart, end: monthEnd }) ||
        isWithinInterval(periodEnd, { start: monthStart, end: monthEnd }) ||
        isWithinInterval(monthStart, { start: periodStart, end: periodEnd })
      );
    });
  }, [currentMonth, periods]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-slide-in-left">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              Payroll Calendar
            </h1>
            <p className="text-muted-foreground mt-1">
              View pay periods, pay dates, and upcoming deadlines
            </p>
          </div>
          <Button onClick={() => navigate("/payroll")} variant="outline">
            <DollarSign className="mr-2 h-4 w-4" />
            Go to Payroll
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Calendar */}
          <div className="lg:col-span-3 rounded-xl bg-card shadow-card p-6 animate-fade-in">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-card-foreground">
                {format(currentMonth, "MMMM yyyy")}
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-px mb-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {/* Empty cells for alignment */}
              {Array.from({ length: adjustedFirstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-muted/30 min-h-[100px] p-2" />
              ))}
              
              {days.map(day => {
                const dayPeriods = getPeriodsForDay(day);
                const payDates = getPayDatePeriods(day);
                const isToday = isSameDay(day, new Date());
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-[100px] p-2 bg-card transition-colors",
                      isWeekend && "bg-muted/30",
                      isToday && "ring-2 ring-primary ring-inset"
                    )}
                  >
                    <div className={cn(
                      "text-sm font-medium mb-1",
                      isToday ? "text-primary" : "text-card-foreground"
                    )}>
                      {format(day, "d")}
                    </div>
                    
                    <div className="space-y-1">
                      {/* Period indicators */}
                      {dayPeriods.slice(0, 2).map(period => {
                        const StatusIcon = statusIcons[period.status];
                        const isStart = isSameDay(parseISO(period.start_date), day);
                        const isEnd = isSameDay(parseISO(period.end_date), day);
                        
                        return (
                          <div
                            key={period.id}
                            className={cn(
                              "text-xs px-1.5 py-0.5 rounded flex items-center gap-1 truncate cursor-pointer hover:opacity-80 transition-opacity",
                              statusStyles[period.status],
                              isStart && "rounded-l-md",
                              isEnd && "rounded-r-md"
                            )}
                            onClick={() => navigate("/payroll")}
                            title={period.period_name}
                          >
                            <StatusIcon className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {isStart ? period.period_name : isEnd ? "End" : ""}
                            </span>
                          </div>
                        );
                      })}
                      
                      {dayPeriods.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayPeriods.length - 2} more
                        </div>
                      )}
                      
                      {/* Pay date markers */}
                      {payDates.map(period => (
                        <div
                          key={`pay-${period.id}`}
                          className="text-xs px-1.5 py-0.5 rounded bg-success/20 text-success font-medium flex items-center gap-1"
                        >
                          <DollarSign className="h-3 w-3" />
                          Pay Day
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Deadlines */}
            <div className="rounded-xl bg-card shadow-card p-5 animate-fade-in" style={{ animationDelay: "100ms" }}>
              <h3 className="font-semibold text-card-foreground mb-4 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-warning" />
                Upcoming Deadlines
              </h3>
              {upcomingDeadlines.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
              ) : (
                <div className="space-y-3">
                  {upcomingDeadlines.map(period => {
                    const endDate = parseISO(period.end_date);
                    const daysUntil = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <div
                        key={period.id}
                        className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => navigate("/payroll")}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm truncate">
                            {period.period_name}
                          </span>
                          <Badge variant="outline" className={cn("text-xs", statusStyles[period.status])}>
                            {period.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Ends {format(endDate, "MMM d")} 
                          {daysUntil > 0 && (
                            <span className={cn(
                              "ml-1",
                              daysUntil <= 3 && "text-warning font-medium"
                            )}>
                              ({daysUntil} day{daysUntil !== 1 ? "s" : ""} left)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* This Month's Periods */}
            <div className="rounded-xl bg-card shadow-card p-5 animate-fade-in" style={{ animationDelay: "200ms" }}>
              <h3 className="font-semibold text-card-foreground mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {format(currentMonth, "MMMM")} Periods
              </h3>
              {monthPeriods.length === 0 ? (
                <p className="text-sm text-muted-foreground">No periods this month</p>
              ) : (
                <div className="space-y-3">
                  {monthPeriods.map(period => {
                    const StatusIcon = statusIcons[period.status];
                    
                    return (
                      <div
                        key={period.id}
                        className="p-3 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer"
                        onClick={() => navigate("/payroll")}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <StatusIcon className={cn(
                            "h-4 w-4",
                            period.status === "approved" && "text-success",
                            period.status === "draft" && "text-muted-foreground",
                            period.status === "pending" && "text-warning"
                          )} />
                          <span className="font-medium text-sm">{period.period_name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(period.start_date), "MMM d")} - {format(parseISO(period.end_date), "MMM d")}
                          </div>
                          {period.pay_date && (
                            <div className="flex items-center gap-2 text-success">
                              <DollarSign className="h-3 w-3" />
                              Pay: {format(parseISO(period.pay_date), "MMM d")}
                            </div>
                          )}
                          {period.grand_total && (
                            <div className="font-medium text-card-foreground">
                              Total: {formatCurrency(period.grand_total)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="rounded-xl bg-card shadow-card p-5 animate-fade-in" style={{ animationDelay: "300ms" }}>
              <h3 className="font-semibold text-card-foreground mb-3">Legend</h3>
              <div className="space-y-2">
                {(["draft", "pending", "approved"] as const).map(status => {
                  const StatusIcon = statusIcons[status];
                  return (
                    <div key={status} className="flex items-center gap-2 text-sm">
                      <div className={cn(
                        "px-2 py-1 rounded flex items-center gap-1",
                        statusStyles[status]
                      )}>
                        <StatusIcon className="h-3 w-3" />
                      </div>
                      <span className="capitalize text-muted-foreground">{status}</span>
                    </div>
                  );
                })}
                <div className="flex items-center gap-2 text-sm">
                  <div className="px-2 py-1 rounded bg-success/20 text-success flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                  </div>
                  <span className="text-muted-foreground">Pay Day</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default PayrollCalendar;
