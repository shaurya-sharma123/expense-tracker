import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Transaction } from "@/types";
import fs from "fs";
import path from "path";

// Initialize Supabase client with typo-resilient URL normalization
const rawUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

// Auto-correct any typo in project ref (qar -> gar) and strip whitespace/quotes
let supabaseUrl = rawUrl ? rawUrl.trim().replace(/['"]/g, "") : undefined;
if (supabaseUrl && supabaseUrl.includes("gqqpapswtxiiqarhiwra")) {
  supabaseUrl = supabaseUrl.replace("gqqpapswtxiiqarhiwra", "gqqpapswtxiigarhiwra");
}

const rawKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseKey = rawKey ? rawKey.trim().replace(/['"]/g, "") : undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes("your-project") &&
    !supabaseKey.includes("your-supabase")
);

let supabaseClient: SupabaseClient | null = null;
if (isSupabaseConfigured && supabaseUrl && supabaseKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
  } catch (err) {
    console.warn("Failed to initialize Supabase client:", err);
  }
}

// In-Memory Store across Lambda invocations
declare global {
  var __inMemoryTransactions: Transaction[] | undefined;
}
if (!globalThis.__inMemoryTransactions) {
  globalThis.__inMemoryTransactions = [];
}

// Local File/Memory Fallback Store
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "transactions.json");

function ensureDataFile(): Transaction[] {
  try {
    if (globalThis.__inMemoryTransactions && globalThis.__inMemoryTransactions.length > 0) {
      return [...globalThis.__inMemoryTransactions];
    }
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, "utf8");
      const parsed = JSON.parse(content);
      globalThis.__inMemoryTransactions = parsed;
      return parsed;
    }
  } catch (err) {
    // Read-only filesystem or parse error
  }
  return globalThis.__inMemoryTransactions || [];
}

function saveDataFile(transactions: Transaction[]) {
  globalThis.__inMemoryTransactions = [...transactions];
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(transactions, null, 2), "utf8");
  } catch (err) {
    // Silently ignore write errors on read-only environments (e.g. Vercel)
  }
}

function sanitizeForSupabase(tx: any) {
  let category = tx.category || "Other";
  // Safely map common irregular earner categories to match PostgreSQL check constraints if present
  if (category === "Food") category = "Food & Dining";
  else if (category === "Transport") category = "Transportation";
  else if (category === "Bills") category = "Bills & Utilities";
  else if (category === "Rent") category = "Rent & Housing";
  else if (category === "Cash Withdrawal") category = "Other";

  const clean: Record<string, any> = {
    id: tx.id || crypto.randomUUID(),
    user_id: tx.user_id || "demo-user-001",
    amount: Number(tx.amount),
    type: tx.type === "income" ? "income" : "expense",
    category,
    description: String(tx.description || "").slice(0, 500),
    transaction_date: tx.transaction_date,
    source: tx.source === "ai" ? "ai" : "open_banking",
  };

  if (tx.merchant) clean.merchant = String(tx.merchant);

  return clean;
}

export const db = {
  isUsingSupabase: () => isSupabaseConfigured,

  async getAllTransactions(filter?: {
    type?: string;
    category?: string;
    source?: string;
    search?: string;
    userId?: string;
  }): Promise<Transaction[]> {
    if (isSupabaseConfigured && supabaseClient) {
      try {
        let query = supabaseClient
          .from("transactions")
          .select("*")
          .order("transaction_date", { ascending: false });

        if (filter?.userId) {
          query = query.eq("user_id", filter.userId);
        }
        if (filter?.type) {
          query = query.eq("type", filter.type);
        }
        if (filter?.category) {
          query = query.eq("category", filter.category);
        }
        if (filter?.source) {
          query = query.eq("source", filter.source);
        }
        if (filter?.search) {
          query = query.or(
            `description.ilike.%${filter.search}%,merchant.ilike.%${filter.search}%`
          );
        }

        const { data, error } = await query;
        if (!error && data) {
          return data as Transaction[];
        }
      } catch (err) {
        console.warn("Supabase query error, fallback to memory:", err);
      }
    }

    // Local/Memory fallback store
    let txs = ensureDataFile();

    if (filter?.userId) {
      txs = txs.filter((t) => t.user_id === filter.userId);
    }
    if (filter?.type) {
      txs = txs.filter((t) => t.type === filter.type);
    }
    if (filter?.category) {
      txs = txs.filter((t) => t.category === filter.category);
    }
    if (filter?.source) {
      txs = txs.filter((t) => t.source === filter.source);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      txs = txs.filter(
        (t) =>
          t.description?.toLowerCase().includes(q) ||
          t.merchant?.toLowerCase().includes(q)
      );
    }

    return txs.sort(
      (a, b) =>
        new Date(b.transaction_date).getTime() -
        new Date(a.transaction_date).getTime()
    );
  },

  async getTransactionById(id: string, userId?: string): Promise<Transaction | null> {
    if (isSupabaseConfigured && supabaseClient) {
      try {
        let query = supabaseClient
          .from("transactions")
          .select("*")
          .eq("id", id);
        if (userId) {
          query = query.eq("user_id", userId);
        }
        const { data, error } = await query.single();
        if (!error && data) return data as Transaction;
      } catch (err) {
        console.warn("Supabase single get error:", err);
      }
    }

    const txs = ensureDataFile();
    return txs.find((t) => t.id === id && (!userId || t.user_id === userId)) || null;
  },

  async createTransaction(tx: Omit<Transaction, "id" | "created_at" | "updated_at">): Promise<Transaction> {
    const newTx: Transaction = {
      ...tx,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabaseClient) {
      try {
        const payload = sanitizeForSupabase(newTx);
        const { data, error } = await supabaseClient
          .from("transactions")
          .insert([payload])
          .select()
          .single();
        if (!error && data) return data as Transaction;
        if (error) {
          console.warn("Supabase insert warning, fallback to memory:", error.message);
        }
      } catch (err: any) {
        console.warn("Supabase insert exception, fallback to memory:", err?.message || err);
      }
    }

    const txs = ensureDataFile();
    txs.push(newTx);
    saveDataFile(txs);
    return newTx;
  },

  async createTransactionsBatch(
    newTxs: Omit<Transaction, "id" | "created_at" | "updated_at">[]
  ): Promise<Transaction[]> {
    const stampedTxs: Transaction[] = newTxs.map((tx) => ({
      ...tx,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    if (isSupabaseConfigured && supabaseClient) {
      try {
        const payload = stampedTxs.map(sanitizeForSupabase);
        const { data, error } = await supabaseClient
          .from("transactions")
          .insert(payload)
          .select();
        if (!error && data && data.length > 0) {
          return data as Transaction[];
        }
        if (error) {
          console.warn("Supabase batch insert warning, fallback to memory:", error.message);
        }
      } catch (err: any) {
        console.warn("Supabase batch insert exception, fallback to memory:", err?.message || err);
      }
    }

    const txs = ensureDataFile();
    txs.push(...stampedTxs);
    saveDataFile(txs);
    return stampedTxs;
  },

  async updateTransaction(
    id: string,
    updates: Partial<Transaction>,
    userId?: string
  ): Promise<Transaction | null> {
    const updatedStamp = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabaseClient) {
      try {
        let query = supabaseClient
          .from("transactions")
          .update(updatedStamp)
          .eq("id", id);
        if (userId) {
          query = query.eq("user_id", userId);
        }
        const { data, error } = await query
          .select()
          .single();
        if (!error && data) return data as Transaction;
      } catch (err) {
        console.warn("Supabase update error:", err);
      }
    }

    const txs = ensureDataFile();
    const idx = txs.findIndex((t) => t.id === id && (!userId || t.user_id === userId));
    if (idx === -1) return null;

    txs[idx] = { ...txs[idx], ...updatedStamp };
    saveDataFile(txs);
    return txs[idx];
  },

  async deleteTransaction(id: string, userId?: string): Promise<boolean> {
    if (isSupabaseConfigured && supabaseClient) {
      try {
        let query = supabaseClient
          .from("transactions")
          .delete()
          .eq("id", id);
        if (userId) {
          query = query.eq("user_id", userId);
        }
        const { error } = await query;
        if (!error) return true;
      } catch (err) {
        console.warn("Supabase delete error:", err);
      }
    }

    const txs = ensureDataFile();
    const initialLen = txs.length;
    const filtered = txs.filter((t) => !(t.id === id && (!userId || t.user_id === userId)));
    if (filtered.length !== initialLen) {
      saveDataFile(filtered);
      return true;
    }
    return false;
  },
};
