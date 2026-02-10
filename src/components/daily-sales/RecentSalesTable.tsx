import type { RecentSale } from '../../lib/mock/dailySales';

type RecentSalesTableProps = {
  rows: RecentSale[];
};

export default function RecentSalesTable({ rows }: RecentSalesTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
      <table id="tblSalesToday" className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
          <tr>
            <th className="px-3 py-2">POF Number</th>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Member Name</th>
            <th className="px-3 py-2">Zero One</th>
            <th className="px-3 py-2">Package</th>
            <th className="px-3 py-2">Bottles</th>
            <th className="px-3 py-2">Blisters</th>
            <th className="px-3 py-2">Sales</th>
            <th className="px-3 py-2">Mode of Payment</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-3 py-5 text-center text-gray-500">
                No recent sales found for current filters.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.invoice} className="border-t border-gray-100">
                <td className="px-3 py-2">{row.invoice}</td>
                <td className="px-3 py-2">{row.date}</td>
                <td className="px-3 py-2">{row.customer}</td>
                <td className="px-3 py-2">{row.zeroOne}</td>
                <td className="px-3 py-2">{row.packageType}</td>
                <td className="px-3 py-2">{row.bottles}</td>
                <td className="px-3 py-2">{row.blisters}</td>
                <td className="px-3 py-2">₱{row.sales.toLocaleString()}</td>
                <td className="px-3 py-2">{row.paymentMode}</td>
                <td className="px-3 py-2">{row.status}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
