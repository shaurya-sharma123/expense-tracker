"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  AlertCircle,
  ShieldCheck,
  DownloadCloud,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Info,
  Layers,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { AnalyticsSummary, ExpenseCategoryPoint, IncomeTrendPoint } from "@/types";

const CATEGORY_COLORS = [
  "#6366f1", // Indigo
  "#ec4899", // Pink
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#06b6d4", // Cyan
  "#8b5cf6", // Purple
  "#f97316", // Orange
  "#64748b", // Slate
  "#14b8a6", // Teal
  "#e11d48", // Rose
];

export default function DashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trend, setTrend] = useState<IncomeTrendPoint[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [sumRes, trendRes, catRes] = await Promise.all([
        fetch("/api/analytics/summary"),
        fetch("/api/analytics/income-trend"),
        fetch("/api/analytics/expense-categories"),
      ]);

      const [sumJson, trendJson, catJson] = await Promise.all([
        sumRes.json(),
        trendRes.json(),
        catRes.json(),
      ]);

      if (sumJson.success) setSummary(sumJson.data);
      if (trendJson.success) setTrend(trendJson.data);
      if (catJson.success) setCategories(catJson.data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load dashboard analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  if (loading && !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Computing financial volatility & metrics...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-800 space-y-3 max-w-2xl mx-auto my-8">
        <div className="flex items-center space-x-2 font-semibold">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span>Failed to Load Dashboard Analytics</span>
        </div>
        <p className="text-sm">{errorMessage}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const cvLevel = summary?.income_variability.variability_level || "Low";
  const cvColor =
    cvLevel === "High"
      ? "text-rose-700 bg-rose-50 border-rose-200"
      : cvLevel === "Medium"
      ? "text-amber-700 bg-amber-50 border-amber-200"
      : "text-emerald-700 bg-emerald-50 border-emerald-200";

  const totalCount = summary?.transaction_count.total || 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Irregular Income Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time financial visibility, volatility metrics, and safety reserves for gig and irregular earners.
          </p>
        </div>
        <div className="flex items-center space-x-2.5">
          <button
            onClick={fetchDashboardData}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
            title="Refresh analytics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            href="/import"
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition shadow-sm"
          >
            <DownloadCloud className="w-4 h-4 text-indigo-600" />
            <span>Import (AA)</span>
          </Link>
          <Link
            href="/ai-entry"
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-sm shadow-indigo-200"
          >
            <Sparkles className="w-4 h-4" />
            <span>Record Cash</span>
          </Link>
        </div>
      </div>

      {/* Empty State Banner if no transactions */}
      {totalCount === 0 && (
        <div className="p-6 bg-indigo-50/80 border border-indigo-200 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-semibold text-indigo-950 text-base">
              No transactions recorded yet
            </h3>
            <p className="text-sm text-indigo-800">
              Import simulated Account Aggregator statements or record cash earnings to see your income volatility metrics and suggested buffer.
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/import"
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-sm"
            >
              Import AA Data Now
            </Link>
          </div>
        </div>
      )}

      {/* Metric Cards: Total Income, Total Expenses, Balance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Total Income */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Income
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {formatINR(summary?.total_income || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center">
              <span className="text-emerald-600 font-medium inline-flex items-center mr-1">
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
                All Sources
              </span>
              <span>across recorded history</span>
            </p>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Expenses
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {formatINR(summary?.total_expenses || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center">
              <span className="text-rose-600 font-medium inline-flex items-center mr-1">
                <ArrowDownRight className="w-3 h-3 mr-0.5" />
                Outgoing
              </span>
              <span>bills, food, rent, operations</span>
            </p>
          </div>
        </div>

        {/* Net Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Net Balance
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl sm:text-3xl font-extrabold ${
                (summary?.net_balance || 0) >= 0 ? "text-slate-900" : "text-rose-600"
              }`}
            >
              {formatINR(summary?.net_balance || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Retained savings from irregular inflows
            </p>
          </div>
        </div>
      </div>

      {/* Weekly & Monthly Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Weekly Summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <h3 className="font-semibold text-slate-800 text-sm">
                Weekly Summary (Current Week)
              </h3>
            </div>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
              ISO Week
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-50 p-3 rounded-xl">
              <div className="text-xs text-slate-500 font-medium">Weekly Income</div>
              <div className="text-base font-bold text-emerald-700 mt-1">
                {formatINR(summary?.weekly.income || 0)}
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <div className="text-xs text-slate-500 font-medium">Weekly Expenses</div>
              <div className="text-base font-bold text-rose-700 mt-1">
                {formatINR(summary?.weekly.expenses || 0)}
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <div className="text-xs text-slate-500 font-medium">Weekly Balance</div>
              <div className="text-base font-bold text-indigo-700 mt-1">
                {formatINR(summary?.weekly.balance || 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <h3 className="font-semibold text-slate-800 text-sm">
                Monthly Summary (Current Month)
              </h3>
            </div>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
              Calendar Month
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-50 p-3 rounded-xl">
              <div className="text-xs text-slate-500 font-medium">Monthly Income</div>
              <div className="text-base font-bold text-emerald-700 mt-1">
                {formatINR(summary?.monthly.income || 0)}
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <div className="text-xs text-slate-500 font-medium">Monthly Expenses</div>
              <div className="text-base font-bold text-rose-700 mt-1">
                {formatINR(summary?.monthly.expenses || 0)}
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <div className="text-xs text-slate-500 font-medium">Monthly Balance</div>
              <div className="text-base font-bold text-indigo-700 mt-1">
                {formatINR(summary?.monthly.balance || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CORE SPECIFICATION: Income Variability & Suggested Financial Buffer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Variability (CV) Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Income Variability (Coefficient of Variation)
              </h3>
              <p className="text-xs text-slate-500">
                Calculated on weekly income: CV = Standard Deviation / Mean
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${cvColor}`}>
              {cvLevel} Volatility
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center pt-2">
            <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
              <div className="text-xs text-slate-500">Mean Weekly (μ)</div>
              <div className="text-lg font-extrabold text-slate-800 mt-1">
                {formatINR(summary?.income_variability.mean_weekly_income || 0)}
              </div>
            </div>
            <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
              <div className="text-xs text-slate-500">Std Deviation (σ)</div>
              <div className="text-lg font-extrabold text-slate-800 mt-1">
                {formatINR(summary?.income_variability.std_dev_weekly_income || 0)}
              </div>
            </div>
            <div className="border border-slate-100 rounded-xl p-3 bg-indigo-50/50">
              <div className="text-xs text-indigo-800 font-medium">CV Value</div>
              <div className="text-lg font-extrabold text-indigo-700 mt-1">
                {summary?.income_variability.cv.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Volatility Threshold Indicator */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500 font-medium">
              <span>Low (&lt; 0.25)</span>
              <span>Medium (0.25 – 0.50)</span>
              <span>High (&ge; 0.50)</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div className="w-1/3 bg-emerald-400 h-full" />
              <div className="w-1/3 bg-amber-400 h-full" />
              <div className="w-1/3 bg-rose-400 h-full" />
            </div>
          </div>

          {/* Mandatory Prototype Threshold Disclaimer */}
          <div className="flex items-start space-x-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <p>
              <strong className="font-semibold text-slate-700">Notice: </strong>
              Prototype thresholds (CV &lt; 0.25 = Low, 0.25 &le; CV &lt; 0.50 = Medium, CV &ge; 0.50 = High), not universal financial standards.
            </p>
          </div>
        </div>

        {/* Suggested Financial Buffer Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Suggested Financial Buffer
                </h3>
                <p className="text-xs text-slate-500">
                  Recommended cash cushion for irregular earning dips
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
              <div className="text-xs text-indigo-700 font-semibold uppercase tracking-wider">
                Emergency Buffer Cushion
              </div>
              <div className="text-3xl font-black text-indigo-900 mt-1">
                {formatINR(summary?.suggested_buffer.buffer_amount || 0)}
              </div>
              <div className="text-xs text-indigo-600 mt-2 font-medium">
                Calculation: {formatINR(summary?.suggested_buffer.average_monthly_income || 0)} (Average Monthly Income) × 1.5
              </div>
            </div>
          </div>

          {/* Mandatory Professional Advice Disclaimer */}
          <div className="flex items-start space-x-2 text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p>
              <strong className="font-semibold">Disclaimer: </strong>
              Prototype estimate, not professional financial advice.
            </p>
          </div>
        </div>
      </div>

      {/* Visualizations: Recharts Income Trend & Expense Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income Trend Area Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Income Trend by Week
              </h3>
              <p className="text-xs text-slate-500">
                Weekly trajectory showing gig income spikes and troughs vs outflows
              </p>
            </div>
            <div className="flex items-center space-x-4 text-xs font-medium">
              <span className="flex items-center text-indigo-600">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 mr-1.5" />
                Income
              </span>
              <span className="flex items-center text-rose-500">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 mr-1.5" />
                Expense
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trend}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(v) => `₹${v >= 1000 ? `${v / 1000}k` : v}`}
                  />
                  <Tooltip
                    formatter={(val: number) => [formatINR(val)]}
                    labelFormatter={(label) => `Week: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorExpense)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No trend data available
              </div>
            )}
          </div>
        </div>

        {/* Expense Category Visualization */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Expense Categories
            </h3>
            <p className="text-xs text-slate-500">
              Distribution of costs across canonical categories
            </p>
          </div>

          <div className="h-56 w-full">
            {categories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="amount"
                    nameKey="category"
                  >
                    {categories.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number, name: string) => [
                      formatINR(val),
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No expense category data
              </div>
            )}
          </div>

          {/* Category List */}
          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {categories.slice(0, 5).map((cat, idx) => (
              <div
                key={cat.category}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                  />
                  <span className="font-medium text-slate-700">
                    {cat.category}
                  </span>
                </div>
                <div className="font-semibold text-slate-900">
                  {formatINR(cat.amount)} ({cat.percentage}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
