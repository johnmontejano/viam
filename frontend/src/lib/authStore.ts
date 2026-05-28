import { useState, useEffect } from "react";

export interface UserSession {
  email: string;
  role: "user" | "local_admin" | "master_admin";
  state?: string; // For local_admin
}

// Simulated Preconfigured Users
export const QUICK_USERS: Record<string, UserSession> = {
  "user@viam.com": {
    email: "user@viam.com",
    role: "user",
  },
  "localadmin@viam.com": {
    email: "localadmin@viam.com",
    role: "local_admin",
    state: "CA",
  },
  "masteradmin@viam.com": {
    email: "masteradmin@viam.com",
    role: "master_admin",
  },
};

// Key Names for LocalStorage
const SESSION_KEY = "viam_user_session";
const SAVED_MASSES_KEY = "viam_saved_mass_locations";
const SAVED_EVENTS_KEY = "viam_saved_events";

export function getSession(): UserSession | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(SESSION_KEY);
  return data ? JSON.parse(data) : null;
}

export function saveSession(session: UserSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export function getSavedMasses(): string[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(SAVED_MASSES_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveSavedMasses(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SAVED_MASSES_KEY, JSON.stringify(ids));
}

export function getSavedEvents(): string[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(SAVED_EVENTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveSavedEvents(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SAVED_EVENTS_KEY, JSON.stringify(ids));
}
