import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function getSupabaseConfig() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Faltan las variables públicas de Supabase.");
  }

  return { supabaseUrl, supabaseKey };
}

export function createClient() {
  const config = getSupabaseConfig();

  return createBrowserClient(config.supabaseUrl, config.supabaseKey);
}
