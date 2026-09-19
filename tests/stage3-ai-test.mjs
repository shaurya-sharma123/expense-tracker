// Stage 3: AI Natural-Language Cash Entry Automated Verification Test
import assert from "assert";

const BASE_URL = "http://localhost:3000";

async function verifyStage3() {
  console.log("==================================================");
  console.log("RUNNING STAGE 3: AI CASH ENTRY VERIFICATION");
  console.log("==================================================");

  // Check initial transaction count to verify AI endpoint does NOT save anything
  const preCheckRes = await fetch(`${BASE_URL}/api/transactions`);
  const preCheckJson = await preCheckRes.json();
  const initialCount = preCheckJson.count;
  console.log(`Initial DB transactions count: ${initialCount}`);

  // Test Case A: "I earned ₹3000 cash repairing phones today."
  console.log("\n[Test Case A] 'I earned ₹3000 cash repairing phones today.'");
  const resA = await fetch(`${BASE_URL}/api/ai/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "I earned ₹3000 cash repairing phones today.",
    }),
  });

  assert.strictEqual(resA.status, 200);
  const jsonA = await resA.json();
  assert.strictEqual(jsonA.success, true);
  const extA = jsonA.extracted;

  console.log("Extracted Case A:", extA);
  assert.strictEqual(extA.amount, 3000, "Case A amount must be 3000");
  assert.strictEqual(extA.type, "income", "Case A type must be income");
  assert.strictEqual(extA.category, "Freelance", "Case A category must be Freelance");
  assert.strictEqual(extA.transaction_date, new Date().toISOString().split("T")[0], "Case A today date must resolve to current YYYY-MM-DD");
  assert.strictEqual(extA.missing_fields.length, 0, "Case A should have no missing fields");
  console.log("✓ Case A passed: correctly extracted amount=3000, type='income', category='Freelance', resolved 'today'");

  // Test Case B: "I spent ₹250 cash on lunch yesterday."
  console.log("\n[Test Case B] 'I spent ₹250 cash on lunch yesterday.'");
  const resB = await fetch(`${BASE_URL}/api/ai/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "I spent ₹250 cash on lunch yesterday.",
    }),
  });

  assert.strictEqual(resB.status, 200);
  const jsonB = await resB.json();
  assert.strictEqual(jsonB.success, true);
  const extB = jsonB.extracted;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const expectedYesterday = yesterday.toISOString().split("T")[0];

  console.log("Extracted Case B:", extB);
  assert.strictEqual(extB.amount, 250, "Case B amount must be 250");
  assert.strictEqual(extB.type, "expense", "Case B type must be expense");
  assert.strictEqual(extB.category, "Food", "Case B category must be Food");
  assert.strictEqual(extB.transaction_date, expectedYesterday, "Case B yesterday must resolve to yesterday's YYYY-MM-DD");
  assert.strictEqual(extB.missing_fields.length, 0, "Case B should have no missing fields");
  console.log("✓ Case B passed: correctly extracted amount=250, type='expense', category='Food', resolved 'yesterday'");

  // Test Case C: "I earned some cash repairing phones." (NON-INVENTION TEST)
  console.log("\n[Test Case C] 'I earned some cash repairing phones.'");
  const resC = await fetch(`${BASE_URL}/api/ai/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "I earned some cash repairing phones.",
    }),
  });

  assert.strictEqual(resC.status, 200);
  const jsonC = await resC.json();
  assert.strictEqual(jsonC.success, true);
  const extC = jsonC.extracted;

  console.log("Extracted Case C:", extC);
  assert.strictEqual(extC.amount, null, "CRITICAL: Case C amount MUST be null because amount was not provided!");
  assert(extC.missing_fields.includes("amount"), "CRITICAL: missing_fields MUST contain 'amount'!");
  assert.strictEqual(extC.type, "income", "Case C type must be income");
  console.log("✓ Case C passed: strictly did NOT invent missing financial information! (amount=null, missing_fields=['amount'])");

  // Verify that POST /api/ai/extract did NOT write anything to Supabase/database
  console.log("\n[Test Rule 7] Verifying AI extraction did NOT save anything to database...");
  const postCheckRes = await fetch(`${BASE_URL}/api/transactions`);
  const postCheckJson = await postCheckRes.json();
  assert.strictEqual(postCheckJson.count, initialCount, "Database count must remain unchanged after extract calls");
  console.log(`✓ Confirmed database count unchanged (${postCheckJson.count} === ${initialCount}). AI extraction does NOT save.`);

  // Test Confirmation & Save Flow: Frontend review -> POST /api/transactions
  console.log("\n[Test Confirmation Flow] User reviews, confirms, and saves Case A via POST /api/transactions...");
  const saveConfirmedRes = await fetch(`${BASE_URL}/api/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: extA.amount,
      type: extA.type,
      category: extA.category,
      description: extA.description,
      transaction_date: extA.transaction_date,
      source: "ai",
    }),
  });

  assert.strictEqual(saveConfirmedRes.status, 201, "Confirmed transaction must save with 201 Created");
  const saveConfirmedJson = await saveConfirmedRes.json();
  assert.strictEqual(saveConfirmedJson.success, true);
  assert.strictEqual(saveConfirmedJson.data.source, "ai");
  const confirmedId = saveConfirmedJson.data.id;
  console.log(`✓ Confirmed transaction saved with ID: ${confirmedId} and source='ai'`);

  // Verify new transaction is present in GET /api/transactions
  const finalCheckRes = await fetch(`${BASE_URL}/api/transactions`);
  const finalCheckJson = await finalCheckRes.json();
  assert.strictEqual(finalCheckJson.count, initialCount + 1, "Database count must have increased by exactly 1");
  const savedItem = finalCheckJson.data.find((t) => t.id === confirmedId);
  assert(savedItem, "Saved AI transaction must be retrieved in GET /api/transactions");
  assert.strictEqual(savedItem.source, "ai");
  console.log("✓ Verified AI cash transaction retrieved in GET ledger");

  // Verify /ai-entry page loads with HTTP 200
  console.log("\nVerifying /ai-entry UI page renders...");
  const pageRes = await fetch(`${BASE_URL}/ai-entry`);
  assert.strictEqual(pageRes.status, 200);
  console.log("✓ /ai-entry page loads with HTTP 200 OK");

  console.log("\n==================================================");
  console.log("STAGE 3 AI CASH ENTRY FULLY VERIFIED (100% PASS)");
  console.log("==================================================");
}

verifyStage3().catch((err) => {
  console.error("Stage 3 verification failed:", err);
  process.exit(1);
});
