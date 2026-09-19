import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateTransaction } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || undefined;
    const category = searchParams.get("category") || undefined;
    const source = searchParams.get("source") || undefined;
    const search = searchParams.get("search") || undefined;

    const transactions = await db.getAllTransactions({
      type,
      category,
      source,
      search,
    });

    return NextResponse.json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (err: any) {
    console.error("GET /api/transactions error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const validation = validateTransaction(body);
    if (!validation.valid || !validation.sanitized) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // NOTE: Strictly no duplicate detection per specification.
    const created = await db.createTransaction(validation.sanitized);

    return NextResponse.json(
      {
        success: true,
        data: created,
        message: "Transaction created successfully",
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/transactions error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create transaction" },
      { status: 500 }
    );
  }
}
