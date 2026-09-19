import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.email || !body.password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const { email, password } = body;

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
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!rawKey || rawKey.includes("dummy") || rawKey.length < 20) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Supabase Anon Key is not configured. Please add NEXT_PUBLIC_SUPABASE_ANON_KEY to your Vercel Project Settings -> Environment Variables, or create a .env.local file.",
        },
        { status: 500 }
      );
    }

    const supabaseKey = rawKey.trim().replace(/['"]/g, "");
    let response = NextResponse.json({ success: true });

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

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: data.user,
        session: data.session,
      },
      {
        headers: response.headers,
      }
    );
  } catch (err: any) {
    console.error("POST /api/auth/login error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to log in" },
      { status: 500 }
    );
  }
}
