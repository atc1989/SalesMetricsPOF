'use client';

import { useState } from 'react';
import { Tabs } from '../../components/daily-sales/Tabs';
import { DashboardTab } from '../../components/daily-sales/tabs/DashboardTab';
import { EncoderTab } from '../../components/daily-sales/tabs/EncoderTab';
import { InventoryReportTab } from '../../components/daily-sales/tabs/InventoryReportTab';
import { ReportsTab } from '../../components/daily-sales/tabs/ReportsTab';
import { SalesReportTab } from '../../components/daily-sales/tabs/SalesReportTab';
import { SalesMetricsTab } from '../../components/daily-sales/tabs/SalesMetricsTab';
import { UsersTab } from '../../components/daily-sales/tabs/UsersTab';
import { Card } from '../../components/ui/Card';

export default function DailySalesPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'encoder', label: 'Encoder' },
    { id: 'reports', label: 'Reports' },
    { id: 'inventory-report', label: 'Inventory Report' },
    { id: 'sales-report', label: 'Sales Report' },
    { id: 'users', label: 'Users' },
    { id: 'sales-metrics', label: 'Sales Metrics' },
  ];

  return (
    <main className="mx-auto max-w-7xl p-6">
      <Card className="mb-6 space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Daily Sales</h1>
        <Tabs items={tabItems} activeTab={activeTab} onTabChange={setActiveTab} />
      </Card>

      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'encoder' && <EncoderTab />}
      {activeTab === 'reports' && <ReportsTab />}
      {activeTab === 'inventory-report' && <InventoryReportTab />}

      {activeTab === 'sales-report' && <SalesReportTab />}

      {activeTab === 'users' && <UsersTab />}

      {activeTab === 'sales-metrics' && <SalesMetricsTab />}
    </main>
  );
}
