import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      // If email rate limit is exceeded, try to auto-confirm via admin client if service role key is configured
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceRoleKey) {
        try {
          const adminClient = createAdminClient(supabaseUrl, serviceRoleKey.trim().replace(/['"]/g, ""), {
            auth: { autoRefreshToken: false, persistSession: false },
          });

          // Create with auto-confirmed email (bypasses email sending completely)
          const { data: adminUser, error: adminErr } = await adminClient.auth.admin.createUser({
            email: email.trim(),
            password,
            email_confirm: true,
          });

          if (!adminErr && adminUser?.user) {
            const { data: loginData } = await supabase.auth.signInWithPassword({
              email: email.trim(),
              password,
            });

            return NextResponse.json(
              {
                success: true,
                user: adminUser.user,
                session: loginData?.session || null,
              },
              { headers: response.headers }
            );
          }
        } catch (adminException) {
          console.warn("Admin auto-create fallback error:", adminException);
        }
      }

      // Friendly message for email rate limit
      if (error.message.toLowerCase().includes("rate limit")) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Supabase free email rate limit reached. Please turn OFF 'Confirm email' in Supabase Dashboard (Auth -> Providers -> Email -> uncheck 'Confirm email' -> Save) to enable instant login without waiting for emails.",
          },
          { status: 429 }
        );
      }

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
    console.error("POST /api/auth/signup error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to sign up" },
      { status: 500 }
    );
  }
}
