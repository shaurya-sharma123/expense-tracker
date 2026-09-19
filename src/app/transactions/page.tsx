"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/components/AuthProvider";
import {
  ReceiptText,
  Search,
  Filter,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  DownloadCloud,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Transaction, ALLOWED_CATEGORIES, AllowedCategory } from "@/types";

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    amount: number;
    category: string;
    description: string;
  }>({ amount: 0, category: "Other", description: "" });
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const params = new URLSearchParams();
      if (selectedType !== "all") params.set("type", selectedType);
      if (selectedSource !== "all") params.set("source", selectedSource);
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/transactions?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setTransactions(json.data);
      } else {
        setActionError(json.error || "Failed to fetch transactions");
      }
    } catch (err: any) {
      setActionError(err.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, selectedType, selectedSource, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setTransactions(transactions.filter((t) => t.id !== id));
        setActionSuccess("Transaction deleted successfully.");
      } else {
        setActionError(json.error || "Failed to delete transaction.");
      }
    } catch (err: any) {
      setActionError(err.message || "Delete error");
    }
  };

  const startEdit = (t: Transaction) => {
    setEditingId(t.id || null);
    setEditForm({
      amount: t.amount,
      category: t.category,
      description: t.description,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (json.success) {
        setTransactions(
          transactions.map((t) => (t.id === id ? json.data : t))
        );
        setEditingId(null);
        setActionSuccess("Transaction updated successfully.");
      } else {
        setActionError(json.error || "Failed to save update");
      }
    } catch (err: any) {
      setActionError(err.message || "Update error");
    }
  };

  const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <AuthGuard>
      <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Transaction Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete records from Open Banking (AA) imports and verified AI cash logs.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            href="/import"
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition shadow-sm"
          >
            <DownloadCloud className="w-4 h-4 text-indigo-600" />
            <span>Import AA Data</span>
          </Link>
          <Link
            href="/ai-entry"
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-sm shadow-indigo-200"
          >
            <Sparkles className="w-4 h-4" />
            <span>Record Cash</span>
          </Link>
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)}>
            <X className="w-4 h-4 text-red-600" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)}>
            <X className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search description or merchant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
          >
            Search
          </button>
        </form>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-500 font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none font-medium"
          >
            <option value="all">All Types</option>
            <option value="income">Income (+)</option>
            <option value="expense">Expense (-)</option>
          </select>

          {/* Source Filter */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none font-medium"
          >
            <option value="all">All Sources</option>
            <option value="open_banking">Open Banking (AA)</option>
            <option value="ai">AI Cash Entry</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none font-medium"
          >
            <option value="all">All Categories</option>
            {ALLOWED_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {(selectedType !== "all" ||
            selectedSource !== "all" ||
            selectedCategory !== "all" ||
            search) && (
            <button
              onClick={() => {
                setSelectedType("all");
                setSelectedSource("all");
                setSelectedCategory("all");
                setSearch("");
              }}
              className="text-indigo-600 hover:text-indigo-800 font-semibold underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Showing {transactions.length} Transactions
          </span>
          <button
            onClick={fetchTransactions}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1 font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
            <p className="text-sm">Loading transactions from database...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <ReceiptText className="w-8 h-8 mx-auto text-slate-300" />
            <div className="font-semibold">No transactions found</div>
            <p className="text-xs text-slate-400">
              Import Account Aggregator statements or record cash transactions to see them here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description / Merchant</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => {
                  const isEditing = editingId === tx.id;
                  const isIncome = tx.type === "income";

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {tx.transaction_date}
                      </td>

                      {/* Description & Merchant */}
                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.description}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                description: e.target.value,
                              })
                            }
                            className="p-1.5 border border-slate-300 rounded text-xs w-full outline-none"
                          />
                        ) : (
                          <div>
                            <div className="font-medium text-slate-900">
                              {tx.description}
                            </div>
                            {tx.merchant && (
                              <div className="text-xs text-slate-400">
                                Merchant: {tx.merchant}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isEditing ? (
                          <select
                            value={editForm.category}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                category: e.target.value,
                              })
                            }
                            className="p-1.5 border border-slate-300 rounded text-xs bg-white outline-none"
                          >
                            {ALLOWED_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {tx.category}
                          </span>
                        )}
                      </td>

                      {/* Source Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {tx.source === "open_banking" ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                            <DownloadCloud className="w-3 h-3" />
                            <span>Open Banking</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            <Sparkles className="w-3 h-3" />
                            <span>AI Cash</span>
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.amount}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                amount: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="p-1.5 border border-slate-300 rounded text-xs w-24 text-right outline-none"
                          />
                        ) : (
                          <span
                            className={`font-mono font-bold ${
                              isIncome ? "text-emerald-600" : "text-slate-900"
                            }`}
                          >
                            {isIncome ? "+" : "-"}
                            {formatINR(tx.amount)}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => tx.id && saveEdit(tx.id)}
                              className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => startEdit(tx)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                              title="Edit transaction"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => tx.id && handleDelete(tx.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete transaction"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      )}
    </div>
  </div>
    </AuthGuard>
  );
}
