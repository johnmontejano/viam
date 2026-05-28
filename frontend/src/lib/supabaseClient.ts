import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "Supabase configuration keys are missing! Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
    );
    // Create a mock client that will fail gracefully
    throw new Error(
      "Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables."
    );
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseInstance;
}

// Export a getter that lazily initializes the client
export const supabase = (() => {
  // Only create the client if the environment variables are set
  if (supabaseUrl && supabaseAnonKey) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  // Return a proxy that throws a helpful error when accessed
  return new Proxy({} as SupabaseClient, {
    get(_, prop) {
      if (prop === "then") return undefined; // Prevent Promise detection issues
      throw new Error(
        "Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables in the Settings > Vars section."
      );
    },
  });
})();

export { getSupabaseClient };
export default supabase;
