"use client";

import { useState } from "react";
import { DailyInventoryTable } from "@/components/daily-sales/DailyInventoryTable";
import { DailySalesReportTables } from "@/components/daily-sales/DailySalesReportTables";
import { PrintPreviewModal } from "@/components/daily-sales/PrintPreviewModal";
import { RecentSalesTable } from "@/components/daily-sales/RecentSalesTable";
import { ReportsTable } from "@/components/daily-sales/ReportsTable";
import { SalesEntryForm } from "@/components/daily-sales/SalesEntryForm";
import { SalesOverviewKPIs } from "@/components/daily-sales/SalesOverviewKPIs";
import { Tabs } from "@/components/daily-sales/Tabs";
import { CashOnHandTable } from "@/components/daily-sales/CashOnHandTable";
import { UsersTable } from "@/components/daily-sales/UsersTable";
import { ExpensesForm } from "@/components/encoder/ExpensesForm";
import { LeaderSelector } from "@/components/encoder/LeaderSelector";
import { TargetRatioForm } from "@/components/encoder/TargetRatioForm";
import { TopHeader } from "@/components/layout/TopHeader";
import { Card } from "@/components/ui/Card";
import {
  cashOnHandRows,
  inventoryRows,
  packageBreakdown,
  paymentBreakdown,
  recentSales,
  reportsRows,
  retailBreakdown,
  salesOverviewKpis,
} from "@/lib/mock/dailySales";
import { initialExpenses, initialTargetRatio, leaders } from "@/lib/mock/encoder";
import { userRows } from "@/lib/mock/users";

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "encoder", label: "Encoder" },
  { id: "reports", label: "Reports" },
  { id: "daily-inventory", label: "Daily Inventory" },
  { id: "daily-sales", label: "Daily Sales" },
  { id: "users", label: "Users" },
  { id: "sales-metrics", label: "Sales Metrics" },
];

export default function DailySalesPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  return (
    <section className="space-y-4">
      <TopHeader
        title="Daily Sales"
        subtitle="DailySales/Index - mock multi-tab workspace"
      />

      <Tabs items={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "dashboard" ? (
        <div className="space-y-4">
          <SalesOverviewKPIs kpis={salesOverviewKpis} />
          <RecentSalesTable rows={recentSales} />
        </div>
      ) : null}

      {activeTab === "encoder" ? (
        <div className="space-y-4">
          <TargetRatioForm initialValue={initialTargetRatio} />
          <LeaderSelector leaders={leaders} />
          <ExpensesForm initialExpenses={initialExpenses} />
        </div>
      ) : null}

      {activeTab === "reports" ? <ReportsTable rows={reportsRows} onPreview={() => setIsPrintPreviewOpen(true)} /> : null}

      {activeTab === "daily-inventory" ? <DailyInventoryTable rows={inventoryRows} /> : null}

      {activeTab === "daily-sales" ? <SalesEntryForm /> : null}

      {activeTab === "users" ? <UsersTable rows={userRows} /> : null}

      {activeTab === "sales-metrics" ? (
        <div className="space-y-4">
          <DailySalesReportTables packageRows={packageBreakdown} retailRows={retailBreakdown} paymentRows={paymentBreakdown} />
          <CashOnHandTable rows={cashOnHandRows} />
          <Card>
            <h3 className="text-lg font-semibold text-slate-900">Sales Metrics Notes</h3>
            <p className="mt-2 text-sm text-slate-700">This section simulates package, retail, and payment summaries for end-of-day review.</p>
          </Card>
        </div>
      ) : null}

      <PrintPreviewModal isOpen={isPrintPreviewOpen} onClose={() => setIsPrintPreviewOpen(false)} />
    </section>
  );
}
