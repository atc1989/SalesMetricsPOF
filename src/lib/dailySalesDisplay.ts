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
