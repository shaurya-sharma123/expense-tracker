export const ALLOWED_CATEGORIES = [
  "Salary",
  "Freelance",
  "Business",
  "Food",
  "Transport",
  "Rent",
  "Bills",
  "Shopping",
  "Education",
  "Healthcare",
  "Cash Withdrawal",
  "Other",
] as const;

export type AllowedCategory = (typeof ALLOWED_CATEGORIES)[number];

export type TransactionType = "income" | "expense";

export type TransactionSource = "open_banking" | "ai";

export type Transaction = {
  id?: string;
  user_id?: string;
  amount: number;
  type: TransactionType;
  category: string; // AllowedCategory or validated string
  description: string;
  transaction_date: string; // YYYY-MM-DD
  source: TransactionSource;
  merchant?: string;
  external_transaction_id?: string;
  raw_data?: object;
  created_at?: string;
  updated_at?: string;
};

export type AIExtractionResult = {
  amount: number | null;
  type: TransactionType;
  category: string;
  description: string;
  transaction_date: string | null;
  merchant?: string;
  missing_fields: ("amount" | "transaction_date")[];
  notes?: string;
};

export type BankAccount = {
  account_id: string;
  account_name: string;
  bank_name: string;
  account_type: "current" | "savings";
  masked_account_number: string;
  balance: number;
  currency: string;
};

export type RawExternalTransaction = {
  txn_id: string;
  date: string;
  narrative: string;
  amount: number;
  direction: "CR" | "DR";
  mode: "UPI" | "NEFT" | "IMPS" | "ATM" | "POS" | "SALARY" | "DIRECT";
  merchant_name?: string;
  balance_after?: number;
};

export type IncomeVariability = {
  mean_weekly_income: number;
  std_dev_weekly_income: number;
  cv: number;
  variability_level: "Low" | "Medium" | "High";
  disclaimer: string;
  weekly_data_points: {
    week: string;
    amount: number;
  }[];
};

export type SuggestedBuffer = {
  average_monthly_income: number;
  buffer_amount: number;
  formula: string;
  disclaimer: string;
};

export type AnalyticsSummary = {
  total_income: number;
  total_expenses: number;
  net_balance: number;
  weekly: {
    income: number;
    expenses: number;
    balance: number;
  };
  monthly: {
    income: number;
    expenses: number;
    balance: number;
  };
  income_variability: IncomeVariability;
  suggested_buffer: SuggestedBuffer;
  transaction_count: {
    total: number;
    open_banking: number;
    ai: number;
  };
};

export type IncomeTrendPoint = {
  period: string;
  income: number;
  expense: number;
  net: number;
};

export type ExpenseCategoryPoint = {
  category: string;
  amount: number;
  percentage: number;
  count: number;
};
