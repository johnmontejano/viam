"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const handleCallback = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get("code");

        if (code) {
          console.log("[Supabase Callback] Exchanging PKCE code...");
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            // Do not throw here! If detectSessionInUrl already exchanged it, this will fail with 'invalid code'
            console.warn("[Supabase Callback] Code exchange issue (may already be exchanged):", error.message);
          } else {
            console.log("[Supabase Callback] PKCE code exchange successful!");
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted) {
          console.log("[Supabase Callback] Session found immediately. Redirecting...");
          router.push("/");
        }
      } catch (err) {
        console.error("[Supabase Callback] Error during callback:", err);
      }
    };

    handleCallback();

    // Listen for the session to be established in the background
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && isMounted) {
        console.log("[Supabase Callback] Auth state changed to active. Redirecting...");
        router.push("/");
      }
    });

    // Fallback: If no session is established after 3 seconds, redirect to home anyway
    const fallbackTimer = setTimeout(() => {
      if (isMounted) {
        console.warn("[Supabase Callback] Timeout waiting for session. Redirecting to home...");
        router.push("/");
      }
    }, 3000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] dark:bg-[#09090b] px-4">
      <div className="neural-glass p-8 rounded-3xl max-w-sm w-full border border-stone-200 dark:border-white/5 shadow-2xl flex flex-col items-center gap-4 text-center">
        <div className="p-3.5 bg-rose-500/10 text-[#be123c] rounded-2xl border border-rose-500/20">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <h3 className="font-extrabold text-stone-900 dark:text-white uppercase tracking-wider text-xs">Authenticating Session</h3>
        <p className="text-xs text-stone-500 dark:text-zinc-400">Verifying secure one-time credentials. Please wait...</p>
      </div>
    </div>
  );
}
