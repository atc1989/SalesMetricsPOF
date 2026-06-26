"use client";

import { Suspense, useState } from "react";
import { BudgetPage } from "@/components/budget/BudgetPage";
import { BalanceReportTab } from "@/components/daily-sales/tabs/BalanceReportTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Page() {
  const [activeTab, setActiveTab] = useState("budget-requests");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Budget Request Form</h1>
        <p className="text-sm text-muted-foreground">
          Manage budget requests and view the daily sales vs. budget balance report.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="budget-requests">Budget Requests</TabsTrigger>
          <TabsTrigger value="balance-report">Balance Report</TabsTrigger>
        </TabsList>

        <TabsContent value="budget-requests" className="mt-6">
          {activeTab === "budget-requests" && (
            <Suspense fallback={null}>
              <BudgetPage />
            </Suspense>
          )}
        </TabsContent>

        <TabsContent value="balance-report" className="mt-6">
          {activeTab === "balance-report" && <BalanceReportTab />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
