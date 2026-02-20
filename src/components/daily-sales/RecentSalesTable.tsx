import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { RecentSale } from '../../lib/mock/dailySales';

type RecentSalesTableProps = {
  rows: RecentSale[];
  onRemove: (id: string) => void;
  onEditTransNo: (id: string) => void;
  onExport: () => void;
};

const getStatusVariant = (status: RecentSale['status']) => {
  if (status === 'Released') {
    return 'success';
  }

  if (status === 'To Follow') {
    return 'warning';
  }

  return 'neutral';
};

export default function RecentSalesTable({
  rows,
  onRemove,
  onEditTransNo,
  onExport,
}: RecentSalesTableProps) {
  return (
    <div className="rounded-md border border-gray-200 bg-white">
      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="text-sm font-semibold text-slate-900">Recent Sales</h2>
        <Button size="sm" onClick={onExport}>
          Excel
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table id="tblSalesToday" className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-3 py-2">POF Number</th>
              <th className="px-3 py-2">GG Trans No</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Member Name</th>
              <th className="px-3 py-2">Zero One</th>
              <th className="px-3 py-2">Package</th>
              <th className="px-3 py-2">Bottles</th>
              <th className="px-3 py-2">Blisters</th>
              <th className="px-3 py-2">Sales</th>
              <th className="px-3 py-2">Mode of Payment</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-3 py-5 text-center text-gray-500">
                  No recent sales found for current filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">{row.pofNumber}</td>
                  <td className="px-3 py-2">{row.ggTransNo}</td>
                  <td className="px-3 py-2">{row.date}</td>
                  <td className="px-3 py-2">{row.memberName}</td>
                  <td className="px-3 py-2">{row.zeroOne}</td>
                  <td className="px-3 py-2">{row.packageType}</td>
                  <td className="px-3 py-2">{row.bottles}</td>
                  <td className="px-3 py-2">{row.blisters}</td>
                  <td className="px-3 py-2">PHP {row.sales.toLocaleString()}</td>
                  <td className="px-3 py-2">{row.paymentMode}</td>
                  <td className="px-3 py-2">
                    <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => onEditTransNo(row.id)}>
                        Edit Trans No
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => onRemove(row.id)}>
                        Remove
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
