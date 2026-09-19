import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";

const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxcXBhcHN3dHhpaWdhcmhpd3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.dummy";

export function getSupabaseServerEnv() {
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

/**
 * Creates a server Supabase client for Route Handlers and Server Actions.
 */
export function createServerSupabaseClient(request?: NextRequest) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseServerEnv();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        if (!request) return [];
        return request.cookies.getAll().map((c) => ({
          name: c.name,
          value: c.value,
        }));
      },
      setAll() {
        // Managed via response headers in Next.js
      },
    },
  });
}

export interface AuthenticatedUser {
  id: string;
  email?: string;
}

/**
 * Validates authentication on the server for API routes.
 * Inspects Authorization Bearer token first, then falls back to session cookies.
 * Rejects unauthenticated callers.
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<{ user: AuthenticatedUser | null; error: string | null }> {
  try {
    const client = createServerSupabaseClient(request);

    // 1. Check Authorization header (Bearer token)
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      const token = authHeader.substring(7).trim();
      if (token) {
        const { data, error } = await client.auth.getUser(token);
        if (!error && data?.user) {
          return {
            user: {
              id: data.user.id,
              email: data.user.email,
            },
            error: null,
          };
        }
      }
    }

    // 2. Check cookies via server client
    const { data, error } = await client.auth.getUser();
    if (!error && data?.user) {
      return {
        user: {
          id: data.user.id,
          email: data.user.email,
        },
        error: null,
      };
    }

    return {
      user: null,
      error: error?.message || "Unauthorized: No valid session or token found",
    };
  } catch (err: any) {
    return {
      user: null,
      error: err?.message || "Unauthorized: Verification failed",
    };
  }
}
