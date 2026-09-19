"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/components/AuthProvider";
import {
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  Building2,
  ArrowRight,
  RefreshCw,
  Layers,
} from "lucide-react";
import { BankAccount } from "@/types";

export default function ImportPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [providerName, setProviderName] = useState<string>("");
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported_count: number;
    message: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch accounts on load
  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [user]);

  const fetchAccounts = async () => {
    setLoadingAccounts(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/financial-data/accounts");
      const json = await res.json();
      if (json.success) {
        setAccounts(json.data);
        setProviderName(json.provider);
        if (json.data.length > 0) {
          setSelectedAccountId(json.data[0].account_id);
        }
      } else {
        setErrorMessage(json.error || "Failed to fetch accounts from provider");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load accounts");
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleImport = async () => {
    if (!selectedAccountId) return;
    setImporting(true);
    setErrorMessage(null);
    setImportResult(null);

    try {
      const res = await fetch("/api/financial-data/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: selectedAccountId }),
      });

      const json = await res.json();
      if (json.success) {
        setImportResult({
          imported_count: json.imported_count ?? json.importedCount,
          message: json.message,
        });
      } else {
        setErrorMessage(json.error || "Import failed");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error while importing");
    } finally {
      setImporting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="max-w-3xl mx-auto space-y-6 py-6 pb-12">
      {/* Page Header */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
          <DownloadCloud className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financial Data Import</h1>
          <p className="text-sm text-slate-500">
            Open-banking / Account Aggregator financial data pipeline (Stage 2)
          </p>
        </div>
      </div>

      {/* Provider Info Banner */}
      {providerName && (
        <div className="flex items-center space-x-2 p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs sm:text-sm text-indigo-900">
          <Layers className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <span>
            Connected Provider Interface: <strong className="font-semibold">{providerName}</strong>
          </span>
        </div>
      )}

      {/* Account Selection Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-800">
            1. Select Bank Account
          </label>
          <p className="text-xs text-slate-500 mt-0.5">
            Choose the connected account to import transactions from
          </p>
        </div>

        {loadingAccounts ? (
          <div className="p-6 text-center text-slate-400 text-sm flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Loading accounts from provider...</span>
          </div>
        ) : (
          <div className="space-y-3">
            <select
              value={selectedAccountId}
              onChange={(e) => {
                setSelectedAccountId(e.target.value);
                setImportResult(null);
              }}
              className="w-full p-3 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {accounts.map((acc) => (
                <option key={acc.account_id} value={acc.account_id}>
                  {acc.bank_name} - {acc.account_name} ({acc.masked_account_number}) • Balance: ₹
                  {acc.balance.toLocaleString("en-IN")}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Import Action Button */}
        <div className="pt-2">
          <button
            onClick={handleImport}
            disabled={importing || loadingAccounts || !selectedAccountId}
            className={`w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-white transition shadow-sm ${
              importing || loadingAccounts || !selectedAccountId
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
            }`}
          >
            {importing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Importing Transactions...</span>
              </>
            ) : (
              <>
                <DownloadCloud className="w-4 h-4" />
                <span>Import Financial Data</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-start space-x-2.5">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Import Error: </span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Success Message */}
      {importResult && (
        <div
          className={`p-5 rounded-2xl border space-y-3 ${
            importResult.imported_count > 0
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-indigo-50 border-indigo-200 text-indigo-900"
          }`}
        >
          <div className="flex items-center space-x-2 font-semibold text-base">
            <CheckCircle2
              className={`w-5 h-5 ${
                importResult.imported_count > 0
                  ? "text-emerald-600"
                  : "text-indigo-600"
              }`}
            />
            <span>
              {importResult.imported_count > 0
                ? "Import Succeeded!"
                : "Account Already Synchronized"}
            </span>
          </div>
          <div className="text-sm">
            New Transactions Added:{" "}
            <strong className="font-bold text-base">
              {importResult.imported_count}
            </strong>
          </div>
          <p className="text-xs opacity-90">{importResult.message}</p>
          <div className="pt-1">
            <Link
              href="/transactions"
              className="inline-flex items-center space-x-1.5 text-xs font-bold underline hover:opacity-80"
            >
              <span>View Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
      </div>
    </AuthGuard>
  );
}
