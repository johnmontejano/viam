"use client";

import React from "react";
import { Church, Calendar } from "lucide-react";

interface DiscoveryLayerToggleProps {
  activeLayer: "masses" | "events";
  onChange: (layer: "masses" | "events") => void;
  className?: string;
}

export function DiscoveryLayerToggle({ activeLayer, onChange, className = "" }: DiscoveryLayerToggleProps) {
  return (
    <div className={`flex bg-card border border-border p-1 rounded-full relative z-10 shadow-card ${className}`}>
      <button 
        type="button"
        onClick={() => onChange("events")}
        className={`px-5 py-2.5 text-sm rounded-full font-semibold transition-all duration-200 flex items-center gap-2 ${
          activeLayer === "events" 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        <Calendar className="w-4 h-4" /> 
        <span>Events</span>
      </button>
      <button 
        type="button"
        onClick={() => onChange("masses")}
        className={`px-5 py-2.5 text-sm rounded-full font-semibold transition-all duration-200 flex items-center gap-2 ${
          activeLayer === "masses" 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        <Church className="w-4 h-4" /> 
        <span>Latin Masses</span>
      </button>
    </div>
  );
}
