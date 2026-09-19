// tests/final-mvp-review.mjs
// Automated verification of all 18 MVP requirements

import assert from "node:assert/strict";

const BASE_URL = "http://localhost:3000";

async function runReview() {
  console.log("=================================================");
  console.log("STARTING FINAL MVP REVIEW TEST SUITE");
  console.log("=================================================\n");

  let testId = null;

  // 1. Import synthetic financial data
  console.log("TEST 1: Import synthetic financial data...");
  const importRes = await fetch(`${BASE_URL}/api/financial-data/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account_id: "synthetic-acc-sbi-001" }),
  });
  assert.ok([200, 201].includes(importRes.status), `Import response status should be 200 or 201, got ${importRes.status}`);
  const importData = await importRes.json();
  assert.equal(importData.success, true, "Import response should be successful");
  const count = importData.imported_count ?? importData.data?.length ?? 0;
  assert.ok(count >= 50, `Should import 50+ transactions, got ${count}`);
  console.log(`✓ TEST 1 PASSED: Successfully imported ${count} synthetic transactions.\n`);

  // 2. Verify transactions appear in Supabase / DB
  console.log("TEST 2: Verify transactions appear in database...");
  const listRes = await fetch(`${BASE_URL}/api/transactions`);
  assert.equal(listRes.status, 200, "Transactions list status should be 200");
  const listData = await listRes.json();
  assert.equal(listData.success, true, "Transactions list should succeed");
  assert.ok(listData.data.length >= 50, "Database should contain at least 50 transactions");
  console.log(`✓ TEST 2 PASSED: Database holds ${listData.data.length} transactions.\n`);

  // 3. Verify dashboard metrics update
  console.log("TEST 3: Verify dashboard metrics update...");
  const summaryRes = await fetch(`${BASE_URL}/api/analytics/summary`);
  assert.equal(summaryRes.status, 200, "Analytics summary status should be 200");
  const summary = await summaryRes.json();
  assert.equal(summary.success, true);
  assert.ok(summary.data.total_income > 0, "Total income should be positive");
  assert.ok(summary.data.total_expenses > 0, "Total expenses should be positive");
  assert.ok(summary.data.income_variability, "Income variability must be calculated");
  assert.ok(typeof summary.data.income_variability.cv === "number", "CV must be a number");
  assert.ok(["Low", "Medium", "High"].includes(summary.data.income_variability.variability_level), "Variability class must be Low/Med/High");
  assert.ok(summary.data.suggested_buffer.buffer_amount > 0, "Buffer must be > 0");
  assert.equal(summary.data.suggested_buffer.disclaimer, "Prototype estimate, not professional financial advice.");
  console.log(`✓ TEST 3 PASSED: Dashboard metrics loaded successfully (Income: ₹${summary.data.total_income}, CV: ${summary.data.income_variability.cv.toFixed(2)}, Class: ${summary.data.income_variability.variability_level}).\n`);

  // 4. Verify transaction history displays imported transactions
  console.log("TEST 4: Verify transaction history displays imported transactions with filtering...");
  const filteredRes = await fetch(`${BASE_URL}/api/transactions?source=open_banking`);
  assert.equal(filteredRes.status, 200);
  const filtered = await filteredRes.json();
  assert.ok(filtered.data.length > 0, "Should return open_banking transactions");
  assert.equal(filtered.data[0].source, "open_banking");
  console.log(`✓ TEST 4 PASSED: Ledger returned ${filtered.data.length} open_banking transactions.\n`);

  // 5 & 6. Enter a valid AI cash transaction & Verify AI extraction (no auto-save)
  console.log("TEST 5 & 6: AI cash extraction (valid) & verify extraction does NOT auto-save...");
  const preAiListRes = await fetch(`${BASE_URL}/api/transactions`);
  const preAiCount = (await preAiListRes.json()).data.length;

  const aiRes = await fetch(`${BASE_URL}/api/ai/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Received ₹3500 cash for laptop repair today" }),
  });
  assert.equal(aiRes.status, 200, "AI extract should return 200");
  const aiData = await aiRes.json();
  assert.equal(aiData.success, true);
  const extracted = aiData.extracted || aiData.data;
  assert.equal(extracted.amount, 3500, "Amount should be extracted as 3500");
  assert.equal(extracted.type, "income", "Type should be income");
  assert.ok(extracted.transaction_date, "Transaction date should be present");
  assert.equal(extracted.missing_fields.length, 0, "No missing fields for complete prompt");

  // Verify that AI extraction endpoint did NOT save to database
  const postAiListRes = await fetch(`${BASE_URL}/api/transactions`);
  const postAiCount = (await postAiListRes.json()).data.length;
  assert.equal(postAiCount, preAiCount, "AI extraction endpoint MUST NOT auto-save to DB");
  console.log("✓ TEST 5 & 6 PASSED: Extracted { amount: 3500, type: 'income' } and confirmed zero auto-save.\n");

  // 7 & 8. Confirm and save it -> Verify appears in DB and history
  console.log("TEST 7 & 8: Confirm and save AI transaction, verify appearance in DB & history...");
  const saveRes = await fetch(`${BASE_URL}/api/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: extracted.amount,
      type: extracted.type,
      category: extracted.category || "Freelance",
      description: extracted.description,
      transaction_date: extracted.transaction_date,
      source: "ai",
      raw_text: "Received ₹3500 cash for laptop repair today",
    }),
  });
  assert.equal(saveRes.status, 201, "Should create transaction with 201 Created");
  const saved = await saveRes.json();
  assert.equal(saved.success, true);
  assert.equal(saved.data.amount, 3500);
  assert.equal(saved.data.source, "ai");
  testId = saved.data.id;
  assert.ok(testId, "Saved transaction must have an ID");

  // Verify in history
  const verifyRes = await fetch(`${BASE_URL}/api/transactions?source=ai`);
  const verifyData = await verifyRes.json();
  const found = verifyData.data.find((t) => t.id === testId);
  assert.ok(found, "Saved AI cash transaction must appear in history filter");
  console.log(`✓ TEST 7 & 8 PASSED: Successfully saved confirmed AI transaction with ID: ${testId}.\n`);

  // 9. Test missing amount (MUST NOT invent financial info)
  console.log("TEST 9: Missing amount test (AI must NOT invent amount)...");
  const missingAmountRes = await fetch(`${BASE_URL}/api/ai/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Got paid cash for plumbing work today" }),
  });
  const missingAmountData = await missingAmountRes.json();
  const missingAmountExtracted = missingAmountData.extracted || missingAmountData.data;
  assert.equal(missingAmountExtracted.amount, null, "Amount must be null when unspecified");
  assert.ok(missingAmountExtracted.missing_fields.includes("amount"), "missing_fields must contain 'amount'");
  console.log("✓ TEST 9 PASSED: Missing amount correctly returned null and flagged in missing_fields.\n");

  // 10. Test missing date
  console.log("TEST 10: Missing date test (AI must NOT invent date)...");
  const missingDateRes = await fetch(`${BASE_URL}/api/ai/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Spent ₹250 cash on petrol" }),
  });
  const missingDateData = await missingDateRes.json();
  const missingDateExtracted = missingDateData.extracted || missingDateData.data;
  assert.equal(missingDateExtracted.amount, 250);
  assert.equal(missingDateExtracted.transaction_date, null, "Date must be null when unspecified");
  assert.ok(missingDateExtracted.missing_fields.includes("transaction_date"), "missing_fields must contain 'transaction_date'");
  console.log("✓ TEST 10 PASSED: Missing date correctly returned null and flagged in missing_fields.\n");

  // 11. Test transaction update (PUT /api/transactions/:id)
  console.log(`TEST 11: Updating transaction ${testId}...`);
  const updateRes = await fetch(`${BASE_URL}/api/transactions/${testId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: 4000,
      description: "Updated: Received ₹4000 cash for laptop and monitor repair",
    }),
  });
  assert.equal(updateRes.status, 200, "Update status should be 200");
  const updateData = await updateRes.json();
  assert.equal(updateData.success, true);
  assert.equal(updateData.data.amount, 4000);
  assert.equal(updateData.data.description, "Updated: Received ₹4000 cash for laptop and monitor repair");
  console.log(`✓ TEST 11 PASSED: Transaction amount updated to ₹4000.\n`);

  // 12. Test transaction deletion (DELETE /api/transactions/:id)
  console.log(`TEST 12: Deleting transaction ${testId}...`);
  const deleteRes = await fetch(`${BASE_URL}/api/transactions/${testId}`, {
    method: "DELETE",
  });
  assert.equal(deleteRes.status, 200, "Delete status should be 200");
  const deleteData = await deleteRes.json();
  assert.equal(deleteData.success, true);

  // Verify it's gone
  const checkDeleted = await fetch(`${BASE_URL}/api/transactions/${testId}`);
  assert.equal(checkDeleted.status, 404, "Deleted transaction should return 404");
  console.log(`✓ TEST 12 PASSED: Transaction ${testId} deleted and confirmed 404.\n`);

  // 13. Test empty database / dashboard state
  console.log("TEST 13: Empty analytics calculation validation (mean = 0, cv = 0 safe handling)...");
  // We can test analytics calculation logic directly with an empty array
  const { computeAnalyticsSummary, computeIncomeTrend, computeExpenseCategories } = await import("../src/lib/analytics.ts");
  const emptySummary = computeAnalyticsSummary([]);
  assert.equal(emptySummary.total_income, 0);
  assert.equal(emptySummary.total_expenses, 0);
  assert.equal(emptySummary.net_balance, 0);
  assert.equal(emptySummary.income_variability.mean_weekly_income, 0);
  assert.equal(emptySummary.income_variability.cv, 0);
  assert.equal(emptySummary.income_variability.variability_level, "Low");
  assert.equal(emptySummary.suggested_buffer.buffer_amount, 0);
  const emptyTrend = computeIncomeTrend([]);
  assert.deepEqual(emptyTrend, []);
  const emptyExp = computeExpenseCategories([]);
  assert.deepEqual(emptyExp, []);
  console.log("✓ TEST 13 PASSED: Empty state safely yields zeroed metrics without crashing or NaN.\n");

  // 14. Test API error handling
  console.log("TEST 14: API error handling (400 validation, 404 not found)...");
  // Invalid amount <= 0
  const badPostRes = await fetch(`${BASE_URL}/api/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: -50, type: "income", category: "Other", description: "Invalid", transaction_date: "2026-03-01", source: "ai" }),
  });
  assert.equal(badPostRes.status, 400, "Invalid negative amount should return 400");
  const badPostData = await badPostRes.json();
  assert.equal(badPostData.success, false);

  // Missing non-existent transaction
  const notFoundRes = await fetch(`${BASE_URL}/api/transactions/non-existent-uuid-99999`);
  assert.equal(notFoundRes.status, 404, "Non-existent transaction must return 404");

  // Invalid import account
  const badImportRes = await fetch(`${BASE_URL}/api/financial-data/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account_id: "" }),
  });
  assert.equal(badImportRes.status, 400, "Empty account_id should return 400");
  console.log("✓ TEST 14 PASSED: Verified 400 Bad Request and 404 Not Found handling across endpoints.\n");

  console.log("=================================================");
  console.log("ALL API & FLOW TESTS (ITEMS 1-14) PASSED!");
  console.log("=================================================");
}

runReview().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
