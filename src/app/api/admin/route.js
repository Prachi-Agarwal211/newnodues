import { createServerClient } from "@supabase/ssr"; // <-- USING THE FUNCTION SUGGESTED BY THE ERROR
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// This is the server-side admin client for bypassing RLS
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  const cookieStore = cookies();

  // This is the correct, verbose way to create a server client with your library version
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set(name, value, options);
        },
        remove(name, options) {
          cookieStore.delete(name, options);
        },
      },
    }
  );

  // 1. Check if a user is logged in
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Check if the logged-in user is an admin
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return NextResponse.json({ error: "Forbidden: Not an admin" }, { status: 403 });
  }

  // 3. If user is an admin, fetch all data using the admin client
  try {
    const { data: applications, error: applicationsError } = await supabaseAdmin
      .from('no_dues_forms')
      .select(`
        *,
        no_dues_status (
          department_name,
          status,
          rejection_reason,
          action_at
        )
      `)
      .order('created_at', { ascending: false });

    if (applicationsError) {
      throw applicationsError;
    }

    return NextResponse.json({ applications });

  } catch (err) {
    console.error('Error fetching admin data:', err);
    return NextResponse.json({ error: err.message || "Failed to fetch dashboard data." }, { status: 500 });
  }
}