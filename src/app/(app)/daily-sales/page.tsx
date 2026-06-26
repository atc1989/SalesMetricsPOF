"use client";

import { useState } from "react";

import { DashboardTab } from "@/components/daily-sales/tabs/DashboardTab";
import { EncoderTab } from "@/components/daily-sales/tabs/EncoderTab";
import { InventoryReportTab } from "@/components/daily-sales/tabs/InventoryReportTab";
import { ReportsTab } from "@/components/daily-sales/tabs/ReportsTab";
import { SalesReportTab } from "@/components/daily-sales/tabs/SalesReportTab";
import { SalesMetricsTab } from "@/components/daily-sales/tabs/SalesMetricsTab";
import { UsersTab } from "@/components/daily-sales/tabs/UsersTab";
import { BalanceReportTab } from "@/components/daily-sales/tabs/BalanceReportTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TAB_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "encoder", label: "Encoder" },
  { id: "reports", label: "Reports" },
  { id: "inventory-report", label: "Inventory Report" },
  { id: "sales-report", label: "Sales Report" },
  { id: "balance-report", label: "Balance Report" },
  { id: "users", label: "Users" },
  { id: "sales-metrics", label: "Sales Metrics" },
] as const;

export default function DailySalesPage() {
  const [activeTab, setActiveTab] = useState<(typeof TAB_ITEMS)[number]["id"]>("dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Daily Sales</h1>
        <p className="text-sm text-muted-foreground">
          Daily sales activity, totals, and reports across encoders.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList className="flex flex-wrap">
          {TAB_ITEMS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          {activeTab === "dashboard" && <DashboardTab />}
        </TabsContent>
        <TabsContent value="encoder" className="mt-6">
          {activeTab === "encoder" && <EncoderTab />}
        </TabsContent>
        <TabsContent value="reports" className="mt-6">
          {activeTab === "reports" && <ReportsTab />}
        </TabsContent>
        <TabsContent value="inventory-report" className="mt-6">
          {activeTab === "inventory-report" && <InventoryReportTab />}
        </TabsContent>
        <TabsContent value="sales-report" className="mt-6">
          {activeTab === "sales-report" && <SalesReportTab />}
        </TabsContent>
        <TabsContent value="balance-report" className="mt-6">
          {activeTab === "balance-report" && <BalanceReportTab />}
        </TabsContent>
        <TabsContent value="users" className="mt-6">
          {activeTab === "users" && <UsersTab />}
        </TabsContent>
        <TabsContent value="sales-metrics" className="mt-6">
          {activeTab === "sales-metrics" && <SalesMetricsTab />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
