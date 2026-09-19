import {
  Transaction,
  AnalyticsSummary,
  IncomeVariability,
  SuggestedBuffer,
  IncomeTrendPoint,
  ExpenseCategoryPoint,
} from "../types";

/**
 * Calculates standard ISO week key (e.g. "2026-W24") for a given date string.
 */
export function getISOWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const target = new Date(d.valueOf());
  const dayNr = (d.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const year = d.getUTCFullYear();
  return `${year}-W${weekNumber.toString().padStart(2, "0")}`;
}

/**
 * Calculates month key (e.g. "2026-06") for a date string.
 */
export function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/**
 * Computes the Coefficient of Variation (CV) for income variability:
 * 1. Group income by week
 * 2. Mean weekly income (mu)
 * 3. Standard deviation (sigma)
 * 4. CV = sigma / mu (handle mu = 0 safely)
 */
export function calculateIncomeVariability(
  transactions: Transaction[]
): IncomeVariability {
  const incomeTxs = transactions.filter((t) => t.type === "income");

  if (incomeTxs.length === 0) {
    return {
      mean_weekly_income: 0,
      std_dev_weekly_income: 0,
      cv: 0,
      variability_level: "Low",
      disclaimer: "Prototype thresholds (<0.25 Low, 0.25-0.50 Med, >=0.50 High), not universal financial standards.",
      weekly_data_points: [],
    };
  }

  // 1. Group income by week
  const weeklyMap = new Map<string, number>();
  for (const t of incomeTxs) {
    const weekKey = getISOWeekKey(t.transaction_date);
    weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + Number(t.amount));
  }

  const weeklyDataPoints = Array.from(weeklyMap.entries())
    .map(([week, amount]) => ({ week, amount }))
    .sort((a, b) => a.week.localeCompare(b.week));

  const values = weeklyDataPoints.map((d) => d.amount);
  const n = values.length;

  if (n === 0) {
    return {
      mean_weekly_income: 0,
      std_dev_weekly_income: 0,
      cv: 0,
      variability_level: "Low",
      disclaimer: "Prototype thresholds (<0.25 Low, 0.25-0.50 Med, >=0.50 High), not universal financial standards.",
      weekly_data_points: [],
    };
  }

  // 2. Mean weekly income
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  // 3. Standard deviation
  let stdDev = 0;
  if (n > 1) {
    const variance =
      values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1);
    stdDev = Math.sqrt(variance);
  }

  // 4. CV = standard deviation / mean (safe zero check)
  const cv = mean > 0 ? Number((stdDev / mean).toFixed(3)) : 0;

  // 5. Prototype thresholds:
  // CV < 0.25 = Low
  // 0.25 <= CV < 0.50 = Medium
  // CV >= 0.50 = High
  let variabilityLevel: "Low" | "Medium" | "High" = "Low";
  if (cv >= 0.5) {
    variabilityLevel = "High";
  } else if (cv >= 0.25) {
    variabilityLevel = "Medium";
  }

  return {
    mean_weekly_income: Math.round(mean),
    std_dev_weekly_income: Math.round(stdDev),
    cv,
    variability_level: variabilityLevel,
    disclaimer:
      "Prototype thresholds (<0.25 Low, 0.25-0.50 Med, >=0.50 High), not universal financial standards.",
    weekly_data_points: weeklyDataPoints,
  };
}

/**
 * Computes Suggested Financial Buffer:
 * Average Monthly Income x 1.5
 */
export function calculateSuggestedBuffer(
  transactions: Transaction[]
): SuggestedBuffer {
  const incomeTxs = transactions.filter((t) => t.type === "income");

  if (incomeTxs.length === 0) {
    return {
      average_monthly_income: 0,
      buffer_amount: 0,
      formula: "Average Monthly Income x 1.5",
      disclaimer: "Prototype estimate, not professional financial advice.",
    };
  }

  // Group by month
  const monthlyMap = new Map<string, number>();
  for (const t of incomeTxs) {
    const m = getMonthKey(t.transaction_date);
    monthlyMap.set(m, (monthlyMap.get(m) || 0) + Number(t.amount));
  }

  const monthlySums = Array.from(monthlyMap.values());
  const monthCount = Math.max(monthlySums.length, 1);
  const totalIncome = monthlySums.reduce((acc, v) => acc + v, 0);
  const avgMonthlyIncome = totalIncome / monthCount;

  const bufferAmount = Math.round(avgMonthlyIncome * 1.5);

  return {
    average_monthly_income: Math.round(avgMonthlyIncome),
    buffer_amount: bufferAmount,
    formula: "Average Monthly Income x 1.5",
    disclaimer: "Prototype estimate, not professional financial advice.",
  };
}

/**
 * Aggregates complete analytics summary
 */
export function computeAnalyticsSummary(
  transactions: Transaction[]
): AnalyticsSummary {
  let totalIncome = 0;
  let totalExpenses = 0;
  let openBankingCount = 0;
  let aiCount = 0;

  // Determine current ISO week and current month from latest transaction or system date
  const referenceDate =
    transactions.length > 0
      ? transactions[0].transaction_date
      : new Date().toISOString().split("T")[0];

  const currentWeek = getISOWeekKey(referenceDate);
  const currentMonth = getMonthKey(referenceDate);

  let currentWeekIncome = 0;
  let currentWeekExpenses = 0;
  let currentMonthIncome = 0;
  let currentMonthExpenses = 0;

  for (const t of transactions) {
    const amt = Number(t.amount);
    const tWeek = getISOWeekKey(t.transaction_date);
    const tMonth = getMonthKey(t.transaction_date);

    if (t.source === "open_banking") openBankingCount++;
    if (t.source === "ai") aiCount++;

    if (t.type === "income") {
      totalIncome += amt;
      if (tWeek === currentWeek) currentWeekIncome += amt;
      if (tMonth === currentMonth) currentMonthIncome += amt;
    } else {
      totalExpenses += amt;
      if (tWeek === currentWeek) currentWeekExpenses += amt;
      if (tMonth === currentMonth) currentMonthExpenses += amt;
    }
  }

  const incomeVariability = calculateIncomeVariability(transactions);
  const suggestedBuffer = calculateSuggestedBuffer(transactions);

  return {
    total_income: Math.round(totalIncome),
    total_expenses: Math.round(totalExpenses),
    net_balance: Math.round(totalIncome - totalExpenses),
    weekly: {
      income: Math.round(currentWeekIncome),
      expenses: Math.round(currentWeekExpenses),
      balance: Math.round(currentWeekIncome - currentWeekExpenses),
    },
    monthly: {
      income: Math.round(currentMonthIncome),
      expenses: Math.round(currentMonthExpenses),
      balance: Math.round(currentMonthIncome - currentMonthExpenses),
    },
    income_variability: incomeVariability,
    suggested_buffer: suggestedBuffer,
    transaction_count: {
      total: transactions.length,
      open_banking: openBankingCount,
      ai: aiCount,
    },
  };
}

/**
 * Computes chronological income and expense trend points
 */
export function computeIncomeTrend(
  transactions: Transaction[]
): IncomeTrendPoint[] {
  const periodMap = new Map<string, { income: number; expense: number }>();

  for (const t of transactions) {
    const week = getISOWeekKey(t.transaction_date);
    const current = periodMap.get(week) || { income: 0, expense: 0 };
    const amt = Number(t.amount);

    if (t.type === "income") {
      current.income += amt;
    } else {
      current.expense += amt;
    }
    periodMap.set(week, current);
  }

  return Array.from(periodMap.entries())
    .map(([period, data]) => ({
      period: period.replace(/^2026-/, ""), // e.g. "W24"
      income: Math.round(data.income),
      expense: Math.round(data.expense),
      net: Math.round(data.income - data.expense),
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Computes expense breakdown by category with percentages
 */
export function computeExpenseCategories(
  transactions: Transaction[]
): ExpenseCategoryPoint[] {
  const expenseTxs = transactions.filter((t) => t.type === "expense");
  const totalExpense = expenseTxs.reduce((acc, t) => acc + Number(t.amount), 0);

  const categoryMap = new Map<string, { amount: number; count: number }>();

  for (const t of expenseTxs) {
    const cat = t.category || "Other";
    const current = categoryMap.get(cat) || { amount: 0, count: 0 };
    current.amount += Number(t.amount);
    current.count += 1;
    categoryMap.set(cat, current);
  }

  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      amount: Math.round(data.amount),
      percentage:
        totalExpense > 0
          ? Number(((data.amount / totalExpense) * 100).toFixed(1))
          : 0,
      count: data.count,
    }))
    .sort((a, b) => b.amount - a.amount);
}
