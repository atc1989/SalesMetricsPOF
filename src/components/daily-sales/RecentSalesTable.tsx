import type { RecentSale } from '../../lib/mock/dailySales';

type RecentSalesTableProps = {
  rows: RecentSale[];
  onRemove: (id: string) => void;
  onEditTransNo: (id: string) => void;
};

export default function RecentSalesTable({ rows, onRemove, onEditTransNo }: RecentSalesTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
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
                <td className="px-3 py-2">{row.customer}</td>
                <td className="px-3 py-2">{row.zeroOne}</td>
                <td className="px-3 py-2">{row.packageType}</td>
                <td className="px-3 py-2">{row.bottles}</td>
                <td className="px-3 py-2">{row.blisters}</td>
                <td className="px-3 py-2">PHP {row.sales.toLocaleString()}</td>
                <td className="px-3 py-2">{row.paymentMode}</td>
                <td className="px-3 py-2">{row.status}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      onClick={() => onEditTransNo(row.id)}
                    >
                      Edit Trans No
                    </button>
                    <button
                      type="button"
                      className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      onClick={() => onRemove(row.id)}
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
