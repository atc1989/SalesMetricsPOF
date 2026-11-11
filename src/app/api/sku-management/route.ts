import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { isEncoderPackageType, skuDiscountColumns } from "@/lib/dailySalesPackages";

export const dynamic = "force-dynamic";

// super_admin only: /api/sku-management is not in any other role's API prefixes (src/lib/auth/roles.ts).
export async function PUT(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as { rows?: unknown } | null;
  const rows = payload?.rows;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ success: false, message: "Missing rows" }, { status: 400 });
  }

  const discountColumns = Object.values(skuDiscountColumns);
  const upserts: Record<string, string | number>[] = [];
  const updatedAt = new Date().toISOString();

  for (const raw of rows) {
    const row = (raw ?? {}) as Record<string, unknown>;
    const packageType = String(row.package_type ?? "");
    if (!isEncoderPackageType(packageType)) {
      return NextResponse.json(
        { success: false, message: `Unknown SKU: ${packageType || "(blank)"}` },
        { status: 400 },
      );
    }

    const price = Number(row.original_price);
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        { success: false, message: `${packageType}: price must be 0 or more` },
        { status: 400 },
      );
    }

    const upsert: Record<string, string | number> = {
      package_type: packageType,
      original_price: price,
      updated_at: updatedAt,
    };

    for (const column of discountColumns) {
      const discount = Number(row[column] ?? 0);
      if (!Number.isFinite(discount) || discount < 0 || discount > price) {
        return NextResponse.json(
          { success: false, message: `${packageType}: ${column} must be between 0 and the price` },
          { status: 400 },
        );
      }
      upsert[column] = discount;
    }

    upserts.push(upsert);
  }

  const { error } = await getSupabaseAdminClient()
    .from("sku_prices")
    .upsert(upserts, { onConflict: "package_type" });

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to save SKU prices",
        error: { code: error.code, details: error.details, message: error.message },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, count: upserts.length });
}
