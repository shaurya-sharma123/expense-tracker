import { createBrowserClient } from "@supabase/ssr";

const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxcXBhcHN3dHhpaWdhcmhpd3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.dummy";

function getSupabaseEnv() {
  const rawUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://gqqpapswtxiigarhiwra.supabase.co";

  let supabaseUrl = rawUrl.trim().replace(/['"]/g, "");
  if (supabaseUrl.includes("gqqpapswtxiiqarhiwra")) {
    supabaseUrl = supabaseUrl.replace("gqqpapswtxiiqarhiwra", "gqqpapswtxiigarhiwra");
  }

  const rawKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;
  const supabaseAnonKey = rawKey ? rawKey.trim().replace(/['"]/g, "") : FALLBACK_ANON_KEY;

  return { supabaseUrl, supabaseAnonKey };
}

let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (typeof window === "undefined") {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  if (!clientInstance) {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
    clientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return clientInstance;
}
