export const INITIAL_BOTTLE_STOCK = 24435;
export const INITIAL_BLISTER_STOCK = 20492;

export type InventoryMovementDayRow = {
  date: string;
  bottleOpening: number;
  bottleIn: number;
  bottleOut: number;
  bottleClosing: number;
  blisterOpening: number;
  blisterIn: number;
  blisterOut: number;
  blisterClosing: number;
};

export type InventoryStockInRow = {
  id: number;
  movement_date: string;
  bottle_in: number;
  blister_in: number;
  note: string;
  created_at: string;
};

export function isIsoDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function normalizeWholeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.trunc(parsed));
    }
  }

  return 0;
}

export function createDateRange(dateFrom: string, dateTo: string) {
  const dates: string[] = [];
  const current = new Date(`${dateFrom}T00:00:00`);
  const end = new Date(`${dateTo}T00:00:00`);

  while (current.getTime() <= end.getTime()) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export function buildInventoryMovementRows(params: {
  dateFrom: string;
  dateTo: string;
  releasedByDate: Map<string, { bottleOut: number; blisterOut: number }>;
  stockInByDate: Map<string, { bottleIn: number; blisterIn: number }>;
}) {
  const { dateFrom, dateTo, releasedByDate, stockInByDate } = params;
  const dates = createDateRange(dateFrom, dateTo);

  let runningBottle = INITIAL_BOTTLE_STOCK;
  let runningBlister = INITIAL_BLISTER_STOCK;

  for (const [date, value] of stockInByDate.entries()) {
    if (date < dateFrom) {
      runningBottle += value.bottleIn;
      runningBlister += value.blisterIn;
    }
  }

  for (const [date, value] of releasedByDate.entries()) {
    if (date < dateFrom) {
      runningBottle -= value.bottleOut;
      runningBlister -= value.blisterOut;
    }
  }

  const rows: InventoryMovementDayRow[] = [];

  for (const date of dates) {
    const openingBottle = runningBottle;
    const openingBlister = runningBlister;
    const stockIn = stockInByDate.get(date) ?? { bottleIn: 0, blisterIn: 0 };
    const released = releasedByDate.get(date) ?? { bottleOut: 0, blisterOut: 0 };
    const closingBottle = openingBottle + stockIn.bottleIn - released.bottleOut;
    const closingBlister = openingBlister + stockIn.blisterIn - released.blisterOut;

    rows.push({
      date,
      bottleOpening: openingBottle,
      bottleIn: stockIn.bottleIn,
      bottleOut: released.bottleOut,
      bottleClosing: closingBottle,
      blisterOpening: openingBlister,
      blisterIn: stockIn.blisterIn,
      blisterOut: released.blisterOut,
      blisterClosing: closingBlister,
    });

    runningBottle = closingBottle;
    runningBlister = closingBlister;
  }

  return rows;
}
