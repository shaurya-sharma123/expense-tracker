import { NextRequest, NextResponse } from "next/server";
import { SyntheticFinancialDataProvider } from "@/lib/financial-provider/synthetic";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

    const provider = new SyntheticFinancialDataProvider();
    const accounts = await provider.getAccounts(user.id);

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
