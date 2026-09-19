"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  UserCheck,
  RefreshCw,
  Coins,
  Banknote,
} from "lucide-react";
import { AIExtractionResult, ALLOWED_CATEGORIES } from "@/types";

const TEST_CASES = [
  {
    label: "Case A: Earned cash today",
    text: "I earned ₹3000 cash repairing phones today.",
  },
  {
    label: "Case B: Spent cash yesterday",
    text: "I spent ₹250 cash on lunch yesterday.",
  },
  {
    label: "Case C: Missing amount test",
    text: "I earned some cash repairing phones.",
  },
  {
    label: "Relative weekday test",
    text: "Received 1500 cash for electrical work last Friday.",
  },
];

export default function AIEntryPage() {
  const [inputText, setInputText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<AIExtractionResult | null>(null);

  // Review & Correction Form State
  const [formValues, setFormValues] = useState<{
    amount: string;
    type: "income" | "expense";
    category: string;
    description: string;
    transaction_date: string;
    merchant: string;
  }>({
    amount: "",
    type: "income",
    category: "Other",
    description: "",
    transaction_date: "",
    merchant: "",
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [savedTxId, setSavedTxId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: Call POST /api/ai/extract
  const handleExtract = async () => {
    if (!inputText.trim()) {
      setErrorMessage("Please enter a transaction description.");
      return;
    }

    setExtracting(true);
    setErrorMessage(null);
    setSaveSuccess(false);
    setExtractedData(null);

    try {
      const todayIso = new Date().toISOString().split("T")[0];
      const res = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText.trim(),
          referenceDate: todayIso,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setErrorMessage(json.error || "Failed to extract transaction details.");
        return;
      }

      const ext: AIExtractionResult = json.extracted;
      setExtractedData(ext);

      // Pre-fill review card state with extracted or blank values
      setFormValues({
        amount: ext.amount !== null && ext.amount !== undefined ? String(ext.amount) : "",
        type: ext.type,
        category: ext.category,
        description: ext.description || inputText.trim(),
        transaction_date: ext.transaction_date || "",
        merchant: ext.merchant || "",
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Network error during AI extraction.");
    } finally {
      setExtracting(false);
    }
  };

  // Step 2: Validate and Confirm -> POST /api/transactions
  const handleConfirmAndSave = async () => {
    const parsedAmount = parseFloat(formValues.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage("Please provide a valid positive amount before confirming.");
      return;
    }

    if (!formValues.transaction_date) {
      setErrorMessage("Please specify a valid transaction date before confirming.");
      return;
    }

    if (!formValues.description.trim()) {
      setErrorMessage("Please provide a description.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmount,
          type: formValues.type,
          category: formValues.category,
          description: formValues.description.trim(),
          transaction_date: formValues.transaction_date,
          source: "ai",
          merchant: formValues.merchant.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setErrorMessage(json.error || (json.details ? json.details.join(", ") : "Failed to save transaction."));
        return;
      }

      setSaveSuccess(true);
      setSavedTxId(json.data.id);
      setExtractedData(null);
      setInputText("");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit transaction.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6 pb-12">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            AI Natural-Language Cash Entry
          </h1>
          <p className="text-sm text-slate-500">
            Stage 3: Natural-language cash parsing with mandatory review & confirm
          </p>
        </div>
      </div>

      {/* Cash-Only Notice Badge */}
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs sm:text-sm text-amber-900 flex items-start space-x-2.5">
        <Banknote className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold">Notice: </strong>
          This feature is <strong>ONLY</strong> for physical cash transactions that are not present in your imported bank or UPI statements. The AI will never invent missing fields.
        </div>
      </div>

      {/* Input Box Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <label className="block text-sm font-semibold text-slate-800">
          Describe the Cash Event in Plain English / Natural Language
        </label>
        <textarea
          rows={3}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="e.g. 'I earned ₹3000 cash repairing phones today' or 'I spent ₹250 cash on lunch yesterday'"
          className="w-full p-3.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
        />

        {/* Quick Test Chips for Verification Cases */}
        <div className="space-y-1.5 pt-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Test Cases from Specification:
          </div>
          <div className="flex flex-wrap gap-2">
            {TEST_CASES.map((tc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setInputText(tc.text)}
                className="text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 px-2.5 py-1.5 rounded-lg transition text-left border border-slate-200"
              >
                <strong className="font-semibold">{tc.label}:</strong> "{tc.text}"
              </button>
            ))}
          </div>
        </div>

        {/* Extract Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleExtract}
            disabled={extracting || !inputText.trim()}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-white transition shadow-sm ${
              extracting || !inputText.trim()
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
            }`}
          >
            {extracting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Extracting Details with AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Extract Cash Transaction</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success Notification */}
      {saveSuccess && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 space-y-2">
          <div className="flex items-center space-x-2 font-semibold text-base">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Cash Transaction Verified & Saved to Database!</span>
          </div>
          <p className="text-sm text-emerald-800">
            Transaction ID <code>{savedTxId}</code> was successfully created with source <code>"ai"</code>.
          </p>
          <div className="pt-1">
            <Link
              href="/transactions"
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 underline"
            >
              <span>Inspect Saved Transaction in Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* STEP 2: REVIEW & CONFIRMATION CARD */}
      {extractedData && (
        <div className="bg-white p-6 rounded-2xl border-2 border-indigo-600 shadow-md space-y-5">
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Extracted Preview (Review Before Saving)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                The AI does not automatically save this transaction. Review and verify the details below.
              </p>
            </div>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-full border border-indigo-200">
              User Review Required
            </span>
          </div>

          {/* Missing Fields Warning Banner */}
          {extractedData.missing_fields.length > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="font-bold">Missing Required Information: </strong>
                The input omitted:{" "}
                <span className="font-mono underline font-bold">
                  {extractedData.missing_fields.join(", ")}
                </span>
                . Per strict project specifications, the AI did NOT invent these values. Please fill them in below before saving.
              </div>
            </div>
          )}

          {/* Editable Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {/* Amount */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 flex justify-between">
                <span>Amount (₹) *</span>
                {extractedData.missing_fields.includes("amount") && (
                  <span className="text-amber-700 font-bold text-xs">Missing</span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Enter amount"
                  value={formValues.amount}
                  onChange={(e) => setFormValues({ ...formValues, amount: e.target.value })}
                  className={`w-full pl-8 pr-3 py-2 border rounded-xl outline-none font-bold text-slate-900 ${
                    extractedData.missing_fields.includes("amount") && !formValues.amount
                      ? "border-amber-400 bg-amber-50/40"
                      : "border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  }`}
                />
              </div>
            </div>

            {/* Type */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Type *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormValues({ ...formValues, type: "income" })}
                  className={`py-2 text-xs font-bold rounded-xl border transition ${
                    formValues.type === "income"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  + Income
                </button>
                <button
                  type="button"
                  onClick={() => setFormValues({ ...formValues, type: "expense" })}
                  className={`py-2 text-xs font-bold rounded-xl border transition ${
                    formValues.type === "expense"
                      ? "bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-500/20"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  - Expense
                </button>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Category *
              </label>
              <select
                value={formValues.category}
                onChange={(e) => setFormValues({ ...formValues, category: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-xl outline-none text-slate-900 bg-white"
              >
                {ALLOWED_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Transaction Date */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 flex justify-between">
                <span>Date (YYYY-MM-DD) *</span>
                {extractedData.missing_fields.includes("transaction_date") && (
                  <span className="text-amber-700 font-bold text-xs">Missing</span>
                )}
              </label>
              <input
                type="date"
                value={formValues.transaction_date}
                onChange={(e) => setFormValues({ ...formValues, transaction_date: e.target.value })}
                className={`w-full p-2 border rounded-xl outline-none text-slate-900 ${
                  extractedData.missing_fields.includes("transaction_date") && !formValues.transaction_date
                    ? "border-amber-400 bg-amber-50/40"
                    : "border-slate-300 focus:ring-2 focus:ring-indigo-500"
                }`}
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Description / Memo *
              </label>
              <input
                type="text"
                value={formValues.description}
                onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-xl outline-none text-slate-900"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setExtractedData(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleConfirmAndSave}
              disabled={saving}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition shadow-sm ${
                saving
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? "Saving to Database..." : "Confirm & Save Cash Transaction"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
