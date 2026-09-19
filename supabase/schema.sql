-- CS04 FinTech Income & Expense Management for Irregular-Earning Workers
-- PostgreSQL Schema for Supabase with Row Level Security (RLS)
-- NOTE: Duplicate-detection constraints are strictly omitted per system specification.

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    transaction_date DATE NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('open_banking', 'ai')),
    merchant TEXT,
    external_transaction_id TEXT,
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast analytics and time-series querying
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON public.transactions(source);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_update_transactions_updated_at ON public.transactions;
CREATE TRIGGER trg_update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- Supabase Row Level Security (RLS) Policies
-- Enforces that authenticated users can only view, insert, update, and delete
-- transactions where user_id matches their authenticated Supabase UID (auth.uid()).
-- =========================================================================

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop legacy demo policies if present
DROP POLICY IF EXISTS "Allow public select for demo" ON public.transactions;
DROP POLICY IF EXISTS "Allow public insert for demo" ON public.transactions;
DROP POLICY IF EXISTS "Allow public update for demo" ON public.transactions;
DROP POLICY IF EXISTS "Allow public delete for demo" ON public.transactions;
DROP POLICY IF EXISTS "Users can manage own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can select own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;

-- 1. SELECT: Authenticated users can only read their own transactions
CREATE POLICY "Users can select own transactions" 
    ON public.transactions FOR SELECT 
    TO authenticated
    USING (auth.uid()::text = user_id);

-- 2. INSERT: Authenticated users can only insert records with their own user_id
CREATE POLICY "Users can insert own transactions" 
    ON public.transactions FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid()::text = user_id);

-- 3. UPDATE: Authenticated users can only update their own records
CREATE POLICY "Users can update own transactions" 
    ON public.transactions FOR UPDATE 
    TO authenticated
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- 4. DELETE: Authenticated users can only delete their own records
CREATE POLICY "Users can delete own transactions" 
    ON public.transactions FOR DELETE 
    TO authenticated
    USING (auth.uid()::text = user_id);
