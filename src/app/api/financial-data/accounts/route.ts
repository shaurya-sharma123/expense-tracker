import { NextRequest, NextResponse } from "next/server";
import { SyntheticFinancialDataProvider } from "@/lib/financial-provider/synthetic";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const provider = new SyntheticFinancialDataProvider();
    const accounts = await provider.getAccounts("demo-user-001");

    return NextResponse.json({
      success: true,
      provider: provider.getProviderName(),
      data: accounts,
    });
  } catch (err: any) {
    console.error("GET /api/financial-data/accounts error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}
