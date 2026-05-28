import type { CatholicEvent } from "@/types/event";
import { 
  submitCatholicEvent, 
  getApprovedEvents as getSupabaseApprovedEvents, 
  getPendingEvents as getSupabasePendingEvents, 
  moderateCatholicEvent, 
  getUserSubmissions as getSupabaseUserSubmissions,
  uploadEventImage,
  updateEventImageUrl
} from "@/lib/supabase/db";

/**
 * Submit a new event to Supabase.
 */
export async function submitEvent(
  eventData: Omit<CatholicEvent, "id" | "distanceFromOrigin" | "distanceFromRoute" | "detourMinutes">,
  uid: string,
  displayName: string
): Promise<string> {
  try {
    return await submitCatholicEvent({
      ...eventData,
      submittedBy: uid
    });
  } catch (error) {
    console.error("Error in submitEvent bridge:", error);
    throw error;
  }
}

/**
 * Fetch all approved events from Supabase.
 */
export async function getApprovedEvents(): Promise<CatholicEvent[]> {
  try {
    return await getSupabaseApprovedEvents();
  } catch (error) {
    console.error("Error in getApprovedEvents bridge:", error);
    return [];
  }
}

/**
 * Fetch all pending events from Supabase, scoped by roles.
 */
export async function getPendingEvents(region?: string, userId?: string, role?: string): Promise<CatholicEvent[]> {
  try {
    if (userId && role) {
      return await getSupabasePendingEvents(userId, role as any);
    }
    return [];
  } catch (error) {
    console.error("Error in getPendingEvents bridge:", error);
    return [];
  }
}

/**
 * Moderate an event (approve, reject, or request changes).
 */
export async function moderateEvent(
  eventId: string,
  action: "approve" | "reject" | "request_clarification",
  adminUid: string,
  note?: string
): Promise<void> {
  try {
    const actMap: Record<typeof action, "approve" | "reject" | "changes_requested"> = {
      approve: "approve",
      reject: "reject",
      request_clarification: "changes_requested"
    };
    await moderateCatholicEvent(eventId, actMap[action], adminUid, note);
  } catch (error) {
    console.error("Error in moderateEvent bridge:", error);
    throw error;
  }
}

/**
 * Fetch all events submitted by a specific user from Supabase.
 */
export async function getUserSubmissions(uid: string): Promise<CatholicEvent[]> {
  try {
    return await getSupabaseUserSubmissions(uid);
  } catch (error) {
    console.error("Error in getUserSubmissions bridge:", error);
    return [];
  }
}

/**
 * Delete an event document by ID (Muted stub).
 */
export async function deleteEvent(eventId: string): Promise<void> {
  console.warn("deleteEvent is deprecated on client side. Admin archives are managed in the database schema.");
}

export { uploadEventImage, updateEventImageUrl };
