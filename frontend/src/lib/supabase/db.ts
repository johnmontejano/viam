import { supabase } from "@/lib/supabaseClient";
import type { UserProfile, UserRole } from "@/types/user";
import type { CatholicEvent, EventCategory } from "@/types/event";

// -----------------------------------------------------------------------------
// USER PROFILES & ROLES
// -----------------------------------------------------------------------------

export async function getUserProfile(userId: string, emailFallback?: string): Promise<UserProfile & { avatarUrl?: string; homeCity?: string; homeState?: string }> {
  try {
    // 1. Fetch Profile
    let { data: profile, error: pError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    // 2. Fetch Role
    let { data: roleData, error: rError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    // Safe bootstrap/fallback inserts for pre-existing accounts
    if (!profile) {
      const defaultName = emailFallback ? emailFallback.split("@")[0] : "User";
      const { data: newProfile, error: insError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          display_name: defaultName,
          email: emailFallback
        })
        .select("*")
        .single();
      
      if (!insError) {
        profile = newProfile;
      }
    }

    if (!roleData) {
      const { data: newRole } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "user"
        })
        .select("role")
        .single();
      roleData = newRole;
    }

    const role: UserRole = (roleData?.role as UserRole) || "user";

    // Fetch assigned region/districts if local_admin
    let region = undefined;
    if (role === "local_admin") {
      const { data: assignments } = await supabase
        .from("admin_district_assignments")
        .select("districts(state)")
        .eq("user_id", userId)
        .limit(1);
      
      if (assignments && assignments.length > 0) {
        region = (assignments[0] as any).districts?.state || "CA";
      }
    }

    return {
      uid: userId,
      displayName: profile?.display_name || "User",
      email: profile?.email || emailFallback || "",
      avatarUrl: profile?.avatar_url || "",
      homeCity: profile?.home_city || "",
      homeState: profile?.home_state || "",
      role,
      region,
      savedMasses: [],
      savedEvents: [],
      rsvpEvents: [],
      createdAt: profile?.created_at || new Date().toISOString(),
      updatedAt: profile?.updated_at || new Date().toISOString()
    };
  } catch (err) {
    console.error("getUserProfile failed:", err);
    throw err;
  }
}

export async function updateUserProfile(
  userId: string,
  data: { displayName?: string; avatarUrl?: string; homeCity?: string; homeState?: string }
): Promise<void> {
  const updatePayload: Record<string, any> = {};
  if (data.displayName !== undefined) updatePayload.display_name = data.displayName;
  if (data.avatarUrl !== undefined) updatePayload.avatar_url = data.avatarUrl;
  if (data.homeCity !== undefined) updatePayload.home_city = data.homeCity;
  if (data.homeState !== undefined) updatePayload.home_state = data.homeState;
  updatePayload.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", userId);

  if (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

// -----------------------------------------------------------------------------
// SAVED MASSES
// -----------------------------------------------------------------------------

export async function getSavedMasses(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("saved_mass_locations")
    .select("mass_location_id")
    .eq("user_id", userId);

  if (error) {
    console.error("Error getting saved masses:", error);
    return [];
  }
  return data.map((item: any) => item.mass_location_id);
}

export async function saveMassLocation(userId: string, massLocationId: string): Promise<void> {
  console.log(`[DEBUG - SAVE MASS] User ID: ${userId}, Mass ID: ${massLocationId}, Table: saved_mass_locations, Action: INSERT`);
  const { error } = await supabase
    .from("saved_mass_locations")
    .insert({
      user_id: userId,
      mass_location_id: massLocationId
    });

  if (error) {
    console.error(`[DEBUG - SAVE MASS ERROR] Code: ${error.code}, Message: ${error.message}`);
    throw error;
  }
  console.log("[DEBUG - SAVE MASS] Insert Success");
}

export async function unsaveMassLocation(userId: string, massLocationId: string): Promise<void> {
  console.log(`[DEBUG - UNSAVE MASS] User ID: ${userId}, Mass ID: ${massLocationId}, Table: saved_mass_locations, Action: DELETE`);
  const { error } = await supabase
    .from("saved_mass_locations")
    .delete()
    .eq("user_id", userId)
    .eq("mass_location_id", massLocationId);

  if (error) {
    console.error(`[DEBUG - UNSAVE MASS ERROR] Code: ${error.code}, Message: ${error.message}`);
    throw error;
  }
  console.log("[DEBUG - UNSAVE MASS] Delete Success");
}

// -----------------------------------------------------------------------------
// SAVED EVENTS
// -----------------------------------------------------------------------------

export async function getSavedEvents(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("saved_events")
    .select("event_id")
    .eq("user_id", userId);

  if (error) {
    console.error("Error getting saved events:", error);
    return [];
  }
  return data.map((item: any) => String(item.event_id));
}

export async function saveEvent(userId: string, eventId: string): Promise<void> {
  console.log(`[DEBUG - SAVE EVENT] User ID: ${userId}, Event ID: ${eventId}, Table: saved_events, Action: INSERT`);
  const { error } = await supabase
    .from("saved_events")
    .insert({
      user_id: userId,
      event_id: eventId
    });

  if (error) {
    console.error(`[DEBUG - SAVE EVENT ERROR] Code: ${error.code}, Message: ${error.message}`);
    throw error;
  }
  console.log("[DEBUG - SAVE EVENT] Insert Success");
}

export async function unsaveEvent(userId: string, eventId: string): Promise<void> {
  console.log(`[DEBUG - UNSAVE EVENT] User ID: ${userId}, Event ID: ${eventId}, Table: saved_events, Action: DELETE`);
  const { error } = await supabase
    .from("saved_events")
    .delete()
    .eq("user_id", userId)
    .eq("event_id", eventId);

  if (error) {
    console.error(`[DEBUG - UNSAVE EVENT ERROR] Code: ${error.code}, Message: ${error.message}`);
    throw error;
  }
  console.log("[DEBUG - UNSAVE EVENT] Delete Success");
}

export async function getEventsByIds(eventIds: string[]): Promise<CatholicEvent[]> {
  if (!eventIds || eventIds.length === 0) return [];
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .in("id", eventIds);

  if (error) {
    console.error("Error fetching events by ids:", error);
    return [];
  }
  return (data || []).map(mapDbToEvent);
}

// -----------------------------------------------------------------------------
// CATHOLIC EVENTS SUBMISSIONS & SHARING
// -----------------------------------------------------------------------------

export async function submitCatholicEvent(
  eventData: Omit<CatholicEvent, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const payload = {
    submitted_by: eventData.submittedBy || null,
    district_id: null, // Removed eventData.relatedChurchId mapping to prevent foreign key UUID violations
    title: eventData.title,
    description: eventData.description || null,
    category: eventData.category,
    start_datetime: eventData.startDateTime,
    end_datetime: eventData.endDateTime || null,
    location_name: eventData.locationName || null,
    address: eventData.address,
    city: eventData.city || null,
    state: eventData.state || null,
    country: eventData.country || "United States",
    latitude: eventData.latitude || null,
    longitude: eventData.longitude || null,
    host_name: eventData.hostName || null,
    host_type: eventData.hostType || null,
    audience: eventData.audience || null,
    related_church_id: eventData.relatedChurchId || null,
    image_url: eventData.imageUrl || null,
    source_type: eventData.hostType || null,
    external_url: eventData.externalUrl || null,
    external_rsvp_url: eventData.externalUrl || null,
    status: "pending_review",
    is_demo_data: false
  };

  console.log(`[DEBUG - SUBMIT EVENT] User ID: ${eventData.submittedBy}, Table: events`);
  console.log(`[DEBUG - SUBMIT EVENT] Payload:`, payload);

  const { data, error } = await supabase
    .from("events")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error(`[DEBUG - SUBMIT EVENT ERROR] Code: ${error.code}, Message: ${error.message}`);
    throw error;
  }
  
  console.log(`[DEBUG - SUBMIT EVENT] Insert Success. Inserted Event ID: ${data.id}`);
  return data.id;
}

export async function getUserSubmissions(userId: string): Promise<CatholicEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("submitted_by", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user event submissions:", error);
    return [];
  }

  return (data || []).map(mapDbToEvent);
}

export async function getApprovedEvents(): Promise<CatholicEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", "approved")
    .eq("is_demo_data", false)
    .order("start_datetime", { ascending: true });

  if (error) {
    console.error("Error fetching approved events:", error);
    return [];
  }
  return (data || []).map(mapDbToEvent);
}

export async function getAllAdminEvents(): Promise<CatholicEvent[]> {
  console.log(`[DEBUG - ALL ADMIN EVENTS] Table: events, Filter: is_demo_data=false`);
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("is_demo_data", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`[DEBUG - ALL ADMIN EVENTS ERROR] Code: ${error.code}, Message: ${error.message}`);
    return [];
  }
  return (data || []).map(mapDbToEvent);
}

// Helper to map DB columns to the front-end CatholicEvent interface
function mapDbToEvent(row: any): CatholicEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    category: row.category as EventCategory,
    startDateTime: row.start_datetime,
    endDateTime: row.end_datetime || undefined,
    locationName: row.location_name || undefined,
    address: row.address,
    city: row.city || undefined,
    state: row.state || undefined,
    country: row.country || "United States",
    latitude: row.latitude ? Number(row.latitude) : undefined,
    longitude: row.longitude ? Number(row.longitude) : undefined,
    hostName: row.host_name || undefined,
    hostType: row.host_type as any || undefined,
    relatedChurchId: row.related_church_id || undefined,
    imageUrl: row.image_url || undefined,
    rsvpCount: 0,
    audience: row.audience as any || undefined,
    externalUrl: row.external_rsvp_url || undefined,
    status: row.status === "approved" ? "approved" : row.status === "pending_review" ? "pending" : "draft",
    verified: row.status === "approved",
    isDemoData: row.is_demo_data,
    submittedBy: row.submitted_by || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// -----------------------------------------------------------------------------
// SECURE ADMINISTRATIVE OPERATIONS
// -----------------------------------------------------------------------------

export async function getPendingEvents(userId: string, role: UserRole): Promise<CatholicEvent[]> {
  console.log(`[DEBUG - ADMIN QUEUE] User ID: ${userId}, Role: ${role}, Table: events, Filter: status='pending_review'`);
  try {
    if (role === "master_admin") {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("status", "pending_review")
        .order("created_at", { ascending: true });

      if (error) {
        console.error(`[DEBUG - ADMIN QUEUE ERROR] Code: ${error.code}, Message: ${error.message}`);
        throw error;
      }
      console.log(`[DEBUG - ADMIN QUEUE] Result Count: ${data?.length || 0}`);
      return (data || []).map(mapDbToEvent);
    } else if (role === "local_admin") {
      const { data: assignments, error: aErr } = await supabase
        .from("admin_district_assignments")
        .select("district_id")
        .eq("user_id", userId);

      if (aErr) {
        console.error(`[DEBUG - ADMIN QUEUE ERROR] Assignments fetch failed: ${aErr.message}`);
        throw aErr;
      }
      if (!assignments || assignments.length === 0) return [];

      const districtIds = assignments.map(a => a.district_id);
      
      const { data: events, error: eErr } = await supabase
        .from("events")
        .select("*")
        .eq("status", "pending_review")
        .in("district_id", districtIds)
        .order("created_at", { ascending: true });

      if (eErr) {
        console.error(`[DEBUG - ADMIN QUEUE ERROR] Code: ${eErr.code}, Message: ${eErr.message}`);
        throw eErr;
      }
      console.log(`[DEBUG - ADMIN QUEUE] Local Admin Result Count: ${events?.length || 0}`);
      return (events || []).map(mapDbToEvent);
    }
    return [];
  } catch (err: any) {
    console.error("[DEBUG - ADMIN QUEUE CATCH] Error fetching pending review events queue:", err);
    return [];
  }
}

export async function moderateCatholicEvent(
  eventId: string,
  action: "approve" | "reject" | "changes_requested",
  adminUid: string,
  note?: string
): Promise<void> {
  const statusMap: Record<typeof action, string> = {
    approve: "approved",
    reject: "rejected",
    changes_requested: "changes_requested"
  };

  const updatePayload: Record<string, any> = {
    status: statusMap[action],
    reviewed_by: adminUid,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (note !== undefined) {
    updatePayload.review_notes = note;
  }

  const { error } = await supabase
    .from("events")
    .update(updatePayload)
    .eq("id", eventId);

  if (error) {
    console.error("Error moderating Catholic event:", error);
    throw error;
  }

  // Hook to send confirmation email on successful approval
  if (action === "approve") {
    try {
      // 1. Fetch event metadata to get title and submitter uid
      const { data: eventData } = await supabase
        .from("events")
        .select("title, submitted_by")
        .eq("id", eventId)
        .single();

      if (eventData && eventData.submitted_by) {
        // 2. Fetch submitter's profile (email and display name)
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, display_name")
          .eq("id", eventData.submitted_by)
          .single();

        if (profile && profile.email) {
          console.log("\n========================================================");
          console.log("[EVENT APPROVED - EMAIL NOTIFICATION TRIGGER]");
          console.log(`Recipient: ${profile.email}`);
          console.log(`Event Title: "${eventData.title}"`);
          console.log(`Event ID: ${eventId}`);
          console.log("Tip: Setup a Supabase Database Webhook to automatically trigger Resend emails upon events.status='approved'!");
          console.log("========================================================\n");
        }
      }
    } catch (emailErr) {
      console.error("Failed to fetch submitter info and send approval email:", emailErr);
    }
  }
}

// -----------------------------------------------------------------------------
// DISTRICTS MANAGER (MASTER ADMIN ONLY)
// -----------------------------------------------------------------------------

export interface District {
  id: string;
  name: string;
  city?: string;
  state?: string;
  country: string;
  active: boolean;
}

export async function getDistricts(): Promise<District[]> {
  const { data, error } = await supabase
    .from("districts")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error reading districts:", error);
    return [];
  }
  return data || [];
}

export async function createDistrict(data: { name: string; city?: string; state?: string }): Promise<void> {
  const { error } = await supabase
    .from("districts")
    .insert({
      name: data.name,
      city: data.city || null,
      state: data.state || null
    });

  if (error) {
    console.error("Error creating district:", error);
    throw error;
  }
}

// -----------------------------------------------------------------------------
// LOCAL ADMIN ROLE & DISTRICT ASSIGNER (MASTER ADMIN ONLY)
// -----------------------------------------------------------------------------

export async function searchProfilesByEmail(email: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .ilike("email", `%${email.trim()}%`)
    .limit(10);

  if (error) {
    console.error("Error searching profiles by email:", error);
    return [];
  }
  
  // Fetch user_roles for each profile to show current status
  const profilesWithRoles = await Promise.all((data || []).map(async (profile: any) => {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", profile.id)
      .single();
    
    return {
      ...profile,
      role: roleData?.role || "user"
    };
  }));

  return profilesWithRoles;
}

export async function promoteUserRole(targetUserId: string, role: UserRole, assignedBy: string): Promise<void> {
  const { error } = await supabase
    .from("user_roles")
    .upsert({
      user_id: targetUserId,
      role: role,
      assigned_by: assignedBy,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error("Error updating user role:", error);
    throw error;
  }
}

export async function getDistrictAssignments(): Promise<any[]> {
  const { data, error } = await supabase
    .from("admin_district_assignments")
    .select("id, user_id, district_id, profiles(email, display_name), districts(name)");

  if (error) {
    console.error("Error fetching admin district assignments:", error);
    return [];
  }
  return data || [];
}

export async function assignAdminToDistrict(targetUserId: string, districtId: string, assignedBy: string): Promise<void> {
  const { error } = await supabase
    .from("admin_district_assignments")
    .insert({
      user_id: targetUserId,
      district_id: districtId,
      assigned_by: assignedBy
    });

  if (error) {
    console.error("Error assigning admin to district:", error);
    throw error;
  }
}

export async function revokeAdminDistrictAssignment(assignmentId: string): Promise<void> {
  const { error } = await supabase
    .from("admin_district_assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) {
    console.error("Error revoking admin district assignment:", error);
    throw error;
  }
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  try {
    const fileExt = file.name.split(".").pop();
    const filePath = `${userId}/avatar.${fileExt}`;

    // Upload file to 'avatars' bucket
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    // Update profile with new avatar URL
    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", userId);

    return publicUrl;
  } catch (error) {
    console.error("Error in uploadAvatar:", error);
    throw error;
  }
}

export async function deleteAvatar(userId: string, currentUrl: string): Promise<void> {
  try {
    if (!currentUrl) return;
    
    // Extract path from public URL
    const pathParts = currentUrl.split("/avatars/");
    if (pathParts.length < 2) return;
    const filePath = pathParts[1];

    const { error: deleteError } = await supabase.storage
      .from("avatars")
      .remove([filePath]);

    if (deleteError) throw deleteError;

    // Update profile
    await supabase
      .from("profiles")
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq("id", userId);
  } catch (error) {
    console.error("Error in deleteAvatar:", error);
    throw error;
  }
}

export async function uploadEventImage(eventId: string, file: File): Promise<string> {
  try {
    const fileExt = file.name.split(".").pop();
    const filePath = `events/${eventId}-${Date.now()}.${fileExt}`;

    // Upload file to 'avatars' bucket (under events/ subfolder)
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error("Error in uploadEventImage:", error);
    throw error;
  }
}

export async function updateEventImageUrl(eventId: string, imageUrl: string): Promise<void> {
  const { error } = await supabase
    .from("events")
    .update({ image_url: imageUrl })
    .eq("id", eventId);

  if (error) {
    console.error("Error in updateEventImageUrl:", error);
    throw error;
  }
}
