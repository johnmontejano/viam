import React from "react";
import { Calendar, Search } from "lucide-react";

interface EventEmptyStateProps {
  onClearFilters: () => void;
  onSubmitEventClick: () => void;
}

export function EventEmptyState({ onClearFilters, onSubmitEventClick }: EventEmptyStateProps) {
  return (
    <div className="text-center text-stone-500 dark:text-zinc-400 py-16 px-4 bg-stone-100 dark:bg-zinc-900/20 rounded-2xl border border-dashed border-stone-300 dark:border-zinc-800 shrink-0">
      <Calendar className="w-10 h-10 mx-auto text-rose-455/50 mb-3 animate-pulse" />
      <p className="font-semibold text-stone-850 dark:text-zinc-200">No Catholic events found</p>
      <p className="text-sm text-stone-500 dark:text-zinc-500 mt-1 max-w-xs mx-auto">
        Try broadening your search radius, modifying your filters, or be the first to submit a community event here!
      </p>
      <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
        <button
          onClick={onClearFilters}
          className="px-4 py-2 bg-stone-200 hover:bg-stone-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-stone-300 dark:border-white/5 rounded-full text-xs font-semibold transition-all text-stone-750 dark:text-zinc-300 shadow-sm"
        >
          Clear Filters
        </button>
        <button
          onClick={onSubmitEventClick}
          className="px-4 py-2 bg-rose-900 hover:bg-rose-800 border border-rose-500/20 text-white rounded-full text-xs font-bold transition-all shadow-[0_0_15px_rgba(190,18,60,0.15)]"
        >
          Submit Event
        </button>
      </div>
    </div>
  );
}
