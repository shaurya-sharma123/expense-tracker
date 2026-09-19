import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Transaction } from "@/types";
import fs from "fs";
import path from "path";

// Initialize Supabase client if environment variables are provided
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes("your-project") &&
    !supabaseKey.includes("your-supabase")
);

let supabaseClient: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  supabaseClient = createClient(supabaseUrl!, supabaseKey!);
}

// Local File/Memory Fallback Store for seamless MVP testing without immediate Supabase setup
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "transactions.json");

function ensureDataFile(): Transaction[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf8");
      return [];
    }
    const content = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Local store read error, fallback to memory:", err);
    return [];
  }
}

function saveDataFile(transactions: Transaction[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(transactions, null, 2), "utf8");
  } catch (err) {
    console.error("Local store write error:", err);
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
  }): Promise<Transaction[]> {
    if (isSupabaseConfigured && supabaseClient) {
      try {
        let query = supabaseClient
          .from("transactions")
          .select("*")
          .order("transaction_date", { ascending: false });

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
        if (error) {
          console.warn("Supabase query failed, falling back to local store:", error.message);
        } else if (data) {
          return data as Transaction[];
        }
      } catch (err) {
        console.warn("Supabase error, fallback to local store:", err);
      }
    }

    // Local fallback store
    let txs = ensureDataFile();

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

  async getTransactionById(id: string): Promise<Transaction | null> {
    if (isSupabaseConfigured && supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from("transactions")
          .select("*")
          .eq("id", id)
          .single();
        if (!error && data) return data as Transaction;
      } catch (err) {
        console.warn("Supabase single get error:", err);
      }
    }

    const txs = ensureDataFile();
    return txs.find((t) => t.id === id) || null;
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
        if (error) {
          console.error("Supabase insert error:", error);
          throw new Error(error.message);
        }
        if (data) return data as Transaction;
      } catch (err: any) {
        console.error("Supabase insert exception:", err);
        throw err;
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
        if (error) {
          console.error("Supabase batch insert error:", error);
          throw new Error(error.message);
        }
        if (data) return data as Transaction[];
      } catch (err: any) {
        console.error("Supabase batch insert exception:", err);
        throw err;
      }
    }

    const txs = ensureDataFile();
    txs.push(...stampedTxs);
    saveDataFile(txs);
    return stampedTxs;
  },

  async updateTransaction(
    id: string,
    updates: Partial<Transaction>
  ): Promise<Transaction | null> {
    const updatedStamp = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from("transactions")
          .update(updatedStamp)
          .eq("id", id)
          .select()
          .single();
        if (!error && data) return data as Transaction;
      } catch (err) {
        console.warn("Supabase update error:", err);
      }
    }

    const txs = ensureDataFile();
    const idx = txs.findIndex((t) => t.id === id);
    if (idx === -1) return null;

    txs[idx] = { ...txs[idx], ...updatedStamp };
    saveDataFile(txs);
    return txs[idx];
  },

  async deleteTransaction(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from("transactions")
          .delete()
          .eq("id", id);
        if (!error) return true;
      } catch (err) {
        console.warn("Supabase delete error:", err);
      }
    }

    const txs = ensureDataFile();
    const initialLen = txs.length;
    const filtered = txs.filter((t) => t.id !== id);
    if (filtered.length !== initialLen) {
      saveDataFile(filtered);
      return true;
    }
    return false;
  },
};
