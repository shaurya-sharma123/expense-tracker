import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeExpenseCategories } from "@/lib/analytics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const transactions = await db.getAllTransactions();
    const categories = computeExpenseCategories(transactions);

    return NextResponse.json(
      {
        success: true,
        data: categories,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("GET /api/analytics/expense-categories error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to compute expense categories" },
      { status: 500 }
    );
  }
}
