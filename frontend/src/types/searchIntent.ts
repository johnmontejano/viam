export type ChurchCategory = "FSSP" | "ICKSP" | "SSPX" | "Diocesan" | "Independent" | "Unknown";

export type DayOfWeek = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "today" | "tomorrow";

export interface ParsedSearchIntent {
  intent: "nearby_search" | "city_search" | "route_search" | "category_search" | "unknown";
  confidence: number;
  location?: string;
  origin?: string;
  destination?: string;
  useCurrentLocation?: boolean;
  categories?: ChurchCategory[];
  excludedCategories?: ChurchCategory[];
  day?: DayOfWeek;
  date?: string;
  timeWindow?: "early_morning" | "morning" | "midday" | "afternoon" | "evening" | "before_noon" | "after_noon" | "any";
  radiusMiles?: number;
  maxDistanceFromRouteMiles?: number;
  maxDetourMinutes?: number;
  sortPreference?: "closest" | "lowest_detour" | "soonest_mass" | "best_match";
  clarificationNeeded?: boolean;
  clarificationQuestion?: string;
  ambiguousLocation?: string;
  ambiguousOptions?: string[];
  displaySummary: string;
  locationCoords?: { lat: number; lon: number };
  originCoords?: { lat: number; lon: number };
  destinationCoords?: { lat: number; lon: number };
  discoveryLayer?: "masses" | "events";
  eventCategory?: string;
}
