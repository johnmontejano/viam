import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  collection,
  query,
  where,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile, UserRole } from "@/types/user";

const USERS_COLLECTION = "users";

// Check if Firebase is actually configured with runtime keys
const isFirebaseConfigured = typeof window !== "undefined" && 
  !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "";

// Offline mock users catalog stored in LocalStorage
function getOfflineUsers(): UserProfile[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("viam_mock_users");
  if (stored) return JSON.parse(stored);
  
  // Seed with default simulation accounts so there's initial data
  const defaultSeeds: UserProfile[] = [
    {
      uid: "offline-masteradmin",
      displayName: "Master Admin (Offline)",
      email: "masteradmin@viam.com",
      role: "master_admin",
      savedMasses: [],
      savedEvents: [],
      rsvpEvents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      uid: "offline-localadmin",
      displayName: "Local Admin (Offline - CA)",
      email: "localadmin@viam.com",
      role: "local_admin",
      region: "CA",
      savedMasses: [],
      savedEvents: [],
      rsvpEvents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      uid: "offline-user",
      displayName: "Regular User (Offline)",
      email: "user@viam.com",
      role: "user",
      savedMasses: [],
      savedEvents: [],
      rsvpEvents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  localStorage.setItem("viam_mock_users", JSON.stringify(defaultSeeds));
  return defaultSeeds;
}

function saveOfflineUsers(users: UserProfile[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("viam_mock_users", JSON.stringify(users));
}

/** Map a Firestore document snapshot to a UserProfile. */
function mapDocToUserProfile(
  docSnap: import("firebase/firestore").DocumentSnapshot
): UserProfile | null {
  if (!docSnap.exists()) return null;
  const data = docSnap.data()!;
  return {
    uid: docSnap.id,
    displayName: data.displayName ?? "",
    email: data.email,
    phone: data.phone,
    role: data.role ?? "user",
    region: data.region,
    savedMasses: (data.savedMasses as string[]) ?? [],
    savedEvents: (data.savedEvents as string[]) ?? [],
    rsvpEvents: (data.rsvpEvents as string[]) ?? [],
    createdAt: data.createdAt?.toDate?.().toISOString() ?? data.createdAt ?? "",
    updatedAt: data.updatedAt?.toDate?.().toISOString() ?? data.updatedAt ?? "",
  };
}

/**
 * Create a new user profile. Uses setDoc with merge to avoid
 * overwriting an existing profile if one already exists.
 */
export async function createUserProfile(
  uid: string,
  data: { displayName: string; email?: string; phone?: string }
): Promise<void> {
  if (!isFirebaseConfigured) {
    // --- OFFLINE FALLBACK ---
    const users = getOfflineUsers();
    if (!users.some(u => u.uid === uid)) {
      const newUser: UserProfile = {
        uid,
        displayName: data.displayName,
        email: data.email,
        phone: data.phone,
        role: "user",
        savedMasses: [],
        savedEvents: [],
        rsvpEvents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      saveOfflineUsers([...users, newUser]);
    }
    return;
  }

  // --- ONLINE MODE ---
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await setDoc(
      userRef,
      {
        displayName: data.displayName,
        ...(data.email && { email: data.email }),
        ...(data.phone && { phone: data.phone }),
        role: "user",
        savedMasses: [],
        savedEvents: [],
        rsvpEvents: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
}

/**
 * Fetch a user profile by UID. Returns null if not found.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!isFirebaseConfigured) {
    // --- OFFLINE FALLBACK ---
    const users = getOfflineUsers();
    return users.find(u => u.uid === uid) || null;
  }

  // --- ONLINE MODE ---
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userRef);
    return mapDocToUserProfile(userSnap);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
}

/**
 * Update a user's role and optionally their region.
 * Authorization enforcement is handled by security rules.
 */
export async function updateUserRole(
  uid: string,
  role: UserRole,
  region?: string
): Promise<void> {
  if (!isFirebaseConfigured) {
    // --- OFFLINE FALLBACK ---
    const users = getOfflineUsers();
    const updated = users.map(u => {
      if (u.uid === uid) {
        return {
          ...u,
          role,
          region: region !== undefined ? region : u.region,
          updatedAt: new Date().toISOString()
        };
      }
      return u;
    });
    saveOfflineUsers(updated);
    return;
  }

  // --- ONLINE MODE ---
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const updateData: Record<string, unknown> = {
      role,
      updatedAt: serverTimestamp(),
    };
    if (region !== undefined) {
      updateData.region = region;
    }
    await updateDoc(userRef, updateData);
  } catch (error) {
    console.error("Error updating user role:", error);
    throw error;
  }
}

/**
 * Fetch all user profiles (limited to 200 documents).
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  if (!isFirebaseConfigured) {
    // --- OFFLINE FALLBACK ---
    return getOfflineUsers();
  }

  // --- ONLINE MODE ---
  try {
    const q = query(collection(db, USERS_COLLECTION), limit(200));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(mapDocToUserProfile)
      .filter((u): u is UserProfile => u !== null);
  } catch (error) {
    console.error("Error fetching all users:", error);
    throw error;
  }
}

/**
 * Fetch all admin users (master_admin and local_admin).
 */
export async function getAllAdmins(): Promise<UserProfile[]> {
  if (!isFirebaseConfigured) {
    // --- OFFLINE FALLBACK ---
    return getOfflineUsers().filter(u => u.role === "master_admin" || u.role === "local_admin");
  }

  // --- ONLINE MODE ---
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where("role", "in", ["master_admin", "local_admin"])
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(mapDocToUserProfile)
      .filter((u): u is UserProfile => u !== null);
  } catch (error) {
    console.error("Error fetching admins:", error);
    throw error;
  }
}

/**
 * Check whether a user holds the master_admin role.
 */
export async function checkIsMasterAdmin(uid: string): Promise<boolean> {
  if (!isFirebaseConfigured) {
    // --- OFFLINE FALLBACK ---
    const users = getOfflineUsers();
    const user = users.find(u => u.uid === uid);
    return user?.role === "master_admin";
  }

  // --- ONLINE MODE ---
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return false;
    return userSnap.data().role === "master_admin";
  } catch (error) {
    console.error("Error checking master admin status:", error);
    throw error;
  }
}

/**
 * Seed or promote a user to master_admin.
 * If the user doc doesn't exist, creates it with master_admin role.
 * If it exists but isn't master_admin, promotes the user.
 */
export async function seedMasterAdmin(
  uid: string,
  email?: string,
  phone?: string
): Promise<void> {
  if (!isFirebaseConfigured) {
    // --- OFFLINE FALLBACK ---
    const users = getOfflineUsers();
    const user = users.find(u => u.uid === uid);
    if (!user) {
      const newUser: UserProfile = {
        uid,
        displayName: "Master Admin (Offline)",
        email,
        phone,
        role: "master_admin",
        savedMasses: [],
        savedEvents: [],
        rsvpEvents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      saveOfflineUsers([...users, newUser]);
    } else if (user.role !== "master_admin") {
      const updated = users.map(u => u.uid === uid ? { ...u, role: "master_admin" as const, updatedAt: new Date().toISOString() } : u);
      saveOfflineUsers(updated);
    }
    return;
  }

  // --- ONLINE MODE ---
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        displayName: "Master Admin",
        ...(email && { email }),
        ...(phone && { phone }),
        role: "master_admin",
        savedMasses: [],
        savedEvents: [],
        rsvpEvents: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (userSnap.data().role !== "master_admin") {
      await updateDoc(userRef, {
        role: "master_admin",
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Error seeding master admin:", error);
    throw error;
  }
}
