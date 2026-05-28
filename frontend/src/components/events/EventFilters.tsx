import React from "react";
import { EventCategory } from "@/types/event";
import { Check, Plus, Filter, Calendar, MapPin, Users, Award, X } from "lucide-react";

interface EventFiltersProps {
  activeCategories: EventCategory[];
  toggleCategory: (cat: EventCategory) => void;
  clearCategories: () => void;
  maxDistance: number;
  setMaxDistance: (dist: number) => void;
  activeAudience: string;
  setActiveAudience: (aud: string) => void;
  activeHostType: string;
  setActiveHostType: (host: string) => void;
  verifiedOnly: boolean;
  setVerifiedOnly: (verified: boolean) => void;
  dateFilter: "all" | "today" | "tomorrow" | "weekend" | "month";
  setDateFilter: (filter: "all" | "today" | "tomorrow" | "weekend" | "month") => void;
}

const CATEGORIES: EventCategory[] = [
  "Young Adult Social",
  "Rosary",
  "Dinner",
  "Dancing",
  "Hiking",
  "Men's Group",
  "Women's Group",
  "Class / Formation",
  "Latin Class",
  "Philosophy / Theology",
  "Feast Day",
  "Procession",
  "Conference",
  "Fundraiser",
  "Volunteer / Charity",
  "Family Friendly",
  "Other",
];

const DISTANCES = [5, 10, 25, 50, 100, 10000];
const AUDIENCES = ["any", "young_adults", "men", "women", "families", "everyone"];
const HOSTS = ["any", "parish", "young_adult_group", "organization", "individual"];
const DATES: Array<{ value: "all" | "today" | "tomorrow" | "weekend" | "month"; label: string }> = [
  { value: "all", label: "Any Date" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "weekend", label: "This Weekend" },
  { value: "month", label: "This Month" },
];

export function EventFilters({
  activeCategories,
  toggleCategory,
  clearCategories,
  maxDistance,
  setMaxDistance,
  activeAudience,
  setActiveAudience,
  activeHostType,
  setActiveHostType,
  verifiedOnly,
  setVerifiedOnly,
  dateFilter,
  setDateFilter,
}: EventFiltersProps) {
  return (
    <div className="flex flex-col gap-6 text-stone-900 dark:text-zinc-200">
      {/* Categories Filter */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-bold flex items-center gap-2">
            <Filter className="w-4 h-4 text-rose-500" /> Event Category
          </h4>
          {activeCategories.length > 0 && (
            <button
              onClick={clearCategories}
              className="text-[10px] text-rose-600 dark:text-rose-455 font-bold uppercase tracking-wider hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1.5 text-xs rounded-xl border transition-colors font-medium flex items-center gap-1.5 ${
                  isActive
                    ? "bg-rose-100 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/30 text-rose-700 dark:text-rose-300"
                    : "bg-stone-100 dark:bg-zinc-900 hover:bg-stone-200 dark:hover:bg-zinc-800 text-stone-600 dark:text-zinc-400 border-stone-200 dark:border-white/5 hover:text-stone-900 dark:hover:text-white"
                }`}
              >
                {isActive ? (
                  <Check className="w-3.5 h-3.5 text-rose-650 dark:text-rose-400" />
                ) : (
                  <Plus className="w-3.5 h-3.5 text-stone-400 dark:text-zinc-550" />
                )}
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Filter */}
      <div>
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-rose-500" /> Date
        </h4>
        <div className="flex flex-wrap gap-2">
          {DATES.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDateFilter(d.value)}
              className={`px-4 py-2 text-xs rounded-xl border transition-colors font-semibold ${
                dateFilter === d.value
                  ? "bg-rose-900 text-white border-rose-600/45 shadow-sm"
                  : "bg-stone-100 dark:bg-zinc-900 border-stone-200 dark:border-white/5 text-stone-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-800 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Distance Radius */}
      <div>
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-rose-500" /> Search Radius
        </h4>
        <div className="flex flex-wrap gap-2">
          {DISTANCES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setMaxDistance(d)}
              className={`px-4 py-2 text-xs rounded-xl border transition-colors font-semibold ${
                maxDistance === d
                  ? "bg-rose-900 text-white border-rose-600/45 shadow-sm"
                  : "bg-stone-100 dark:bg-zinc-900 border-stone-200 dark:border-white/5 text-stone-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-800 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              {d === 10000 ? "Any distance" : `${d} miles`}
            </button>
          ))}
        </div>
      </div>

      {/* Target Audience */}
      <div>
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-rose-500" /> Audience
        </h4>
        <div className="flex flex-wrap gap-2">
          {AUDIENCES.map((aud) => (
            <button
              key={aud}
              type="button"
              onClick={() => setActiveAudience(aud)}
              className={`px-4 py-2 text-xs rounded-xl border transition-colors font-semibold capitalize ${
                activeAudience === aud
                  ? "bg-rose-900 text-white border-rose-600/45 shadow-sm"
                  : "bg-stone-100 dark:bg-zinc-900 border-stone-200 dark:border-white/5 text-stone-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-800 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              {aud === "any" ? "Any Audience" : aud === "young_adults" ? "Young Adults" : aud}
            </button>
          ))}
        </div>
      </div>

      {/* Host Type */}
      <div>
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-rose-500" /> Host Type
        </h4>
        <div className="flex flex-wrap gap-2">
          {HOSTS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setActiveHostType(h)}
              className={`px-4 py-2 text-xs rounded-xl border transition-colors font-semibold capitalize ${
                activeHostType === h
                  ? "bg-rose-900 text-white border-rose-600/45 shadow-sm"
                  : "bg-stone-100 dark:bg-zinc-900 border-stone-200 dark:border-white/5 text-stone-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-800 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              {h === "any" ? "Any Host" : h.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Trust & Verification */}
      <div>
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-rose-500" /> Trust Status
        </h4>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setVerifiedOnly(!verifiedOnly)}
            className={`flex-1 py-2.5 text-xs rounded-xl border transition-colors font-semibold flex items-center justify-center gap-2 ${
              verifiedOnly
                ? "bg-rose-100 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/30 text-rose-700 dark:text-rose-300"
                : "bg-stone-100 dark:bg-zinc-900 hover:bg-stone-200 dark:hover:bg-zinc-800 text-stone-600 dark:text-zinc-400 border-stone-200 dark:border-white/5 hover:text-stone-900 dark:hover:text-white"
            }`}
          >
            {verifiedOnly && <Check className="w-4 h-4 text-rose-650" />}
            Verified Only
          </button>
        </div>
      </div>
    </div>
  );
}
