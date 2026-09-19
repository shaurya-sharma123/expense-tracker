import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
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
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      "dummy-key";

    const supabaseKey = rawKey.trim().replace(/['"]/g, "");
    let response = NextResponse.json({ success: true, message: "Logged out successfully" });

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    await supabase.auth.signOut();

    return response;
  } catch (err: any) {
    console.error("POST /api/auth/logout error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to log out" },
      { status: 500 }
    );
  }
}
