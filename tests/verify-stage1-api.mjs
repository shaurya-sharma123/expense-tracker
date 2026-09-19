// Stage 1 API Verification Script
import assert from "assert";

const BASE_URL = "http://localhost:3000";

async function verifyStage1() {
  console.log("==================================================");
  console.log("RUNNING STAGE 1 API VERIFICATION");
  console.log("==================================================");

  // 1. Initial GET /api/transactions
  console.log("\n1. Testing GET /api/transactions...");
  const initialRes = await fetch(`${BASE_URL}/api/transactions`);
  assert.strictEqual(initialRes.status, 200, "GET /api/transactions should return 200");
  const initialData = await initialRes.json();
  assert.strictEqual(initialData.success, true);
  console.log(`✓ GET /api/transactions returned 200 OK (count: ${initialData.count})`);

  // 2. Test Invalid POST /api/transactions (Validation check)
  console.log("\n2. Testing POST /api/transactions validation failure...");
  const invalidRes = await fetch(`${BASE_URL}/api/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: -100, // invalid
      type: "invalid_type",
      category: "NotAnAllowedCategory",
      description: "",
      transaction_date: "bad-date",
      source: "unknown",
    }),
  });
  assert.strictEqual(invalidRes.status, 400, "Invalid payload must return 400");
  const invalidJson = await invalidRes.json();
  assert.strictEqual(invalidJson.success, false);
  assert(invalidJson.details.length >= 4, "Should return multiple validation error details");
  console.log("✓ Invalid POST rejected with 400 and validation errors:", invalidJson.details);

  // 3. Test Valid POST /api/transactions
  console.log("\n3. Testing POST /api/transactions success...");
  const newTxPayload = {
    amount: 3500.5,
    type: "income",
    category: "Freelance",
    description: "Stage 1 Test Phone Repair Service",
    transaction_date: "2026-09-19",
    source: "open_banking",
    merchant: "Customer Apex",
  };

  const createRes = await fetch(`${BASE_URL}/api/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newTxPayload),
  });
  assert.strictEqual(createRes.status, 201, "Valid POST should return 201 Created");
  const createJson = await createRes.json();
  assert.strictEqual(createJson.success, true);
  assert(createJson.data.id, "Transaction should have a generated ID");
  assert.strictEqual(createJson.data.amount, 3500.5);
  assert.strictEqual(createJson.data.category, "Freelance");
  assert.strictEqual(createJson.data.type, "income");
  assert.strictEqual(createJson.data.source, "open_banking");
  const createdId = createJson.data.id;
  console.log(`✓ POST /api/transactions succeeded: Created ID ${createdId}`);

  // 4. Verify GET /api/transactions returns the created transaction
  console.log("\n4. Verifying GET /api/transactions lists new transaction...");
  const listRes = await fetch(`${BASE_URL}/api/transactions`);
  const listJson = await listRes.json();
  assert.strictEqual(listJson.success, true);
  const found = listJson.data.find((t) => t.id === createdId);
  assert(found, "Newly created transaction must be present in GET list");
  console.log("✓ Newly created transaction verified in GET /api/transactions");

  // 5. Test GET /api/transactions/:id
  console.log("\n5. Testing GET /api/transactions/:id...");
  const getSingleRes = await fetch(`${BASE_URL}/api/transactions/${createdId}`);
  assert.strictEqual(getSingleRes.status, 200);
  const getSingleJson = await getSingleRes.json();
  assert.strictEqual(getSingleJson.data.id, createdId);
  assert.strictEqual(getSingleJson.data.description, "Stage 1 Test Phone Repair Service");
  console.log("✓ GET /api/transactions/:id returned 200 with correct transaction");

  // 6. Test PUT /api/transactions/:id
  console.log("\n6. Testing PUT /api/transactions/:id...");
  const updateRes = await fetch(`${BASE_URL}/api/transactions/${createdId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: 4000,
      description: "Updated Stage 1 Repair Service",
    }),
  });
  assert.strictEqual(updateRes.status, 200);
  const updateJson = await updateRes.json();
  assert.strictEqual(updateJson.data.amount, 4000);
  assert.strictEqual(updateJson.data.description, "Updated Stage 1 Repair Service");
  console.log("✓ PUT /api/transactions/:id successfully updated transaction fields");

  // 7. Test DELETE /api/transactions/:id
  console.log("\n7. Testing DELETE /api/transactions/:id...");
  const deleteRes = await fetch(`${BASE_URL}/api/transactions/${createdId}`, {
    method: "DELETE",
  });
  assert.strictEqual(deleteRes.status, 200);
  console.log("✓ DELETE /api/transactions/:id returned 200 OK");

  // 8. Confirm 404 after deletion
  const getDeletedRes = await fetch(`${BASE_URL}/api/transactions/${createdId}`);
  assert.strictEqual(getDeletedRes.status, 404);
  console.log("✓ GET on deleted transaction returned 404 Not Found");

  // 9. Verify 4 Pages load with HTTP 200
  console.log("\n8. Verifying 4 Application Pages load...");
  const pages = ["/dashboard", "/import", "/ai-entry", "/transactions"];
  for (const page of pages) {
    const pageRes = await fetch(`${BASE_URL}${page}`);
    assert.strictEqual(pageRes.status, 200, `Page ${page} should return HTTP 200`);
    console.log(`✓ Page ${page} loaded with HTTP 200 OK`);
  }

  console.log("\n==================================================");
  console.log("STAGE 1 FOUNDATION FULLY VERIFIED (100% PASS)");
  console.log("==================================================");
}

verifyStage1().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
