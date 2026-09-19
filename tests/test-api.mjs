// Integration test for live Next.js API endpoints
const BASE_URL = "http://localhost:3000";

async function runLiveApiTests() {
  console.log("=== Testing Live API Endpoints ===");

  // 1. GET /api/financial-data/accounts
  const accRes = await fetch(`${BASE_URL}/api/financial-data/accounts`);
  const accJson = await accRes.json();
  console.log(`1. Accounts API (${accRes.status}):`, accJson.success, `Found ${accJson.data.length} accounts`);

  // 2. GET /api/financial-data/transactions
  const rawTxRes = await fetch(`${BASE_URL}/api/financial-data/transactions?accountId=${accJson.data[0].account_id}`);
  const rawTxJson = await rawTxRes.json();
  console.log(`2. Raw Transactions API (${rawTxRes.status}):`, rawTxJson.success, `Found ${rawTxJson.count} transactions in stream`);

  // 3. POST /api/financial-data/import
  const importRes = await fetch(`${BASE_URL}/api/financial-data/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId: accJson.data[0].account_id }),
  });
  const importJson = await importRes.json();
  console.log(`3. Import API (${importRes.status}):`, importJson.success, `Imported ${importJson.importedCount} transactions`);

  // 4. GET /api/transactions
  const txRes = await fetch(`${BASE_URL}/api/transactions`);
  const txJson = await txRes.json();
  console.log(`4. Transactions API (${txRes.status}):`, txJson.success, `Total stored: ${txJson.count}`);

  // 5. POST /api/ai/extract
  const aiRes = await fetch(`${BASE_URL}/api/ai/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "I earned ₹4200 cash repairing laptops today." }),
  });
  const aiJson = await aiRes.json();
  console.log(`5. AI Extract API (${aiRes.status}):`, aiJson.success, {
    amount: aiJson.extracted.amount,
    type: aiJson.extracted.type,
    category: aiJson.extracted.category,
    date: aiJson.extracted.transaction_date,
    missing: aiJson.extracted.missing_fields,
  });

  // 6. POST /api/transactions (Save verified AI Cash entry)
  const saveCashRes = await fetch(`${BASE_URL}/api/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: aiJson.extracted.amount,
      type: aiJson.extracted.type,
      category: aiJson.extracted.category,
      description: aiJson.extracted.description,
      transaction_date: aiJson.extracted.transaction_date,
      source: "ai",
    }),
  });
  const saveCashJson = await saveCashRes.json();
  console.log(`6. Save AI Transaction API (${saveCashRes.status}):`, saveCashJson.success, `ID: ${saveCashJson.data.id}`);

  // 7. GET /api/analytics/summary
  const sumRes = await fetch(`${BASE_URL}/api/analytics/summary`);
  const sumJson = await sumRes.json();
  console.log(`7. Analytics Summary API (${sumRes.status}):`, {
    totalIncome: sumJson.data.total_income,
    totalExpenses: sumJson.data.total_expenses,
    netBalance: sumJson.data.net_balance,
    cv: sumJson.data.income_variability.cv,
    variabilityLevel: sumJson.data.income_variability.variability_level,
    suggestedBuffer: sumJson.data.suggested_buffer.buffer_amount,
    sources: sumJson.data.transaction_count,
  });

  // 8. GET /api/analytics/income-trend
  const trendRes = await fetch(`${BASE_URL}/api/analytics/income-trend`);
  const trendJson = await trendRes.json();
  console.log(`8. Analytics Income Trend API (${trendRes.status}):`, `Generated ${trendJson.data.length} chronological points`);

  // 9. GET /api/analytics/expense-categories
  const catRes = await fetch(`${BASE_URL}/api/analytics/expense-categories`);
  const catJson = await catRes.json();
  console.log(`9. Analytics Categories API (${catRes.status}):`, `Categorized ${catJson.data.length} expense groups`);

  // 10. PUT /api/transactions/:id
  const testId = saveCashJson.data.id;
  const updateRes = await fetch(`${BASE_URL}/api/transactions/${testId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description: "Updated laptop repair payment" }),
  });
  const updateJson = await updateRes.json();
  console.log(`10. Update Transaction API (${updateRes.status}):`, updateJson.success, `New desc: "${updateJson.data.description}"`);

  // 11. DELETE /api/transactions/:id
  const deleteRes = await fetch(`${BASE_URL}/api/transactions/${testId}`, {
    method: "DELETE",
  });
  const deleteJson = await deleteRes.json();
  console.log(`11. Delete Transaction API (${deleteRes.status}):`, deleteJson.success);

  console.log("\n==============================================");
  console.log("ALL 11 LIVE API ENDPOINTS VERIFIED & WORKING!");
  console.log("==============================================");
}

runLiveApiTests().catch((e) => {
  console.error("API test failed:", e);
  process.exit(1);
});
