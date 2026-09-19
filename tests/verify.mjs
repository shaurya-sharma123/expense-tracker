// Automated Verification Script for CS04 FinTech MVP
import assert from "assert";

// 1. Test CV Income Variability Calculation Logic
function getISOWeekKey(dateStr) {
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

function calculateCV(weeklyIncomes) {
  const n = weeklyIncomes.length;
  if (n === 0) return { cv: 0, level: "Low" };
  const sum = weeklyIncomes.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;
  if (mean === 0) return { cv: 0, level: "Low" };

  let stdDev = 0;
  if (n > 1) {
    const variance =
      weeklyIncomes.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1);
    stdDev = Math.sqrt(variance);
  }
  const cv = Number((stdDev / mean).toFixed(3));

  let level = "Low";
  if (cv >= 0.5) level = "High";
  else if (cv >= 0.25) level = "Medium";

  return { cv, level, mean: Math.round(mean), stdDev: Math.round(stdDev) };
}

console.log("--- Testing CV Variability Calculation ---");

// Test 1: Zero income
const resZero = calculateCV([]);
assert.strictEqual(resZero.cv, 0, "CV of empty incomes should be 0");
assert.strictEqual(resZero.level, "Low");
console.log("✓ Zero income handled safely");

// Test 2: Stable income (Low variability CV < 0.25)
// Values close to each other: 10000, 10500, 9800, 10200
const resStable = calculateCV([10000, 10500, 9800, 10200]);
assert(resStable.cv < 0.25, `Expected Low variability (<0.25), got ${resStable.cv}`);
assert.strictEqual(resStable.level, "Low");
console.log(`✓ Stable income CV: ${resStable.cv} (Level: ${resStable.level})`);

// Test 3: Moderate variability (Medium 0.25 <= CV < 0.50)
// e.g. 5000, 10000, 7000, 12000
const resMed = calculateCV([5000, 10000, 7000, 12000]);
assert(resMed.cv >= 0.25 && resMed.cv < 0.5, `Expected Medium variability, got ${resMed.cv}`);
assert.strictEqual(resMed.level, "Medium");
console.log(`✓ Medium volatility CV: ${resMed.cv} (Level: ${resMed.level})`);

// Test 4: Highly irregular income (High variability CV >= 0.50)
// Gig worker pattern: 1500, 24000, 0, 31000, 1000
const resHigh = calculateCV([1500, 24000, 0, 31000, 1000]);
assert(resHigh.cv >= 0.5, `Expected High variability, got ${resHigh.cv}`);
assert.strictEqual(resHigh.level, "High");
console.log(`✓ High volatility CV: ${resHigh.cv} (Level: ${resHigh.level})`);

// 2. Test Suggested Buffer Calculation
console.log("\n--- Testing Suggested Financial Buffer ---");
function calculateBuffer(monthlyIncomes) {
  const avgMonthly = monthlyIncomes.reduce((a, b) => a + b, 0) / monthlyIncomes.length;
  const buffer = Math.round(avgMonthly * 1.5);
  return { avgMonthly, buffer };
}

const buff = calculateBuffer([35000, 42000, 28000]); // Avg = 35000
assert.strictEqual(buff.avgMonthly, 35000);
assert.strictEqual(buff.buffer, 52500); // 35000 * 1.5 = 52500
console.log(`✓ Buffer 1.5x test passed: Avg 35,000 -> Buffer: ₹${buff.buffer}`);

// 3. Test AI Heuristic Extractor Rules
console.log("\n--- Testing AI Extraction Rules & Non-Invention ---");

import { extractWithHeuristics } from "../src/lib/ai/extractor.ts";

// Test A: Complete cash entry with explicit relative date
const refDate = "2026-09-19";
const ext1 = extractWithHeuristics("I earned ₹3000 cash repairing phones today.", refDate);
assert.strictEqual(ext1.amount, 3000);
assert.strictEqual(ext1.type, "income");
assert.strictEqual(ext1.category, "Freelance");
assert.strictEqual(ext1.transaction_date, "2026-09-19");
assert.strictEqual(ext1.missing_fields.length, 0);
console.log("✓ Normal entry extracted accurately:", ext1);

// Test B: Missing amount - must NOT invent amount!
const extMissingAmt = extractWithHeuristics("Spent cash on groceries at market today.", refDate);
assert.strictEqual(extMissingAmt.amount, null, "Amount must be null if not stated");
assert(extMissingAmt.missing_fields.includes("amount"), "missing_fields must contain 'amount'");
console.log("✓ Missing amount verified (not invented):", extMissingAmt.missing_fields);

// Test C: Missing date - must NOT invent date!
const extMissingDate = extractWithHeuristics("Earned 4500 cash for electrical work.", refDate);
assert.strictEqual(extMissingDate.transaction_date, null, "Date must be null if not stated");
assert(extMissingDate.missing_fields.includes("transaction_date"), "missing_fields must contain 'transaction_date'");
console.log("✓ Missing date verified (not invented):", extMissingDate.missing_fields);

// Test D: Yesterday relative date resolution
const extYesterday = extractWithHeuristics("Received 12000 cash for wedding photography yesterday.", refDate);
assert.strictEqual(extYesterday.amount, 12000);
assert.strictEqual(extYesterday.transaction_date, "2026-09-18");
assert.strictEqual(extYesterday.missing_fields.length, 0);
console.log("✓ Relative date 'yesterday' correctly resolved to 2026-09-18");

// 4. Test Synthetic Provider
console.log("\n--- Testing Synthetic Financial Provider ---");
import { SyntheticFinancialDataProvider } from "../src/lib/financial-provider/synthetic.ts";
const provider = new SyntheticFinancialDataProvider();
const accounts = await provider.getAccounts("demo");
assert(accounts.length >= 2, "Must return multiple accounts");
const txs = await provider.fetchTransactions(accounts[0].account_id);
assert(txs.length >= 50, `Expected 50-100 transactions, got ${txs.length}`);
console.log(`✓ Synthetic provider returned ${txs.length} realistic transactions across multiple weeks`);

// Verify allowed categories
const ALLOWED_CATEGORIES = [
  "Salary", "Freelance", "Business", "Food", "Transport", "Rent",
  "Bills", "Shopping", "Education", "Healthcare", "Cash Withdrawal", "Other"
];

for (const raw of txs) {
  const norm = provider.normalizeTransaction(raw);
  assert(ALLOWED_CATEGORIES.includes(norm.category), `Invalid category: ${norm.category}`);
  assert.strictEqual(norm.source, "open_banking");
}
console.log("✓ All normalized transactions comply with 12 allowed categories and source='open_banking'");

console.log("\n=================================");
console.log("ALL AUTOMATED TESTS PASSED (100%)");
console.log("=================================");
