-- CS04 FinTech Income & Expense Management for Irregular-Earning Workers
-- PostgreSQL Schema for Supabase
-- NOTE: Duplicate-detection constraints are strictly omitted per system specification.

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT 'demo-user-001',
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

-- Enable Row Level Security (open for demo / authenticated user)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select for demo" 
    ON public.transactions FOR SELECT 
    USING (true);

CREATE POLICY "Allow public insert for demo" 
    ON public.transactions FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow public update for demo" 
    ON public.transactions FOR UPDATE 
    USING (true);

CREATE POLICY "Allow public delete for demo" 
    ON public.transactions FOR DELETE 
    USING (true);
