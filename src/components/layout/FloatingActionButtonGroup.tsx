import Link from "next/link";
import { Button } from "@/components/ui/button";

type FloatingActionButtonGroupProps = {
  onSyncAll: () => void;
};

export function FloatingActionButtonGroup({ onSyncAll }: FloatingActionButtonGroupProps) {
  return (
    <div className="fixed bottom-6 right-6 z-30 flex flex-col gap-2">
      <Link
        href="/sales"
        className="inline-flex h-8 w-36 items-center justify-center rounded-md bg-slate-900 px-3 text-sm font-medium text-white shadow-md transition-colors hover:bg-slate-800"
      >
        Sales API
      </Link>
      <Link
        href="/daily-sales"
        className="inline-flex h-8 w-36 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 shadow-md transition-colors hover:bg-slate-50"
      >
        Daily Sales
      </Link>
      <Link
        href="/encoder"
        className="inline-flex h-8 w-36 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 shadow-md transition-colors hover:bg-slate-50"
      >
        Encoder
      </Link>
      <Button size="sm" variant="ghost" className="w-36 border border-slate-300 bg-white shadow-md" onClick={onSyncAll}>
        Sync All
      </Button>
    </div>
  );
}
