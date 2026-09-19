// Test the exact diagram from the user's screenshot:
// POST -> transaction -> Supabase/DB -> GET -> transaction returned

const BASE_URL = "http://localhost:3000";

async function verifyPostToGetFlow() {
  console.log("=================================================");
  console.log("CHECKING: POST -> Transaction -> DB -> GET -> Returned");
  console.log("=================================================\n");

  // Step 1: POST a transaction
  console.log("STEP 1: Executing POST /api/transactions...");
  const payload = {
    amount: 3200,
    type: "income",
    category: "Freelance",
    description: "Camera & Lens Equipment Rental Payout",
    transaction_date: "2026-09-19",
    source: "open_banking",
    merchant: "Media Studio 9",
  };

  const postResponse = await fetch(`${BASE_URL}/api/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const postResult = await postResponse.json();
  console.log("HTTP Status:", postResponse.status, "(Created)");
  console.log("Created Record ID:", postResult.data?.id);
  console.log("Saved Amount:", postResult.data?.amount);
  console.log("Saved Category:", postResult.data?.category);
  console.log("Saved Source:", postResult.data?.source);

  if (!postResult.success || !postResult.data?.id) {
    throw new Error("POST failed to create transaction!");
  }

  const createdId = postResult.data.id;

  // Step 2: GET transactions and verify the record is returned from DB
  console.log("\nSTEP 2: Executing GET /api/transactions from Database...");
  const getResponse = await fetch(`${BASE_URL}/api/transactions`);
  const getResult = await getResponse.json();

  console.log("HTTP Status:", getResponse.status, "(OK)");
  console.log("Total Records in DB:", getResult.count);

  const matchedTransaction = getResult.data?.find((t) => t.id === createdId);

  if (!matchedTransaction) {
    throw new Error(`Transaction with ID ${createdId} was not found in GET response!`);
  }

  console.log("\n=================================================");
  console.log("MATCH CONFIRMED: TRANSACTION PERSISTED AND RETRIEVED!");
  console.log("=================================================");
  console.log("ID:", matchedTransaction.id);
  console.log("Amount: ₹" + matchedTransaction.amount);
  console.log("Type:", matchedTransaction.type);
  console.log("Category:", matchedTransaction.category);
  console.log("Description:", matchedTransaction.description);
  console.log("Date:", matchedTransaction.transaction_date);
  console.log("Source:", matchedTransaction.source);
  console.log("Created At:", matchedTransaction.created_at);
}

verifyPostToGetFlow().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
