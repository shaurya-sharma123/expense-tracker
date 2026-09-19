// Comprehensive Automated Test for Supabase Auth, Route Protection, and Data Isolation
// Tests:
// 1. Unauthenticated API calls return HTTP 401 Unauthorized
// 2. Protected UI routes redirect unauthenticated users to /login
// 3. Auth pages (/login and /signup) load successfully (HTTP 200)
// 4. Data isolation: User A transactions cannot be seen or modified by User B
// 5. Zero duplicate detection constraint is preserved

import assert from "assert";
import { db } from "../src/lib/db.ts";

const BASE_URL = "http://localhost:3000";

async function testUnauthenticatedEndpoints() {
  console.log("\n=======================================================");
  console.log("TEST SUITE 1: UNAUTHENTICATED API CALLS (EXPECT 401)");
  console.log("=======================================================");

  const endpoints = [
    { name: "GET /api/transactions", url: `${BASE_URL}/api/transactions`, method: "GET" },
    {
      name: "POST /api/transactions",
      url: `${BASE_URL}/api/transactions`,
      method: "POST",
      body: JSON.stringify({ amount: 500, type: "expense", category: "Food", description: "Lunch", transaction_date: "2026-09-19", source: "ai" }),
      headers: { "Content-Type": "application/json" },
    },
    { name: "GET /api/transactions/:id", url: `${BASE_URL}/api/transactions/test-id`, method: "GET" },
    {
      name: "PUT /api/transactions/:id",
      url: `${BASE_URL}/api/transactions/test-id`,
      method: "PUT",
      body: JSON.stringify({ amount: 600 }),
      headers: { "Content-Type": "application/json" },
    },
    { name: "DELETE /api/transactions/:id", url: `${BASE_URL}/api/transactions/test-id`, method: "DELETE" },
    {
      name: "POST /api/financial-data/import",
      url: `${BASE_URL}/api/financial-data/import`,
      method: "POST",
      body: JSON.stringify({ accountId: "acc_hdfc_freelance_01" }),
      headers: { "Content-Type": "application/json" },
    },
    { name: "GET /api/financial-data/accounts", url: `${BASE_URL}/api/financial-data/accounts`, method: "GET" },
    {
      name: "POST /api/ai/extract",
      url: `${BASE_URL}/api/ai/extract`,
      method: "POST",
      body: JSON.stringify({ text: "Earned 2000 cash today" }),
      headers: { "Content-Type": "application/json" },
    },
    { name: "GET /api/analytics/summary", url: `${BASE_URL}/api/analytics/summary`, method: "GET" },
    { name: "GET /api/analytics/income-trend", url: `${BASE_URL}/api/analytics/income-trend`, method: "GET" },
    { name: "GET /api/analytics/expense-categories", url: `${BASE_URL}/api/analytics/expense-categories`, method: "GET" },
  ];

  for (const ep of endpoints) {
    const res = await fetch(ep.url, {
      method: ep.method,
      headers: ep.headers,
      body: ep.body,
    });
    const json = await res.json().catch(() => ({}));
    console.log(`[PASS] ${ep.name} -> HTTP ${res.status} (Unauthorized check: ${json.error || "401 received"})`);
    assert.strictEqual(res.status, 401, `Expected ${ep.name} to return 401, got ${res.status}`);
  }
}

async function testRouteProtection() {
  console.log("\n=======================================================");
  console.log("TEST SUITE 2: ROUTE REDIRECTS FOR UNAUTHENTICATED USERS");
  console.log("=======================================================");

  const routes = ["/dashboard", "/import", "/ai-entry", "/transactions", "/"];

  for (const route of routes) {
    const res = await fetch(`${BASE_URL}${route}`, {
      redirect: "manual",
    });
    const location = res.headers.get("location");
    console.log(`[PASS] ${route} -> Status ${res.status}, Location: ${location}`);
    // Should be redirected (307, 308, or 302/303) to /login (or /dashboard which then redirects to /login)
    assert.ok(
      [302, 307, 308].includes(res.status),
      `Expected ${route} to redirect, got ${res.status}`
    );
    assert.ok(
      location.includes("/login") || location.includes("/dashboard"),
      `Expected redirect to /login, got ${location}`
    );
  }

  // Auth routes should load with 200 OK
  const loginRes = await fetch(`${BASE_URL}/login`);
  console.log(`[PASS] /login page load -> HTTP ${loginRes.status}`);
  assert.strictEqual(loginRes.status, 200);

  const signupRes = await fetch(`${BASE_URL}/signup`);
  console.log(`[PASS] /signup page load -> HTTP ${signupRes.status}`);
  assert.strictEqual(signupRes.status, 200);
}

async function testDataIsolation() {
  console.log("\n=======================================================");
  console.log("TEST SUITE 3: STRICT USER DATA ISOLATION & ZERO DUPLICATES");
  console.log("=======================================================");

  const userA = "user-uuid-aaa-111";
  const userB = "user-uuid-bbb-222";

  // Create transaction for User A
  const txA1 = await db.createTransaction({
    user_id: userA,
    amount: 12500,
    type: "income",
    category: "Freelance",
    description: "User A Mobile App Development",
    transaction_date: "2026-09-19",
    source: "ai",
  });

  // Create transaction for User B
  const txB1 = await db.createTransaction({
    user_id: userB,
    amount: 4500,
    type: "expense",
    category: "Food",
    description: "User B Grocery Purchase",
    transaction_date: "2026-09-19",
    source: "open_banking",
  });

  // Fetch all transactions for User A
  const userATxs = await db.getAllTransactions({ userId: userA });
  console.log(`User A Transaction Count: ${userATxs.length}`);
  assert.ok(userATxs.every((t) => t.user_id === userA), "All User A transactions must have user_id = userA");
  assert.ok(userATxs.some((t) => t.id === txA1.id), "User A must see their own transaction");
  assert.ok(!userATxs.some((t) => t.id === txB1.id), "User A MUST NOT see User B's transaction");
  console.log("[PASS] User A cannot see User B's transactions.");

  // Fetch all transactions for User B
  const userBTxs = await db.getAllTransactions({ userId: userB });
  console.log(`User B Transaction Count: ${userBTxs.length}`);
  assert.ok(userBTxs.every((t) => t.user_id === userB), "All User B transactions must have user_id = userB");
  assert.ok(userBTxs.some((t) => t.id === txB1.id), "User B must see their own transaction");
  assert.ok(!userBTxs.some((t) => t.id === txA1.id), "User B MUST NOT see User A's transaction");
  console.log("[PASS] User B cannot see User A's transactions.");

  // User B cannot access User A's transaction by ID
  const crossAccess = await db.getTransactionById(txA1.id, userB);
  assert.strictEqual(crossAccess, null, "User B should not be able to get User A's transaction by ID");
  console.log("[PASS] Cross-user single transaction access denied.");

  // User B cannot update User A's transaction
  const crossUpdate = await db.updateTransaction(txA1.id, { amount: 99999 }, userB);
  assert.strictEqual(crossUpdate, null, "User B should not be able to update User A's transaction");
  console.log("[PASS] Cross-user transaction update denied.");

  // User B cannot delete User A's transaction
  const crossDelete = await db.deleteTransaction(txA1.id, userB);
  assert.strictEqual(crossDelete, false, "User B should not be able to delete User A's transaction");
  console.log("[PASS] Cross-user transaction delete denied.");

  // Zero duplicate detection check: inserting exact same transaction twice must succeed
  const dup1 = await db.createTransaction({
    user_id: userA,
    amount: 100,
    type: "expense",
    category: "Transport",
    description: "Auto Rickshaw Ride",
    transaction_date: "2026-09-19",
    source: "ai",
  });
  const dup2 = await db.createTransaction({
    user_id: userA,
    amount: 100,
    type: "expense",
    category: "Transport",
    description: "Auto Rickshaw Ride",
    transaction_date: "2026-09-19",
    source: "ai",
  });
  assert.ok(dup1.id && dup2.id && dup1.id !== dup2.id, "Both duplicate transactions must be persisted with distinct IDs");
  console.log("[PASS] Zero duplicate detection rule preserved (both identical transactions successfully saved).");
}

async function runAll() {
  try {
    await testUnauthenticatedEndpoints();
    await testRouteProtection();
    await testDataIsolation();
    console.log("\n=======================================================");
    console.log("ALL TESTS PASSED SUCCESSFULLY! (100% VERIFIED)");
    console.log("=======================================================\n");
  } catch (err) {
    console.error("\nTEST FAILED:", err);
    process.exit(1);
  }
}

runAll();
