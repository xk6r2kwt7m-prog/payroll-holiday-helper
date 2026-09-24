import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RequestStaffDetailsDialog } from "@/components/employees/RequestStaffDetailsDialog";
import { BulkRequestInfoDialog } from "@/components/employees/BulkRequestInfoDialog";
import type { Employee } from "@/hooks/useEmployees";
import {
  useMissingInformation,
  MISSING_ITEM_LABELS,
  type MissingInformationRow,
  type MissingItemKey,
} from "@/hooks/useMissingInformation";

type TabKey = "rtw" | "pay" | "all";

const TAB_ITEMS: Record<TabKey, MissingItemKey[] | null> = {
  rtw: ["right_to_work"],
  pay: ["bank", "ni_number"],
  all: null,
};

const daysAgo = (iso: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

function requestState(row: MissingInformationRow): "none" | "open" | "submitted" {
  const r = row.latestRequest;
  if (!r) return "none";
  if (r.submitted_at) return "submitted";
  const closed =
    !!r.cancelled_at || !!r.revoked_at || ["revoked", "cancelled", "prepared"].includes(r.status) ||
    new Date(r.token_expires_at).getTime() <= Date.now();
  return closed ? "none" : "open";
}

export function MissingInformationBoard() {
  const { data = [], isLoading } = useMissingInformation();
  const [tab, setTab] = useState<TabKey>("rtw");

  const rows = useMemo(() => {
    const keys = TAB_ITEMS[tab];
    return data
      .map((r) => ({ ...r, shown: keys ? r.missing.filter((m) => keys.includes(m)) : r.missing }))
      .filter((r) => r.shown.length > 0);
  }, [data, tab]);

  const bulkEmployees = useMemo(
    () =>
      rows.map(
        (r) =>
          ({ id: r.employee_id, forename: r.forename, surname: r.surname, email: r.email, status: r.status }) as unknown as Employee,
      ),
    [rows],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Missing information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList>
            <TabsTrigger value="rtw">Right to work</TabsTrigger>
            <TabsTrigger value="pay">Pay</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        {rows.length > 0 && (
          <BulkRequestInfoDialog
            employees={bulkEmployees}
            trigger={<Button size="sm" variant="outline">Request from everyone in this tab</Button>}
          />
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing missing</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {rows.map((r) => {
              const state = requestState(r);
              return (
                <li key={r.employee_id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.shown.map((m) => MISSING_ITEM_LABELS[m]).join(", ")}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {state === "submitted" ? (
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/employees?edit=${r.employee_id}`}>Review</Link>
                      </Button>
                    ) : state === "open" ? (
                      <Badge variant="secondary">
                        {r.latestRequest?.opened_at
                          ? "Opened"
                          : `Requested ${daysAgo(r.latestRequest!.sent_at)} days ago`}
                      </Badge>
                    ) : (
                      <RequestStaffDetailsDialog
                        employeeId={r.employee_id}
                        employeeName={r.name}
                        employeeEmail={r.email}
                        kind={r.status === "starter" ? "onboarding" : "existing_staff_update"}
                        trigger={<Button size="sm">Request</Button>}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
