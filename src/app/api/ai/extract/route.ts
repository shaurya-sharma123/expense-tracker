import { NextRequest, NextResponse } from "next/server";
import { extractCashTransaction } from "@/lib/ai/extractor";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const text = body.text;
    const referenceDate = body.referenceDate; // optional YYYY-MM-DD

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Text prompt is required for AI extraction" },
        { status: 400 }
      );
    }

    const extraction = await extractCashTransaction(text, { referenceDate });

    // Note: AI extraction MUST NOT automatically save the transaction.
    // The frontend must present this preview to the user to review and confirm.
    return NextResponse.json({
      success: true,
      extracted: extraction,
      requires_user_confirmation: true,
    });
  } catch (err: any) {
    console.error("POST /api/ai/extract error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to extract transaction details" },
      { status: 500 }
    );
  }
}
