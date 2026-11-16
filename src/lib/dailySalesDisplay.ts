export function formatPofNumber(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.trim().replace(/\s*-\s*/g, "-");
}

export function formatZeroOne(value: string | null | undefined) {
  return value?.trim() ?? "";
}

export function formatMemberName(value: string | null | undefined) {
  return value?.trim() ?? "";
}

// Display name for a saved mode_of_payment. EWALLET is shown as BPI; the stored value stays EWALLET.
export function formatPaymentMode(value: string | null | undefined) {
  const mode = value?.trim() ?? "";
  return /^E-?WALLET$/i.test(mode) ? "BPI" : mode;
}
