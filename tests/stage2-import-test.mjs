// Stage 2: Financial Data Import Automated Verification Test
import assert from "assert";

const BASE_URL = "http://localhost:3000";

async function verifyStage2() {
  console.log("==================================================");
  console.log("RUNNING STAGE 2: FINANCIAL DATA IMPORT VERIFICATION");
  console.log("==================================================");

  // 1. Test GET /api/financial-data/accounts
  console.log("\n1. Testing GET /api/financial-data/accounts...");
  const accRes = await fetch(`${BASE_URL}/api/financial-data/accounts`);
  assert.strictEqual(accRes.status, 200, "Accounts endpoint must return 200");
  const accJson = await accRes.json();
  assert.strictEqual(accJson.success, true);
  assert(accJson.data.length >= 2, "Must return multiple bank accounts");
  console.log(`✓ Accounts returned: ${accJson.data.length} accounts from ${accJson.provider}`);

  const targetAccount = accJson.data[0];
  console.log(`  Selected Account: ${targetAccount.account_name} (${targetAccount.masked_account_number})`);

  // 2. Test GET /api/financial-data/transactions (Raw transactions inspection)
  console.log("\n2. Testing GET /api/financial-data/transactions...");
  const rawRes = await fetch(`${BASE_URL}/api/financial-data/transactions?accountId=${targetAccount.account_id}`);
  assert.strictEqual(rawRes.status, 200);
  const rawJson = await rawRes.json();
  assert.strictEqual(rawJson.success, true);
  const rawCount = rawJson.count;
  assert(rawCount >= 50 && rawCount <= 100, `Expected 50-100 synthetic transactions, got ${rawCount}`);
  console.log(`✓ Synthetic Provider returned ${rawCount} raw transactions`);

  // Verify diversity of transactions (Salary, Freelance, UPI, NEFT, IMPS, ATM, Rent, etc.)
  const rawNarratives = rawJson.data.map((t) => t.narrative.toLowerCase()).join(" ");
  const rawModes = rawJson.data.map((t) => t.mode);

  assert(rawNarratives.includes("salary"), "Must contain salary");
  assert(rawNarratives.includes("client"), "Must contain client payments");
  assert(rawNarratives.includes("freelance"), "Must contain freelance income");
  assert(rawNarratives.includes("rent"), "Must contain rent");
  assert(rawNarratives.includes("atm"), "Must contain ATM cash withdrawals");
  assert(rawNarratives.includes("swiggy") || rawNarratives.includes("food"), "Must contain food");
  assert(rawNarratives.includes("petrol") || rawNarratives.includes("uber"), "Must contain transport");
  assert(rawNarratives.includes("bill") || rawNarratives.includes("broadband"), "Must contain bills");
  assert(rawNarratives.includes("hardware") || rawNarratives.includes("amazon"), "Must contain shopping");
  assert(rawNarratives.includes("course") || rawNarratives.includes("exam"), "Must contain education");
  assert(rawNarratives.includes("pharmacy") || rawNarratives.includes("clinic"), "Must contain healthcare");
  assert(rawNarratives.includes("unknown") || rawNarratives.includes("merchant_"), "Must contain unknown merchants");
  assert(rawModes.includes("UPI"), "Must include UPI");
  assert(rawModes.includes("NEFT"), "Must include NEFT");
  assert(rawModes.includes("IMPS"), "Must include IMPS");
  assert(rawModes.includes("ATM"), "Must include ATM");

  console.log("✓ Verified realistic coverage: salary, freelance, client payments, UPI, NEFT, IMPS, food, transport, shopping, bills, rent, education, healthcare, ATM, unknown merchants");

  // 3. Test POST /api/financial-data/import
  console.log("\n3. Testing POST /api/financial-data/import...");
  const importRes = await fetch(`${BASE_URL}/api/financial-data/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId: targetAccount.account_id }),
  });

  assert.strictEqual(importRes.status, 201, "Import endpoint should return 201 Created");
  const importJson = await importRes.json();
  assert.strictEqual(importJson.success, true);
  assert(importJson.imported_count >= 50, `Expected at least 50 imported transactions, got ${importJson.imported_count}`);
  console.log(`✓ Import executed: ${importJson.imported_count} transactions imported from provider`);

  // 4. Verify that imported transactions appear in Supabase/Database via GET /api/transactions
  console.log("\n4. Verifying imported transactions in GET /api/transactions...");
  const getRes = await fetch(`${BASE_URL}/api/transactions`);
  assert.strictEqual(getRes.status, 200);
  const getJson = await getRes.json();
  assert.strictEqual(getJson.success, true);
  assert(getJson.count >= importJson.imported_count, `Database count (${getJson.count}) must contain imported count (${importJson.imported_count})`);

  // Verify sample imported transaction structure
  const sampleImported = getJson.data.find((t) => t.source === "open_banking");
  assert(sampleImported, "Must find transaction with source='open_banking'");
  assert(sampleImported.id, "Imported transaction must have ID");
  assert(sampleImported.amount > 0, "Imported transaction must have positive amount");
  assert(["income", "expense"].includes(sampleImported.type), "Imported transaction must have valid type");
  assert(sampleImported.category, "Imported transaction must have category");
  assert(sampleImported.transaction_date, "Imported transaction must have transaction_date");
  assert.strictEqual(sampleImported.source, "open_banking");

  console.log("✓ Sample imported transaction structure confirmed:", {
    id: sampleImported.id,
    date: sampleImported.transaction_date,
    category: sampleImported.category,
    type: sampleImported.type,
    amount: sampleImported.amount,
    source: sampleImported.source,
  });

  // 5. Verify /import page loads with HTTP 200
  console.log("\n5. Verifying /import UI page renders...");
  const pageRes = await fetch(`${BASE_URL}/import`);
  assert.strictEqual(pageRes.status, 200);
  console.log("✓ /import page loads with HTTP 200 OK");

  console.log("\n==================================================");
  console.log("STAGE 2 FINANCIAL DATA IMPORT FULLY VERIFIED (100%)");
  console.log("==================================================");
}

verifyStage2().catch((err) => {
  console.error("Stage 2 verification failed:", err);
  process.exit(1);
});
