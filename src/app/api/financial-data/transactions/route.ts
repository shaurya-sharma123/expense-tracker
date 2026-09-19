import { NextRequest, NextResponse } from "next/server";
import { SyntheticFinancialDataProvider } from "@/lib/financial-provider/synthetic";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId") || "acc_hdfc_freelance_01";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const provider = new SyntheticFinancialDataProvider();
    const rawTransactions = await provider.fetchTransactions(
      accountId,
      startDate,
      endDate
    );

    return NextResponse.json({
      success: true,
      provider: provider.getProviderName(),
      accountId,
      count: rawTransactions.length,
      data: rawTransactions,
    });
  } catch (err: any) {
    console.error("GET /api/financial-data/transactions error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch transactions from provider" },
      { status: 500 }
    );
  }
}
