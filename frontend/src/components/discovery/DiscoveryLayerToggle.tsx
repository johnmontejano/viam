import React from "react";
import { Sparkles, Calendar } from "lucide-react";

interface DiscoveryLayerToggleProps {
  activeLayer: "masses" | "events";
  onChange: (layer: "masses" | "events") => void;
  className?: string;
}

export function DiscoveryLayerToggle({ activeLayer, onChange, className = "" }: DiscoveryLayerToggleProps) {
  return (
    <div className={`flex bg-stone-100/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-stone-200 dark:border-white/5 p-1 rounded-full relative z-10 shadow-lg ${className}`}>
      <button 
        type="button"
        onClick={() => onChange("masses")}
        className={`px-5 py-2 text-sm rounded-full font-bold transition-all duration-300 flex items-center gap-2 ${
          activeLayer === "masses" 
            ? "bg-rose-900 text-white border border-rose-500/30 shadow-[0_0_20px_rgba(190,18,60,0.3)] scale-[1.02]" 
            : "text-stone-500 hover:text-stone-900 hover:bg-stone-250/40 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800/40"
        }`}
      >
        <Sparkles className="w-4 h-4 text-rose-450" /> Latin Masses
      </button>
      <button 
        type="button"
        onClick={() => onChange("events")}
        className={`px-5 py-2 text-sm rounded-full font-bold transition-all duration-300 flex items-center gap-2 ${
          activeLayer === "events" 
            ? "bg-rose-900 text-white border border-rose-500/30 shadow-[0_0_20px_rgba(190,18,60,0.3)] scale-[1.02]" 
            : "text-stone-500 hover:text-stone-900 hover:bg-stone-250/40 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800/40"
        }`}
      >
        <Calendar className="w-4 h-4 text-rose-450" /> Catholic Events
      </button>
    </div>
  );
}
