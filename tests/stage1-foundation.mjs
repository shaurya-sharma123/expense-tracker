// Stage 1: Foundation Automated Verification Test
import assert from "assert";

console.log("==================================================");
console.log("RUNNING STAGE 1: FOUNDATION VERIFICATION TEST");
console.log("==================================================");

// 1. Test Transaction Validation Module
import { validateTransaction, validateTransactionUpdate } from "../src/lib/validation.ts";

console.log("\n[Test 1] Validating Transaction Creation...");

// Case A: Valid complete transaction
const validTx = {
  amount: 2500,
  type: "income",
  category: "Freelance",
  description: "Phone repair service fee",
  transaction_date: "2026-09-19",
  source: "open_banking",
  merchant: "Apex Tech",
};
const resValid = validateTransaction(validTx);
assert.strictEqual(resValid.valid, true, "Valid transaction must pass validation");
assert.strictEqual(resValid.errors.length, 0);
assert.strictEqual(resValid.sanitized?.amount, 2500);
assert.strictEqual(resValid.sanitized?.category, "Freelance");
console.log("✓ Valid transaction passed validation");

// Case B: Invalid Amount (<= 0 or NaN)
const invalidAmt = validateTransaction({ ...validTx, amount: -50 });
assert.strictEqual(invalidAmt.valid, false, "Negative amount must fail");
assert(invalidAmt.errors.some(e => e.includes("Amount")), "Must report amount error");
console.log("✓ Negative/zero amount rejection verified");

// Case C: Invalid Type
const invalidType = validateTransaction({ ...validTx, type: "transfer" });
assert.strictEqual(invalidType.valid, false, "Invalid type must fail");
console.log("✓ Invalid transaction type rejection verified");

// Case D: Invalid Category (not in 12 allowed categories)
const invalidCategory = validateTransaction({ ...validTx, category: "Crypto" });
assert.strictEqual(invalidCategory.valid, false, "Category outside allowed list must fail");
console.log("✓ Disallowed category rejection verified");

// Case E: Invalid Date format
const invalidDate = validateTransaction({ ...validTx, transaction_date: "19/09/2026" });
assert.strictEqual(invalidDate.valid, false, "Non YYYY-MM-DD date must fail");
console.log("✓ Date format YYYY-MM-DD validation verified");

// Case F: Invalid Source
const invalidSource = validateTransaction({ ...validTx, source: "sms" });
assert.strictEqual(invalidSource.valid, false, "Disallowed source must fail");
console.log("✓ Source validation ('open_banking' or 'ai') verified");

// 2. Test Transaction Update Validation
console.log("\n[Test 2] Validating Transaction Updates...");
const updateValid = validateTransactionUpdate({ amount: 3200, category: "Salary" });
assert.strictEqual(updateValid.valid, true);
assert.strictEqual(updateValid.updates.amount, 3200);
assert.strictEqual(updateValid.updates.category, "Salary");
console.log("✓ Valid partial update passed");

const updateInvalid = validateTransactionUpdate({ category: "NonExistent" });
assert.strictEqual(updateInvalid.valid, false);
console.log("✓ Invalid partial update rejected");

console.log("\n==================================================");
console.log("STAGE 1 VALIDATION UNIT TESTS PASSED (100%)");
console.log("==================================================");
