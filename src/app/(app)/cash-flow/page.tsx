import { BalanceReportTab } from "@/components/daily-sales/tabs/BalanceReportTab";

export default function CashFlowPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Balance Report</h1>
        <p className="text-sm text-muted-foreground">
          Daily sales vs. total budget — with payment method and expense category exemptions.
        </p>
      </div>
      <BalanceReportTab />
    </div>
  );
}
