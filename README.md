# FlexiIncome (CS04)
### FinTech Income & Expense Management for Irregular-Earning Workers

A production-ready Next.js application tailored specifically for gig workers, freelancers, and irregular earners. It provides real-time financial visibility, tracks volatile income flows, calculates income variability (Coefficient of Variation), and computes recommended emergency financial buffers.

---

## 🌟 Core Highlights & Architectural Features

### 1. Two Primary Transaction Input Streams
- **Financial Data Import (Account Aggregator / Open Banking Adapter)**:
  - Connects to an external financial data provider interface (`FinancialDataProvider`).
  - Includes a synthetic sandbox adapter generating 60+ realistic Indian transactions (UPI, NEFT, IMPS, ATM withdrawals, freelance project retainers, grocery bills, fuel, rent).
  - Pluggable architecture allowing seamless swap with live Sahamati/Setu Account Aggregator APIs without rewriting application logic.
- **AI Natural-Language Cash Entry (Gemini API)**:
  - Dedicated to logging cash income and offline expenses not recorded in bank accounts.
  - Natural language extraction powered by Google Gemini (with robust deterministic fallback).
  - **Strict Non-Invention Rule**: Never fabricates missing values. If amount or date is omitted, flags them explicitly in `missing_fields`.
  - Resolves explicit relative dates ("today", "yesterday", "day before yesterday").
  - **Mandatory User Confirmation**: Extracted data is presented in an interactive review card. It is **never** saved automatically; the user reviews, completes missing fields, and confirms before saving.

### 2. Strict Zero-Duplicate Policy
- Per hackathon requirements, **no duplicate detection** exists in the codebase:
  - No duplicate matching or warnings.
  - No similarity checks.
  - No duplicate database constraints.
  - Imported and cash entries are directly validated and preserved.

### 3. Financial Analytics & Gig Worker Safety Metrics
- **Coefficient of Variation (CV) Income Volatility**:
  1. Groups income by ISO weeks.
  2. Calculates mean weekly income ($\mu$) and standard deviation ($\sigma$).
  3. Computes $CV = \sigma / \mu$ (safely handles $\mu = 0$).
  4. Prototype thresholds:
     - $CV < 0.25$: **Low Volatility**
     - $0.25 \le CV < 0.50$: **Medium Volatility**
     - $CV \ge 0.50$: **High Volatility**
  5. Clearly labeled: *"Prototype thresholds, not universal financial standards."*
- **Suggested Financial Buffer**:
  - $\text{Buffer} = 1.5 \times \text{Average Monthly Income}$.
  - Clearly labeled: *"Prototype estimate, not professional financial advice."*
- **Interactive Recharts Visualizations**:
  - Area Chart: Weekly income peaks and valleys vs expense outflows.
  - Donut Chart: Expense breakdown across 12 canonical categories.

---

## 🏗️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Lucide React
- **Charts**: Recharts
- **Database**: Supabase PostgreSQL (`@supabase/supabase-js`) with transparent local JSON storage fallback for instant demo availability
- **AI Extraction**: Google Gemini API (`@google/genai`)

---

## 📂 Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai/extract/route.ts            # AI cash extraction
│   │   │   ├── analytics/
│   │   │   │   ├── summary/route.ts           # Overview, CV, and Buffer metrics
│   │   │   │   ├── income-trend/route.ts      # Weekly timeline series
│   │   │   │   └── expense-categories/route.ts# Category breakdown
│   │   │   ├── financial-data/
│   │   │   │   ├── accounts/route.ts          # Bank accounts from provider
│   │   │   │   ├── transactions/route.ts      # Raw provider transactions
│   │   │   │   └── import/route.ts            # Batch import to DB
│   │   │   └── transactions/
│   │   │       ├── route.ts                   # GET / POST transactions
│   │   │       └── [id]/route.ts              # GET / PUT / DELETE transaction
│   │   ├── dashboard/page.tsx                 # Analytics dashboard & charts
│   │   ├── import/page.tsx                    # Account Aggregator import UI
│   │   ├── ai-entry/page.tsx                  # AI natural-language cash entry UI
│   │   ├── transactions/page.tsx              # Unified transaction ledger
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   └── Navbar.tsx                         # Header navigation
│   ├── lib/
│   │   ├── ai/extractor.ts                    # Gemini API & heuristic fallback
│   │   ├── analytics.ts                       # CV math & buffer logic
│   │   ├── db.ts                              # Supabase + local repository adapter
│   │   └── financial-provider/
│   │       ├── interface.ts                   # FinancialDataProvider interface
│   │       └── synthetic.ts                   # 66 realistic irregular transactions
│   └── types/
│       └── index.ts                           # Unified Transaction & analytics types
├── supabase/
│   └── schema.sql                             # Supabase PostgreSQL DDL
├── tests/
│   ├── verify.mjs                             # Unit tests (CV, Buffer, AI rules)
│   └── test-api.mjs                           # Integration tests for all 11 endpoints
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables (Optional for Live Supabase & Gemini)
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
```

> **Note on Zero-Config Demo**: If Supabase or Gemini keys are not provided, the application runs automatically using its built-in repository adapter and deterministic natural-language extractor. Once keys are provided in `.env.local`, it connects directly to live cloud services!

### 3. Run Database Migrations (When using Supabase)
Execute the SQL statements located in `supabase/schema.sql` inside the Supabase SQL Editor.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run Verification Tests
```bash
npm test
node tests/test-api.mjs
```

---

## 🧪 Canonical Transaction Categories

Per specification, transactions are strictly categorized into:
- `Salary`
- `Freelance`
- `Business`
- `Food`
- `Transport`
- `Rent`
- `Bills`
- `Shopping`
- `Education`
- `Healthcare`
- `Cash Withdrawal`
- `Other`
# expense-tracker
