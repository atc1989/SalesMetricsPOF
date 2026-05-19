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
        className="inline-flex h-8 w-36 items-center justify-center rounded-md bg-foreground px-3 text-sm font-medium text-white shadow-md transition-colors hover:bg-foreground"
      >
        Sales API
      </Link>
      <Link
        href="/daily-sales"
        className="inline-flex h-8 w-36 items-center justify-center rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground shadow-md transition-colors hover:bg-muted/50"
      >
        Daily Sales
      </Link>
      <Link
        href="/encoder"
        className="inline-flex h-8 w-36 items-center justify-center rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground shadow-md transition-colors hover:bg-muted/50"
      >
        Encoder
      </Link>
      <Button size="sm" variant="ghost" className="w-36 border border-input bg-card shadow-md" onClick={onSyncAll}>
        Sync All
      </Button>
    </div>
  );
}
