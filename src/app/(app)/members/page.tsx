"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Receipt, Scale, Search, Users } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MemberSearchRow = {
  user_account_id: number;
  user_name: string | null;
  full_name: string | null;
  account_type: string | null;
  zero_one: string | null;
};

type SaleRow = {
  daily_sales_id: number | string;
  trans_date: string | null;
  pof_number: string | null;
  package_type: string | null;
  bottle_count: number | null;
  blister_count: number | null;
  sales: number | null;
  mode_of_payment: string | null;
};

type BillRow = {
  id: string;
  reference_no: string;
  request_date: string;
  status: string;
  priority_level: string;
  payment_method: string;
  total_amount: number;
};

type RollupResponse = {
  success: boolean;
  message?: string;
  member?: {
    user_account_id: number;
    user_name: string | null;
    full_name: string | null;
    account_type: string | null;
    zero_one: string | null;
    code_payment: string | null;
    sponsor: string | null;
    placement: string | null;
    group: string | null;
    city: string | null;
    province: string | null;
  };
  sales?: SaleRow[];
  bills?: BillRow[];
  totals?: {
    totalSales: number;
    totalBills: number;
    salesCount: number;
    billsCount: number;
  };
};

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "neutral";

const peso = (value: number) =>
  `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const billStatusVariant = (status: string): BadgeVariant => {
  switch (status) {
    case "draft":
      return "neutral";
    case "awaiting_approval":
      return "warning";
    case "rejected":
      return "destructive";
    case "approved":
      return "secondary";
    case "paid":
      return "success";
    case "void":
      return "outline";
    default:
      return "neutral";
  }
};

const formatStatus = (status: string) =>
  status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export default function MembersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<MemberSearchRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rollup, setRollup] = useState<RollupResponse | null>(null);
  const [isLoadingRollup, setIsLoadingRollup] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced member search.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const query = searchQuery.trim();
    if (query.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/user-account?q=${encodeURIComponent(query)}&limit=20`,
        );
        const payload = (await response.json()) as {
          success: boolean;
          data?: MemberSearchRow[];
        };
        setResults(payload.success && payload.data ? payload.data : []);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // Load the rollup when a member is picked.
  useEffect(() => {
    if (selectedId == null) {
      setRollup(null);
      return;
    }

    const controller = new AbortController();
    setIsLoadingRollup(true);
    setErrorMessage(null);

    fetch(`/api/members/rollup?id=${selectedId}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as RollupResponse;
        if (!response.ok || !payload.success) {
          throw new Error(payload.message ?? "Failed to load member rollup.");
        }
        setRollup(payload);
      })
      .catch((error) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load member rollup.",
        );
        setRollup(null);
      })
      .finally(() => setIsLoadingRollup(false));

    return () => controller.abort();
  }, [selectedId]);

  const member = rollup?.member;
  const sales = rollup?.sales ?? [];
  const bills = rollup?.bills ?? [];
  const totals = rollup?.totals;

  const net = useMemo(() => {
    if (!totals) return 0;
    return totals.totalSales - totals.totalBills;
  }, [totals]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Member Rollup</h1>
        <p className="text-sm text-muted-foreground">
          Search a member to see their sales and any bills tied to them.
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <InputGroup>
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search by full name, username, or zero one…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>

          {searchQuery.trim().length >= 2 && (
            <div className="mt-3 max-h-72 overflow-y-auto rounded-md border">
              {isSearching ? (
                <div className="space-y-2 p-3">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ) : results.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  No members match that search.
                </p>
              ) : (
                <ul className="divide-y">
                  {results.map((row) => (
                    <li key={row.user_account_id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(row.user_account_id);
                          setSearchQuery("");
                          setResults([]);
                        }}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {row.full_name || "—"}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {row.user_name || "no username"}
                            {row.zero_one ? ` · ${row.zero_one}` : ""}
                          </span>
                        </span>
                        {row.account_type ? (
                          <Badge variant="neutral">{row.account_type}</Badge>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load member</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {/* Empty state — nothing selected yet */}
      {selectedId == null && !errorMessage ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No member selected</EmptyTitle>
            <EmptyDescription>
              Use the search above to pick a member and view their rollup.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {/* Loading */}
      {isLoadingRollup ? (
        <div className="space-y-6">
          <Skeleton className="h-28 w-full" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : null}

      {/* Rollup */}
      {!isLoadingRollup && member ? (
        <div className="space-y-6">
          {/* Member identity */}
          <Card>
            <CardHeader>
              <CardTitle>{member.full_name || "Unnamed member"}</CardTitle>
              <CardDescription>
                {member.user_name || "no username"}
                {member.zero_one ? ` · Zero One: ${member.zero_one}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
                <DetailItem label="Account Type" value={member.account_type} />
                <DetailItem label="Code Payment" value={member.code_payment} />
                <DetailItem label="Group" value={member.group} />
                <DetailItem label="Sponsor" value={member.sponsor} />
                <DetailItem label="Placement" value={member.placement} />
                <DetailItem
                  label="Location"
                  value={
                    [member.city, member.province].filter(Boolean).join(", ") || null
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  <ArrowUpRight className="size-4" />
                  Total Sales
                </CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  {peso(totals?.totalSales ?? 0)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {totals?.salesCount ?? 0} sales record(s).
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  <Receipt className="size-4" />
                  Total Bills
                </CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  {peso(totals?.totalBills ?? 0)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {totals?.billsCount ?? 0} bill(s) tied to this member.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  <Scale className="size-4" />
                  Net (Sales − Bills)
                </CardDescription>
                <CardTitle className="text-2xl tabular-nums">{peso(net)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Sales total minus billed amount.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sales table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sales</CardTitle>
              <CardDescription>Daily sales recorded under this member.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {sales.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-muted-foreground">
                  No sales records for this member.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>POF Number</TableHead>
                        <TableHead>Package</TableHead>
                        <TableHead className="text-right">Bottles</TableHead>
                        <TableHead className="text-right">Blisters</TableHead>
                        <TableHead className="text-right">Sales</TableHead>
                        <TableHead>Mode of Payment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map((row) => (
                        <TableRow key={String(row.daily_sales_id)}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {row.trans_date || "—"}
                          </TableCell>
                          <TableCell className="font-medium">
                            {row.pof_number || "—"}
                          </TableCell>
                          <TableCell>{row.package_type || "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.bottle_count ?? 0}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.blister_count ?? 0}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {peso(Number(row.sales ?? 0))}
                          </TableCell>
                          <TableCell>{row.mode_of_payment || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bills table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bills</CardTitle>
              <CardDescription>
                Payment requests whose vendor is linked to this member.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {bills.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-muted-foreground">
                  No bills tied to this member. A bill links here when its vendor has
                  this member set as <code>vendors.user_account_id</code>.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Reference No.</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bills.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {row.request_date}
                          </TableCell>
                          <TableCell className="font-medium">
                            {row.reference_no}
                          </TableCell>
                          <TableCell>{row.payment_method}</TableCell>
                          <TableCell>{formatStatus(row.priority_level)}</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {peso(Number(row.total_amount ?? 0))}
                          </TableCell>
                          <TableCell>
                            <Badge variant={billStatusVariant(row.status)}>
                              {formatStatus(row.status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{value || "—"}</div>
    </div>
  );
}
