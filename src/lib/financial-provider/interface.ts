import { BankAccount, RawExternalTransaction, Transaction } from "@/types";

export interface FinancialDataProvider {
  getProviderName(): string;
  getAccounts(userId: string): Promise<BankAccount[]>;
  fetchTransactions(
    accountId: string,
    startDate?: string,
    endDate?: string
  ): Promise<RawExternalTransaction[]>;
  normalizeTransaction(
    raw: RawExternalTransaction,
    userId?: string
  ): Omit<Transaction, "id" | "created_at" | "updated_at">;
}
