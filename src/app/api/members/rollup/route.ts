import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Per-member rollup: given a user_account_id, return the member plus their
// sales (daily_sales matched by user_name) and their bills (bills whose
// vendor is linked to this member via vendors.user_account_id).

export async function GET(request: NextRequest) {
  const idParam = request.nextUrl.searchParams.get("id");
  const memberId = Number(idParam);

  if (!idParam || !Number.isFinite(memberId)) {
    return NextResponse.json(
      { success: false, message: "A numeric member id is required." },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdminClient();

    // 1. The member.
    const { data: member, error: memberError } = await supabase
      .from("user_account")
      .select(
        "user_account_id,user_name,full_name,sponsor,placement,group,account_type,zero_one,code_payment,brgy,city,province,region,country",
      )
      .eq("user_account_id", memberId)
      .maybeSingle();

    if (memberError) {
      return NextResponse.json(
        { success: false, message: memberError.message },
        { status: 500 },
      );
    }
    if (!member) {
      return NextResponse.json(
        { success: false, message: "Member not found." },
        { status: 404 },
      );
    }

    // 2. Sales — daily_sales rows whose username matches this member.
    let sales: unknown[] = [];
    if (member.user_name && member.user_name.trim()) {
      const { data: salesRows, error: salesError } = await supabase
        .from("daily_sales")
        .select(
          "daily_sales_id,trans_date,pof_number,package_type,bottle_count,blister_count,sales,mode_of_payment",
        )
        .eq("username", member.user_name)
        .order("trans_date", { ascending: false });

      if (salesError) {
        return NextResponse.json(
          { success: false, message: salesError.message },
          { status: 500 },
        );
      }
      sales = salesRows ?? [];
    }

    // 3. Bills — vendors linked to this member, then their bills.
    const { data: vendorRows, error: vendorError } = await supabase
      .from("vendors")
      .select("id,name")
      .eq("user_account_id", memberId);

    if (vendorError) {
      return NextResponse.json(
        { success: false, message: vendorError.message },
        { status: 500 },
      );
    }

    const vendorIds = (vendorRows ?? []).map((v) => v.id as string);
    let bills: unknown[] = [];
    if (vendorIds.length > 0) {
      const { data: billRows, error: billError } = await supabase
        .from("bills")
        .select(
          "id,reference_no,request_date,status,priority_level,payment_method,total_amount,vendor_id",
        )
        .in("vendor_id", vendorIds)
        .order("request_date", { ascending: false });

      if (billError) {
        return NextResponse.json(
          { success: false, message: billError.message },
          { status: 500 },
        );
      }
      bills = billRows ?? [];
    }

    // 4. Totals.
    const totalSales = (sales as { sales?: number }[]).reduce(
      (sum, row) => sum + Number(row.sales ?? 0),
      0,
    );
    const totalBills = (bills as { total_amount?: number }[]).reduce(
      (sum, row) => sum + Number(row.total_amount ?? 0),
      0,
    );

    return NextResponse.json({
      success: true,
      member,
      sales,
      bills,
      vendors: vendorRows ?? [],
      totals: {
        totalSales,
        totalBills,
        salesCount: sales.length,
        billsCount: bills.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to load member rollup.",
      },
      { status: 500 },
    );
  }
}
