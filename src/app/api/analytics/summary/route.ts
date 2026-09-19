import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeAnalyticsSummary } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const transactions = await db.getAllTransactions();
    const summary = computeAnalyticsSummary(transactions);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (err: any) {
    console.error("GET /api/analytics/summary error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to compute analytics summary" },
      { status: 500 }
    );
  }
}
