import { ALLOWED_CATEGORIES, AllowedCategory, Transaction } from "../types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: Omit<Transaction, "id" | "created_at" | "updated_at">;
}

/**
 * Validates transaction payload for insertion/creation.
 */
export function validateTransaction(input: any): ValidationResult {
  const errors: string[] = [];

  // 1. Amount validation
  if (
    input.amount === undefined ||
    input.amount === null ||
    isNaN(Number(input.amount)) ||
    Number(input.amount) <= 0
  ) {
    errors.push("Amount is required and must be a positive number.");
  }

  // 2. Type validation
  if (!input.type || !["income", "expense"].includes(input.type)) {
    errors.push("Type must be either 'income' or 'expense'.");
  }

  // 3. Category validation
  if (!input.category || typeof input.category !== "string") {
    errors.push("Category is required.");
  } else if (!ALLOWED_CATEGORIES.includes(input.category as AllowedCategory)) {
    errors.push(
      `Category '${input.category}' is invalid. Allowed categories: ${ALLOWED_CATEGORIES.join(", ")}.`
    );
  }

  // 4. Description validation
  if (!input.description || typeof input.description !== "string" || input.description.trim().length === 0) {
    errors.push("Description is required.");
  }

  // 5. Date validation (YYYY-MM-DD)
  if (!input.transaction_date || typeof input.transaction_date !== "string") {
    errors.push("Transaction date is required.");
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(input.transaction_date)) {
    errors.push("Transaction date must be in YYYY-MM-DD format.");
  } else {
    const d = new Date(input.transaction_date);
    if (isNaN(d.getTime())) {
      errors.push("Transaction date is not a valid calendar date.");
    }
  }

  // 6. Source validation
  if (!input.source || !["open_banking", "ai"].includes(input.source)) {
    errors.push("Source must be either 'open_banking' or 'ai'.");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    sanitized: {
      user_id: input.user_id || "demo-user-001",
      amount: Number(Number(input.amount).toFixed(2)),
      type: input.type,
      category: input.category,
      description: input.description.trim(),
      transaction_date: input.transaction_date,
      source: input.source,
      merchant: input.merchant ? String(input.merchant).trim() : undefined,
      external_transaction_id: input.external_transaction_id ? String(input.external_transaction_id).trim() : undefined,
      raw_data: typeof input.raw_data === "object" ? input.raw_data : undefined,
    },
  };
}

/**
 * Validates partial updates for existing transaction.
 */
export function validateTransactionUpdate(input: any): { valid: boolean; errors: string[]; updates: Partial<Transaction> } {
  const errors: string[] = [];
  const updates: Partial<Transaction> = {};

  if (input.amount !== undefined) {
    if (isNaN(Number(input.amount)) || Number(input.amount) <= 0) {
      errors.push("Amount must be a positive number.");
    } else {
      updates.amount = Number(Number(input.amount).toFixed(2));
    }
  }

  if (input.type !== undefined) {
    if (!["income", "expense"].includes(input.type)) {
      errors.push("Type must be either 'income' or 'expense'.");
    } else {
      updates.type = input.type;
    }
  }

  if (input.category !== undefined) {
    if (!ALLOWED_CATEGORIES.includes(input.category as AllowedCategory)) {
      errors.push(`Category '${input.category}' is invalid. Allowed: ${ALLOWED_CATEGORIES.join(", ")}`);
    } else {
      updates.category = input.category;
    }
  }

  if (input.description !== undefined) {
    if (typeof input.description !== "string" || input.description.trim().length === 0) {
      errors.push("Description cannot be empty.");
    } else {
      updates.description = input.description.trim();
    }
  }

  if (input.transaction_date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.transaction_date)) {
      errors.push("Transaction date must be in YYYY-MM-DD format.");
    } else {
      updates.transaction_date = input.transaction_date;
    }
  }

  if (input.merchant !== undefined) {
    updates.merchant = input.merchant ? String(input.merchant).trim() : undefined;
  }

  return {
    valid: errors.length === 0,
    errors,
    updates,
  };
}
