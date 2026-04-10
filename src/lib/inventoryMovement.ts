export const INITIAL_BOTTLE_STOCK = 23057;
export const INITIAL_BLISTER_STOCK = 16212;

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
  id: string;
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
