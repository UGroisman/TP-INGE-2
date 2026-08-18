import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { fetchWithSupabaseTimeout } from "@/lib/supabase/fetch";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function getSupabaseConfig() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Faltan las variables públicas de Supabase.");
  }

  return { supabaseUrl, supabaseKey };
}

export async function updateSession(request: NextRequest) {
  const config = getSupabaseConfig();
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(config.supabaseUrl, config.supabaseKey, {
    global: {
      fetch: fetchWithSupabaseTimeout,
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    await supabase.auth.getClaims();
  } catch {
    // Route-level auth handles temporary verification failures.
  }

  return supabaseResponse;
}
