// Stage 4: Analytics and Final MVP Dashboard Automated Verification Test
import assert from "assert";

const BASE_URL = "http://localhost:3000";

async function verifyStage4() {
  console.log("==================================================");
  console.log("RUNNING STAGE 4: ANALYTICS & FINAL MVP VERIFICATION");
  console.log("==================================================");

  // 1. Test GET /api/analytics/summary
  console.log("\n1. Testing GET /api/analytics/summary...");
  const sumRes = await fetch(`${BASE_URL}/api/analytics/summary`);
  assert.strictEqual(sumRes.status, 200, "Summary endpoint must return 200");
  const sumJson = await sumRes.json();
  assert.strictEqual(sumJson.success, true);
  const data = sumJson.data;

  // Verify Financial Summary metrics
  assert(typeof data.total_income === "number", "total_income must be number");
  assert(typeof data.total_expenses === "number", "total_expenses must be number");
  assert(typeof data.net_balance === "number", "net_balance must be number");
  assert.strictEqual(data.net_balance, data.total_income - data.total_expenses, "net_balance must equal income - expenses");

  assert(data.weekly && typeof data.weekly.income === "number", "weekly income must exist");
  assert(typeof data.weekly.expenses === "number", "weekly expenses must exist");
  assert(typeof data.weekly.balance === "number", "weekly balance must exist");

  assert(data.monthly && typeof data.monthly.income === "number", "monthly income must exist");
  assert(typeof data.monthly.expenses === "number", "monthly expenses must exist");
  assert(typeof data.monthly.balance === "number", "monthly balance must exist");

  console.log("✓ Financial Summary Verified:", {
    totalIncome: data.total_income,
    totalExpenses: data.total_expenses,
    balance: data.net_balance,
    weekly: data.weekly,
    monthly: data.monthly,
  });

  // Verify Income Variability Calculation
  const iv = data.income_variability;
  assert(iv, "income_variability must exist");
  assert(typeof iv.mean_weekly_income === "number");
  assert(typeof iv.std_dev_weekly_income === "number");
  assert(typeof iv.cv === "number");
  assert(["Low", "Medium", "High"].includes(iv.variability_level), "Level must be Low, Medium, or High");
  assert(iv.disclaimer.toLowerCase().includes("prototype"), "Must include prototype disclaimer");

  console.log("✓ Income Variability Verified:", {
    meanWeekly: iv.mean_weekly_income,
    stdDev: iv.std_dev_weekly_income,
    cv: iv.cv,
    level: iv.variability_level,
    disclaimer: iv.disclaimer,
  });

  // Verify Suggested Financial Buffer
  const sb = data.suggested_buffer;
  assert(sb, "suggested_buffer must exist");
  assert(typeof sb.average_monthly_income === "number");
  assert(typeof sb.buffer_amount === "number");
  assert.strictEqual(sb.buffer_amount, Math.round(sb.average_monthly_income * 1.5), "Buffer must equal 1.5x average monthly income");
  assert.strictEqual(sb.disclaimer, "Prototype estimate, not professional financial advice.");

  console.log("✓ Suggested Financial Buffer Verified:", {
    avgMonthly: sb.average_monthly_income,
    bufferAmount: sb.buffer_amount,
    disclaimer: sb.disclaimer,
  });

  // 2. Test GET /api/analytics/income-trend
  console.log("\n2. Testing GET /api/analytics/income-trend...");
  const trendRes = await fetch(`${BASE_URL}/api/analytics/income-trend`);
  assert.strictEqual(trendRes.status, 200);
  const trendJson = await trendRes.json();
  assert.strictEqual(trendJson.success, true);
  assert(Array.isArray(trendJson.data), "income-trend data must be array");
  assert(trendJson.data.length > 0, "income-trend data must have points");
  const firstPoint = trendJson.data[0];
  assert(firstPoint.period, "Trend point must have period");
  assert(typeof firstPoint.income === "number", "Trend point must have income");
  assert(typeof firstPoint.expense === "number", "Trend point must have expense");

  console.log(`✓ Income Trend Verified: ${trendJson.data.length} weekly data points generated`);

  // 3. Test GET /api/analytics/expense-categories
  console.log("\n3. Testing GET /api/analytics/expense-categories...");
  const catRes = await fetch(`${BASE_URL}/api/analytics/expense-categories`);
  assert.strictEqual(catRes.status, 200);
  const catJson = await catRes.json();
  assert.strictEqual(catJson.success, true);
  assert(Array.isArray(catJson.data), "expense-categories data must be array");
  assert(catJson.data.length > 0, "expense-categories must have categories");
  const firstCat = catJson.data[0];
  assert(firstCat.category, "Category entry must have category name");
  assert(typeof firstCat.amount === "number", "Category entry must have amount");
  assert(typeof firstCat.percentage === "number", "Category entry must have percentage");

  console.log(`✓ Expense Categories Verified: ${catJson.data.length} categories grouped:`, catJson.data.map(c => `${c.category} (${c.percentage}%)`).join(", "));

  // 4. Verify Pages Load with HTTP 200
  console.log("\n4. Verifying /dashboard and /transactions pages load...");
  const dashRes = await fetch(`${BASE_URL}/dashboard`);
  assert.strictEqual(dashRes.status, 200, "/dashboard must return 200");
  const txRes = await fetch(`${BASE_URL}/transactions`);
  assert.strictEqual(txRes.status, 200, "/transactions must return 200");

  console.log("✓ /dashboard and /transactions loaded with HTTP 200 OK");

  console.log("\n==================================================");
  console.log("STAGE 4 ANALYTICS & FINAL MVP VERIFIED (100% PASS)");
  console.log("==================================================");
}

verifyStage4().catch((err) => {
  console.error("Stage 4 verification failed:", err);
  process.exit(1);
});
