import { NextRequest, NextResponse } from "next/server";
import { SyntheticFinancialDataProvider } from "@/lib/financial-provider/synthetic";
import { validateTransaction } from "@/lib/validation";
import { db } from "@/lib/db";
import { Transaction } from "@/types";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const inputAccountId = body.accountId !== undefined ? body.accountId : body.account_id;
    if (inputAccountId !== undefined && (typeof inputAccountId !== "string" || inputAccountId.trim() === "")) {
      return NextResponse.json(
        { success: false, error: "accountId cannot be empty" },
        { status: 400 }
      );
    }
    const accountId = (typeof inputAccountId === "string" && inputAccountId.trim()) ? inputAccountId.trim() : "acc_hdfc_freelance_01";
    const startDate = body.startDate || body.start_date || undefined;
    const endDate = body.endDate || body.end_date || undefined;

    // Secure: Always use the authenticated user's ID, ignore any client-supplied userId
    const userId = user.id;

    // Flow Step 1: FinancialDataProvider -> SyntheticProvider
    const provider = new SyntheticFinancialDataProvider();

    // Flow Step 2: Fetch raw transactions from provider
    const rawTransactions = await provider.fetchTransactions(
      accountId,
      startDate,
      endDate
    );

    if (!rawTransactions || rawTransactions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No transactions available to import",
        imported_count: 0,
        importedCount: 0,
        data: [],
      });
    }

    // Flow Step 3: Deduplication against existing user transactions
    const existingTransactions = await db.getAllTransactions({ userId });
    const existingExternalIds = new Set(
      existingTransactions
        .map((t) => t.external_transaction_id)
        .filter((id): id is string => Boolean(id))
    );
    const existingSignatures = new Set(
      existingTransactions.map(
        (t) => `${t.transaction_date}_${Number(t.amount).toFixed(2)}_${t.description.trim().toLowerCase()}`
      )
    );

    const validatedTransactions: Omit<
      Transaction,
      "id" | "created_at" | "updated_at"
    >[] = [];

    let skippedCount = 0;

    for (const raw of rawTransactions) {
      const signature = `${raw.date}_${Number(Math.abs(raw.amount)).toFixed(2)}_${raw.narrative.trim().toLowerCase()}`;
      
      // Skip if this transaction was already imported
      if (existingExternalIds.has(raw.txn_id) || existingSignatures.has(signature)) {
        skippedCount++;
        continue;
      }

      const normalized = provider.normalizeTransaction(raw, userId);
      const validation = validateTransaction(normalized);

      if (validation.valid && validation.sanitized) {
        validation.sanitized.user_id = userId;
        validatedTransactions.push(validation.sanitized);
      }
    }

    // If all transactions already exist in the ledger
    if (validatedTransactions.length === 0) {
      return NextResponse.json({
        success: true,
        provider: provider.getProviderName(),
        accountId,
        imported_count: 0,
        importedCount: 0,
        skipped_duplicates: skippedCount,
        message: `Account is already up-to-date. All ${skippedCount} transactions were recognized and skipped as duplicates.`,
        data: [],
      });
    }

    // Flow Step 4: Save only new, non-duplicate transactions
    const saved = await db.createTransactionsBatch(validatedTransactions);

    // Flow Step 5: Response
    return NextResponse.json(
      {
        success: true,
        provider: provider.getProviderName(),
        accountId,
        imported_count: saved.length,
        importedCount: saved.length,
        skipped_duplicates: skippedCount,
        message: skippedCount > 0
          ? `Successfully imported ${saved.length} new transactions (${skippedCount} duplicates skipped)`
          : `Successfully imported ${saved.length} financial transactions`,
        data: saved,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/financial-data/import error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to import financial data" },
      { status: 500 }
    );
  }
}
