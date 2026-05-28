"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { UserProfile, UserRole } from "@/types/user";

interface AuthContextValue {
  firebaseUser: any | null;
  userProfile: UserProfile | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isMasterAdmin: boolean;
  authLoading: boolean;
  authError: string;
  authStep: string;
  setAuthError: (error: string) => void;
  savedMasses: string[];
  savedEvents: string[];
  setSavedMasses: React.Dispatch<React.SetStateAction<string[]>>;
  setSavedEvents: React.Dispatch<React.SetStateAction<string[]>>;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  magicLinkSent: boolean;
  setMagicLinkSent: (sent: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within a SupabaseAuthProvider");
  }
  return ctx;
}

export function useAuthSafe(): AuthContextValue | null {
  return useContext(AuthContext);
}
/** Wraps a promise with a timeout to prevent infinite hangs */
function withTimeout(promise: any, ms: number, fallback: any): Promise<any> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [authStep, setAuthStep] = useState<string>("idle");
  const [savedMasses, setSavedMasses] = useState<string[]>([]);
  const [savedEvents, setSavedEvents] = useState<string[]>([]);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Load user profile with resilient fallbacks
  const loadProfile = useCallback(async (supabaseUser: any) => {
    const userId = supabaseUser?.id || supabaseUser?.uid;
    const email = supabaseUser?.email || "";

    if (!userId) {
      console.warn("[Auth] loadProfile called without a valid userId");
      setAuthStep("error");
      return;
    }

    try {
      setAuthStep("fetching_role");
      // 1. FETCH ROLE FIRST — user_roles table EXISTS and is critical (3s timeout)
      let role: UserRole = "user";
      try {
        const { data: roleData, error: rError } = await withTimeout(
          supabase.from("user_roles").select("role").eq("user_id", userId).single(),
          3000,
          { data: null, error: { message: "Timeout fetching role", code: "TIMEOUT" } as any }
        );
        if (roleData?.role) {
          role = roleData.role as UserRole;
        } else if (rError) {
          console.warn("[Auth] Role query issue:", rError.message);
        }
      } catch (roleErr) {
        console.warn("[Auth] Role fetch failed:", roleErr);
      }

      console.log(`[Auth] Role resolved: ${role} for user ${userId ? userId.slice(0, 8) : "unknown"}...`);

      setAuthStep("fetching_profile");
      // 2. ATTEMPT PROFILE TABLE (may not exist yet) (3s timeout)
      let profileData: any = null;
      try {
        const { data: profile, error: pError } = await withTimeout(
          supabase.from("profiles").select("*").eq("id", userId).single(),
          3000,
          { data: null, error: { message: "Timeout fetching profile", code: "TIMEOUT" } as any }
        );
        if (pError) {
          // Table might not exist — this is OK, we fall back
          if (pError.code === "PGRST116" || pError.code === "PGRST205" || pError.code === "42P01") {
            console.warn("[Auth] Profiles table may not exist yet. Using auth session data.");
          } else {
            console.warn("[Auth] Profile query issue:", pError.message);
          }
        } else {
          profileData = profile;
        }

        // If no profile exists but table does exist, try to create one
        if (!profileData && pError?.code === "PGRST116") {
          try {
            const defaultName = email ? email.split("@")[0] : "User";
            const { data: newProfile } = await withTimeout(
              supabase
                .from("profiles")
                .insert({ id: userId, display_name: defaultName, email })
                .select("*")
                .single(),
              3000,
              { data: null }
            );
            if (newProfile) profileData = newProfile;
          } catch (insertErr) {
            console.warn("[Auth] Profiles table insert failed:", insertErr);
          }
        }
      } catch (profileErr) {
        console.warn("[Auth] Profile fetch failed entirely:", profileErr);
      }

      // 3. BUILD USER PROFILE — always succeeds even with missing tables
      const displayName = profileData?.display_name || (email ? email.split("@")[0] : "User");
      
      const constructedProfile: UserProfile & { avatarUrl?: string; homeCity?: string; homeState?: string } = {
        uid: userId,
        displayName,
        email: profileData?.email || email,
        avatarUrl: profileData?.avatar_url || "",
        homeCity: profileData?.home_city || "",
        homeState: profileData?.home_state || "",
        role,
        region: undefined,
        savedMasses: [],
        savedEvents: [],
        rsvpEvents: [],
        createdAt: profileData?.created_at || supabaseUser.created_at || new Date().toISOString(),
        updatedAt: profileData?.updated_at || new Date().toISOString(),
      };

      // 4. FETCH REGION for local_admin (optional) (2s timeout)
      if (role === "local_admin") {
        try {
          const { data: assignments } = await withTimeout(
            supabase.from("admin_district_assignments").select("district_id").eq("user_id", userId).limit(1),
            2000,
            { data: null, error: null }
          );
          if (assignments && assignments.length > 0) {
            constructedProfile.region = "Assigned";
          }
        } catch {
          // Silent — region is optional
        }
      }

      // Set user profile immediately (and cache it for instant load next time)
      setUserProfile(constructedProfile);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`viam_user_profile_${userId}`, JSON.stringify(constructedProfile));
        } catch (e) {
          console.warn("[Auth] Failed to write profile to localStorage cache:", e);
        }
      }

      // 5. LOAD SAVED ITEMS from local storage instantly (Fast-Path)
      let initialMasses: string[] = [];
      let initialEvents: string[] = [];
      if (typeof window !== "undefined") {
        try {
          const cachedMasses = localStorage.getItem(`viam_saved_mass_locations_${userId}`);
          const cachedEvents = localStorage.getItem(`viam_saved_events_${userId}`);
          if (cachedMasses) initialMasses = JSON.parse(cachedMasses);
          if (cachedEvents) initialEvents = JSON.parse(cachedEvents);
        } catch {}
      }
      setSavedMasses(initialMasses);
      setSavedEvents(initialEvents);

      setAuthStep("fetching_saved");

      // 6. FETCH FRESH SAVED ITEMS IN BACKGROUND (Non-blocking)
      withTimeout(
        supabase.from("saved_mass_locations").select("mass_location_id").eq("user_id", userId),
        4000,
        { data: null, error: { message: "Timeout", code: "TIMEOUT" } as any }
      ).then(({ data: massData, error: mErr }) => {
        if (massData && !mErr) {
          const freshMasses = massData.map((item: any) => item.mass_location_id);
          setSavedMasses(freshMasses);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(`viam_saved_mass_locations_${userId}`, JSON.stringify(freshMasses));
            } catch {}
          }
        }
      }).catch(err => {
        console.warn("[Auth] Background saved masses fetch error:", err);
      });

      withTimeout(
        supabase.from("saved_events").select("event_id").eq("user_id", userId),
        4000,
        { data: null, error: { message: "Timeout", code: "TIMEOUT" } as any }
      ).then(({ data: eventData, error: eErr }) => {
        if (eventData && !eErr) {
          const freshEvents = eventData.map((item: any) => String(item.event_id));
          setSavedEvents(freshEvents);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(`viam_saved_events_${userId}`, JSON.stringify(freshEvents));
            } catch {}
          }
        }
      }).catch(err => {
        console.warn("[Auth] Background saved events fetch error:", err);
      });
      
      setAuthStep("completed");
    } catch (err) {
      console.error("[Auth] loadProfile failed entirely:", err);
      setAuthStep("error");
      
      // CRITICAL FALLBACK: Even if everything fails, still set a minimal profile
      // so the app doesn't get stuck in loading forever
      setUserProfile({
        uid: userId,
        displayName: email ? email.split("@")[0] : "User",
        email,
        role: "user",
        savedMasses: [],
        savedEvents: [],
        rsvpEvents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Try localStorage fallback safely
      if (typeof window !== "undefined") {
        try {
          const cachedMasses = localStorage.getItem(`viam_saved_mass_locations_${userId}`);
          const cachedEvents = localStorage.getItem(`viam_saved_events_${userId}`);
          if (cachedMasses) setSavedMasses(JSON.parse(cachedMasses));
          if (cachedEvents) setSavedEvents(JSON.parse(cachedEvents));
        } catch (storageErr) {
          console.warn("[Auth] Failed to load cached items in fallback:", storageErr);
        }
      }
    }
  }, []);

  // Monitor Supabase Authentication states
  useEffect(() => {
    const initSession = async () => {
      setAuthLoading(true);
      setAuthStep("init");
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          6000,
          { data: { session: null }, error: null }
        );
        if (session?.user) {
          const userObj = {
            ...session.user,
            id: session.user.id,
            uid: session.user.id,
            email: session.user.email || "",
            phoneNumber: session.user.phone || "",
          };
          setFirebaseUser(userObj);
          
          // SWR FAST-PATH: load profile from cache instantly
          if (typeof window !== "undefined") {
            const cachedProfileStr = localStorage.getItem(`viam_user_profile_${userObj.id}`);
            if (cachedProfileStr) {
              try {
                const cachedProfile = JSON.parse(cachedProfileStr);
                setUserProfile(cachedProfile);
                setAuthLoading(false); // Disable screen loading overlay immediately!
                console.log("[Auth] Fast-path loaded cached profile for user:", userObj.id);
              } catch (e) {
                console.warn("[Auth] Failed to parse cached profile in fast-path:", e);
              }
            }
          }

          await loadProfile(userObj);
        } else {
          setFirebaseUser(null);
          setUserProfile(null);
          setAuthStep("idle");
        }
      } catch (err) {
        console.error("[Auth] Init session error:", err);
        setFirebaseUser(null);
        setUserProfile(null);
        setAuthStep("error");
      } finally {
        setAuthLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Auth] State change: ${event}`);
      setAuthLoading(true);
      setAuthStep("init");
      try {
        if (session?.user) {
          const userObj = {
            ...session.user,
            id: session.user.id,
            uid: session.user.id,
            email: session.user.email || "",
            phoneNumber: session.user.phone || "",
          };
          setFirebaseUser(userObj);

          // SWR FAST-PATH: load profile from cache instantly on state change
          if (typeof window !== "undefined") {
            const cachedProfileStr = localStorage.getItem(`viam_user_profile_${userObj.id}`);
            if (cachedProfileStr) {
              try {
                const cachedProfile = JSON.parse(cachedProfileStr);
                setUserProfile(cachedProfile);
                setAuthLoading(false); // Disable screen loading overlay immediately!
                console.log("[Auth] onAuthStateChange Fast-path loaded cached profile for user:", userObj.id);
              } catch (e) {
                console.warn("[Auth] Failed to parse cached profile in onAuthStateChange fast-path:", e);
              }
            }
          }

          await loadProfile(userObj);
        } else {
          setFirebaseUser(null);
          setUserProfile(null);
          setSavedMasses([]);
          setSavedEvents([]);
          setAuthStep("idle");
        }
      } catch (err) {
        console.error("[Auth] Error in onAuthStateChange handler:", err);
        setAuthStep("error");
      } finally {
        setAuthLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (firebaseUser) {
      await loadProfile(firebaseUser);
    }
  }, [firebaseUser, loadProfile]);

  // Magic Link OTP Implementation
  const sendMagicLink = useCallback(async (email: string) => {
    setAuthError("");
    setAuthLoading(true);
    try {
      const redirectUrl = typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : "http://localhost:3000/auth/callback";

      const { error } = await withTimeout(
        supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: redirectUrl },
        }),
        12000,
        { error: { message: "Request timed out. Please check your network or Supabase config." } }
      );

      if (error) throw error;
      setMagicLinkSent(true);
    } catch (err: any) {
      console.error("[Auth] Magic link error:", err);
      setAuthError(err?.message || "We couldn't send a login link. Please try again.");
      setMagicLinkSent(false);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signOutHandler = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setFirebaseUser(null);
      setUserProfile(null);
      setSavedMasses([]);
      setSavedEvents([]);
      setMagicLinkSent(false);
    } catch (err: any) {
      console.error("[Auth] Sign out error:", err);
    }
  }, []);

  const isLoggedIn = !!userProfile;
  const isAdmin = !!userProfile && (userProfile.role === "master_admin" || userProfile.role === "local_admin");
  const isMasterAdmin = !!userProfile && userProfile.role === "master_admin";

  const value: AuthContextValue = {
    firebaseUser,
    userProfile,
    isLoggedIn,
    isAdmin,
    isMasterAdmin,
    authLoading,
    authError,
    authStep,
    setAuthError,
    savedMasses,
    savedEvents,
    setSavedMasses,
    setSavedEvents,
    sendMagicLink,
    signOut: signOutHandler,
    refreshProfile,
    magicLinkSent,
    setMagicLinkSent,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
