import { AIExtractionResult, ALLOWED_CATEGORIES, AllowedCategory } from "../../types";

interface ExtractOptions {
  referenceDate?: string; // ISO format: YYYY-MM-DD (defaults to current date)
}

export async function extractCashTransaction(
  input: string,
  options?: ExtractOptions
): Promise<AIExtractionResult> {
  const referenceDate =
    options?.referenceDate || new Date().toISOString().split("T")[0];

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && !apiKey.includes("your-gemini")) {
    try {
      return await extractWithGemini(input, referenceDate, apiKey);
    } catch (err) {
      console.warn("Gemini API extraction failed, using heuristic parser fallback:", err);
      return extractWithHeuristics(input, referenceDate);
    }
  }

  // Fallback heuristic parser when GEMINI_API_KEY is not configured
  return extractWithHeuristics(input, referenceDate);
}

async function extractWithGemini(
  input: string,
  referenceDate: string,
  apiKey: string
): Promise<AIExtractionResult> {
  // Dynamically import @google/genai or call the REST API
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `You are a strict financial transaction extractor for cash transactions of irregular-earning workers.
Extract the transaction details from user's natural language input into JSON.

RULES:
1. NEVER invent missing financial data.
2. If amount is missing or not stated, set amount to null, and include "amount" in "missing_fields".
3. If date cannot be reliably determined, set transaction_date to null, and include "transaction_date" in "missing_fields".
4. Reference Date: Today is ${referenceDate}.
   Resolve explicit relative dates like "today" (${referenceDate}), "yesterday", "last Friday", "2 days ago", etc. into YYYY-MM-DD format.
5. Determine type: "income" (e.g. earned, received, collected, got, tip) or "expense" (e.g. spent, paid, bought, purchased, gave).
6. Category MUST strictly be one of:
   [Salary, Freelance, Business, Food, Transport, Rent, Bills, Shopping, Education, Healthcare, Cash Withdrawal, Other]
7. Extract a clear, concise "description" summarizing the event.
8. If a merchant or client name is mentioned, extract it into "merchant".

Return JSON in this EXACT schema:
{
  "amount": number | null,
  "type": "income" | "expense",
  "category": string,
  "description": string,
  "transaction_date": string | null,
  "merchant": string | null,
  "missing_fields": string[],
  "notes": string | null
}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [{ text: `Input: "${input}"` }],
      },
    ],
    config: {
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const responseText = response.text || "";
  const parsed = JSON.parse(responseText);

  const missingFields: ("amount" | "transaction_date")[] = [];
  if (parsed.amount === null || parsed.amount === undefined || isNaN(Number(parsed.amount))) {
    missingFields.push("amount");
  }
  if (!parsed.transaction_date) {
    missingFields.push("transaction_date");
  }

  // Validate category against allowed list
  let category: string = parsed.category || "Other";
  if (!ALLOWED_CATEGORIES.includes(category as AllowedCategory)) {
    category = "Other";
  }

  return {
    amount: missingFields.includes("amount") ? null : Math.abs(Number(parsed.amount)),
    type: parsed.type === "income" ? "income" : "expense",
    category,
    description: parsed.description || input.trim(),
    transaction_date: missingFields.includes("transaction_date") ? null : parsed.transaction_date,
    merchant: parsed.merchant || undefined,
    missing_fields: missingFields,
    notes: parsed.notes || undefined,
  };
}

/**
 * Robust heuristic parser that strictly adheres to the prompt requirements
 * when GEMINI_API_KEY is not provided or offline.
 */
export function extractWithHeuristics(
  input: string,
  referenceDate: string
): AIExtractionResult {
  const text = input.trim();
  const lower = text.toLowerCase();
  const missingFields: ("amount" | "transaction_date")[] = [];

  // 1. Amount Extraction (₹, Rs, INR, or standalone digits with cash/earned/spent/paid)
  let amount: number | null = null;
  const currencyMatch = text.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (currencyMatch) {
    amount = parseFloat(currencyMatch[1].replace(/,/g, ""));
  } else {
    // Look for numbers preceding or following keywords
    const numberMatch = text.match(/\b(\d+(?:\.\d{1,2})?)\b/);
    if (numberMatch) {
      amount = parseFloat(numberMatch[1]);
    }
  }

  if (amount === null || isNaN(amount) || amount <= 0) {
    amount = null;
    missingFields.push("amount");
  }

  // 2. Type Extraction
  const incomeKeywords = [
    "earned",
    "received",
    "got",
    "collected",
    "income",
    "profit",
    "tip",
    "salary",
    "wage",
    "payout",
    "fee",
  ];
  const expenseKeywords = [
    "spent",
    "paid",
    "bought",
    "purchased",
    "cost",
    "gave",
    "bill",
    "recharge",
    "fare",
  ];

  let isIncome = false;
  let isExpense = false;

  for (const kw of incomeKeywords) {
    if (lower.includes(kw)) {
      isIncome = true;
      break;
    }
  }
  for (const kw of expenseKeywords) {
    if (lower.includes(kw)) {
      isExpense = true;
      break;
    }
  }

  const type = isIncome && !isExpense ? "income" : "expense";

  // 3. Date Extraction & Relative Resolution
  let transactionDate: string | null = null;
  const ref = new Date(referenceDate);

  if (lower.includes("today")) {
    transactionDate = ref.toISOString().split("T")[0];
  } else if (lower.includes("yesterday")) {
    const yesterday = new Date(ref);
    yesterday.setDate(yesterday.getDate() - 1);
    transactionDate = yesterday.toISOString().split("T")[0];
  } else if (lower.includes("day before yesterday")) {
    const dby = new Date(ref);
    dby.setDate(dby.getDate() - 2);
    transactionDate = dby.toISOString().split("T")[0];
  } else {
    // Check for relative day of week (e.g. "last friday", "last monday")
    const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const lastDayMatch = lower.match(/last\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i);
    if (lastDayMatch) {
      const targetDay = daysOfWeek.indexOf(lastDayMatch[1].toLowerCase());
      const currentDay = ref.getDay();
      let diff = (currentDay - targetDay + 7) % 7;
      if (diff === 0) diff = 7;
      const targetDate = new Date(ref);
      targetDate.setDate(targetDate.getDate() - diff);
      transactionDate = targetDate.toISOString().split("T")[0];
    } else {
      // Check for explicit YYYY-MM-DD or DD/MM/YYYY
      const explicitIso = text.match(/\b(202\d-\d{2}-\d{2})\b/);
      if (explicitIso) {
        transactionDate = explicitIso[1];
      } else {
        // If date is completely missing or unavailable and cannot be reliably resolved
        transactionDate = null;
        missingFields.push("transaction_date");
      }
    }
  }

  // 4. Category Classification
  let category: AllowedCategory = "Other";
  if (type === "income") {
    if (lower.includes("salary") || lower.includes("payroll")) {
      category = "Salary";
    } else if (
      lower.includes("repair") ||
      lower.includes("freelance") ||
      lower.includes("gig") ||
      lower.includes("client") ||
      lower.includes("project") ||
      lower.includes("dev") ||
      lower.includes("design") ||
      lower.includes("consulting") ||
      lower.includes("photography") ||
      lower.includes("tutor")
    ) {
      category = "Freelance";
    } else if (lower.includes("shop") || lower.includes("business") || lower.includes("store") || lower.includes("sales")) {
      category = "Business";
    } else {
      category = "Freelance";
    }
  } else {
    if (lower.includes("food") || lower.includes("lunch") || lower.includes("dinner") || lower.includes("breakfast") || lower.includes("tea") || lower.includes("chai") || lower.includes("snack") || lower.includes("swiggy") || lower.includes("zomato")) {
      category = "Food";
    } else if (lower.includes("auto") || lower.includes("rickshaw") || lower.includes("cab") || lower.includes("uber") || lower.includes("ola") || lower.includes("petrol") || lower.includes("fuel") || lower.includes("diesel") || lower.includes("bus") || lower.includes("metro")) {
      category = "Transport";
    } else if (lower.includes("rent") || lower.includes("pg") || lower.includes("room")) {
      category = "Rent";
    } else if (lower.includes("bill") || lower.includes("electricity") || lower.includes("water") || lower.includes("recharge") || lower.includes("wifi")) {
      category = "Bills";
    } else if (lower.includes("medicine") || lower.includes("doctor") || lower.includes("clinic") || lower.includes("pharmacy") || lower.includes("hospital")) {
      category = "Healthcare";
    } else if (lower.includes("course") || lower.includes("book") || lower.includes("exam") || lower.includes("fee") || lower.includes("class")) {
      category = "Education";
    } else if (lower.includes("atm") || lower.includes("withdrawal")) {
      category = "Cash Withdrawal";
    } else if (lower.includes("bought") || lower.includes("purchase") || lower.includes("shopping") || lower.includes("clothes") || lower.includes("tools") || lower.includes("hardware")) {
      category = "Shopping";
    } else {
      category = "Other";
    }
  }

  // 5. Description Cleaning
  let description = text;
  // Clean off "I earned", "I spent", "today", "yesterday"
  description = description.replace(/^(i\s+(?:have\s+)?(?:earned|spent|paid|received|got)\s+)/i, "");

  return {
    amount,
    type,
    category,
    description: text,
    transaction_date: transactionDate,
    missing_fields: missingFields,
    notes: missingFields.length > 0 ? `Missing required fields: ${missingFields.join(", ")}` : undefined,
  };
}
