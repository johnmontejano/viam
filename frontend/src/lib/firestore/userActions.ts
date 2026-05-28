import { 
  saveMassLocation, 
  unsaveMassLocation, 
  saveEvent, 
  unsaveEvent, 
  getSavedMasses, 
  getSavedEvents 
} from "@/lib/supabase/db";

/**
 * Save a mass or event to the user's saved list in Supabase.
 */
export async function saveItem(
  uid: string,
  type: "mass" | "event",
  itemId: string
): Promise<void> {
  try {
    if (type === "mass") {
      await saveMassLocation(uid, itemId);
    } else {
      await saveEvent(uid, itemId);
    }
  } catch (error) {
    console.error(`Error in saveItem bridge for ${type}:`, error);
    throw error;
  }
}

/**
 * Remove a mass or event from the user's saved list in Supabase.
 */
export async function unsaveItem(
  uid: string,
  type: "mass" | "event",
  itemId: string
): Promise<void> {
  try {
    if (type === "mass") {
      await unsaveMassLocation(uid, itemId);
    } else {
      await unsaveEvent(uid, itemId);
    }
  } catch (error) {
    console.error(`Error in unsaveItem bridge for ${type}:`, error);
    throw error;
  }
}

/**
 * Fetch the user's saved masses and events from Supabase.
 */
export async function getUserSavedItems(
  uid: string
): Promise<{ savedMasses: string[]; savedEvents: string[] }> {
  try {
    const [savedMasses, savedEvents] = await Promise.all([
      getSavedMasses(uid),
      getSavedEvents(uid)
    ]);
    return { savedMasses, savedEvents };
  } catch (error) {
    console.error("Error in getUserSavedItems bridge:", error);
    return { savedMasses: [], savedEvents: [] };
  }
}

/**
 * RSVP to an event (Muted/Mocked locally).
 */
export async function rsvpToEvent(
  uid: string,
  eventId: string
): Promise<void> {
  // Simple local storage sync to keep UI states updated immediately
  if (typeof window !== "undefined") {
    const key = `viam_rsvp_events_${uid}`;
    const stored = localStorage.getItem(key);
    const list: string[] = stored ? JSON.parse(stored) : [];
    if (!list.includes(eventId)) {
      localStorage.setItem(key, JSON.stringify([...list, eventId]));
    }
  }
}

/**
 * Remove RSVP from an event (Muted/Mocked locally).
 */
export async function unRsvp(
  uid: string,
  eventId: string
): Promise<void> {
  if (typeof window !== "undefined") {
    const key = `viam_rsvp_events_${uid}`;
    const stored = localStorage.getItem(key);
    const list: string[] = stored ? JSON.parse(stored) : [];
    localStorage.setItem(key, JSON.stringify(list.filter(id => id !== eventId)));
  }
}

/**
 * Fetch the user's RSVP'd event IDs.
 */
export async function getUserRsvps(uid: string): Promise<string[]> {
  if (typeof window === "undefined") return [];
  const key = `viam_rsvp_events_${uid}`;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Fetch the RSVP count for a specific event.
 */
export async function getEventRsvpCount(eventId: string): Promise<number> {
  return 0;
}
