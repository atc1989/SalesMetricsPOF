import { NextRequest, NextResponse } from "next/server";

import {
  assertValidExportDateRange,
  buildSalesBudgetWorkbook,
  getSalesBudgetExportScope,
} from "@/lib/assistant/salesBudgetExport";
import { requireRouteAccess } from "@/lib/auth/routeGuard";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getBooleanParam(value: string | null) {
  if (value === null) {
    return undefined;
  }

  return value === "true";
}

export async function GET(request: NextRequest) {
  const { response, auth } = await requireRouteAccess(request);
  if (response) return response;

  try {
    const { dateFrom, dateTo } = assertValidExportDateRange(
      request.nextUrl.searchParams.get("dateFrom"),
      request.nextUrl.searchParams.get("dateTo"),
    );
    const scope = getSalesBudgetExportScope(auth.role, {
      includeSales: getBooleanParam(request.nextUrl.searchParams.get("includeSales")),
      includeOperations: getBooleanParam(
        request.nextUrl.searchParams.get("includeOperations"),
      ),
    });

    if (!scope.includeSales && !scope.includeOperations) {
      return NextResponse.json(
        { success: false, message: "No exportable sheets are allowed for this role." },
        { status: 403 },
      );
    }

    const result = await buildSalesBudgetWorkbook(getSupabaseAdminClient(), {
      dateFrom,
      dateTo,
      scope,
    });

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate workbook.";

    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
