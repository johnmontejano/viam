export type UserRole = "master_admin" | "local_admin" | "user";

export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string;
  phone?: string;
  role: UserRole;
  region?: string; // State code for local_admin scope (e.g., "CA")
  savedMasses: string[];
  savedEvents: string[];
  rsvpEvents: string[];
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAction {
  action: "approve" | "reject" | "request_clarification";
  eventId: string;
  adminUid: string;
  note?: string;
  timestamp: string;
}
