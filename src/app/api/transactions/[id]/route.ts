import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateTransactionUpdate } from "@/lib/validation";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Params {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;
    const tx = await db.getTransactionById(id, user.id);

    if (!tx) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: tx });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to retrieve transaction" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const existing = await db.getTransactionById(id, user.id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    const validation = validateTransactionUpdate(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    const updated = await db.updateTransaction(id, validation.updates, user.id);

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Transaction updated successfully",
    });
  } catch (err: any) {
    console.error("PUT /api/transactions/[id] error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update transaction" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;
    const existing = await db.getTransactionById(id, user.id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    const deleted = await db.deleteTransaction(id, user.id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Failed to delete transaction" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (err: any) {
    console.error("DELETE /api/transactions/[id] error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete transaction" },
      { status: 500 }
    );
  }
}
