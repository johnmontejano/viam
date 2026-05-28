export type EventCategory =
  | "Young Adult Social"
  | "Rosary"
  | "Dinner"
  | "Dancing"
  | "Hiking"
  | "Men's Group"
  | "Women's Group"
  | "Class / Formation"
  | "Latin Class"
  | "Philosophy / Theology"
  | "Feast Day"
  | "Procession"
  | "Conference"
  | "Fundraiser"
  | "Volunteer / Charity"
  | "Family Friendly"
  | "Other";

export interface CatholicEvent {
  id: string;
  title: string;
  description?: string;
  category: EventCategory;
  startDateTime: string;
  endDateTime?: string;
  locationName?: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  hostName?: string;
  hostType?: "parish" | "young_adult_group" | "organization" | "individual";
  relatedChurchId?: string;
  imageUrl?: string;
  rsvpCount?: number;
  audience?: "young_adults" | "men" | "women" | "families" | "everyone";
  externalUrl?: string;
  status: "draft" | "pending" | "approved";
  verified?: boolean;
  isDemoData?: boolean;
  submittedBy?: string;
  submitterDisplayName?: string;
  createdAt: string;
  updatedAt: string;
  distanceFromOrigin?: number;
  distanceFromRoute?: number;
  detourMinutes?: number;
  themeColor?: "burgundy" | "violet" | "emerald" | "amber" | "blue";
  vibes?: string[];
}

export interface AttendeeArchetype {
  id: string;
  name: string;
  emoji: string;
  description: string;
  colorClass: string;
}

export const ARCHETYPES: AttendeeArchetype[] = [
  { 
    id: "patristic", 
    name: "Patristic Scholar", 
    emoji: "📜", 
    description: "Loves theological discussions and church history", 
    colorClass: "text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/30" 
  },
  { 
    id: "chanter", 
    name: "Gregorian Chanter", 
    emoji: "🎶", 
    description: "Enjoys sacred music, chant, and polyphony", 
    colorClass: "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/30" 
  },
  { 
    id: "pilgrim", 
    name: "Pilgrim Hiker", 
    emoji: "🥾", 
    description: "Connects with God through outdoor treks and nature", 
    colorClass: "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/30" 
  },
  { 
    id: "contemplative", 
    name: "Desert Contemplative", 
    emoji: "🌵", 
    description: "Appreciates silence, meditation, and monastic wisdom", 
    colorClass: "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/30" 
  },
  { 
    id: "mariologist", 
    name: "Mariologist Devotee", 
    emoji: "🌹", 
    description: "Strong focus on Rosary and Marian devotion", 
    colorClass: "text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900/30" 
  },
  { 
    id: "architect", 
    name: "Gothic Architect", 
    emoji: "⛪", 
    description: "Captivated by sacred art, architecture, and beauty", 
    colorClass: "text-stone-700 dark:text-stone-300 bg-stone-50 dark:bg-stone-950/30 border-stone-200 dark:border-stone-900/30" 
  },
  { 
    id: "host", 
    name: "Fellowship Host", 
    emoji: "🍷", 
    description: "Fosters community with hospitality and cheer", 
    colorClass: "text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-900/30" 
  }
];
