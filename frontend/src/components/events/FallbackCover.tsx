import React from "react";
import { EventCategory } from "@/types/event";

interface FallbackCoverProps {
  category: EventCategory;
  title: string;
  className?: string;
  isPopup?: boolean;
  themeColor?: "burgundy" | "violet" | "emerald" | "amber" | "blue";
}

export function FallbackCover({ category, title, className = "", isPopup = false, themeColor }: FallbackCoverProps) {
  // Return deterministic visual styling based on the event category or custom theme color
  const getTheme = (cat: EventCategory, customColor?: typeof themeColor) => {
    const effectiveColor = customColor || (
      cat === "Rosary" || cat === "Feast Day" || cat === "Procession" ? "burgundy" :
      cat === "Philosophy / Theology" || cat === "Class / Formation" || cat === "Latin Class" ? "violet" :
      cat === "Hiking" || cat === "Volunteer / Charity" || cat === "Family Friendly" ? "emerald" :
      cat === "Other" ? "blue" : "amber"
    );

    switch (effectiveColor) {
      case "burgundy":
        return {
          bg: "bg-gradient-to-br from-zinc-950 via-rose-950/70 to-stone-950",
          accentColor: "text-rose-400/30",
          liturgicalLabel: "Sacred Event",
          icon: (
            <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Elegant Gothic Cross */}
              <path d="M50 15V85M30 35H70" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {/* Halo / Aura */}
              <circle cx="50" cy="35" r="12" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="animate-spin-slow" />
              {/* Gothic Vault Arches in background */}
              <path d="M20 90C20 60 35 45 50 45C65 45 80 60 80 90" stroke="currentColor" strokeWidth="0.75" opacity="0.3" />
            </svg>
          )
        };
      case "violet":
        return {
          bg: "bg-gradient-to-br from-zinc-950 via-indigo-950/70 to-stone-950",
          accentColor: "text-indigo-400/30",
          liturgicalLabel: "Formation",
          icon: (
            <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Open parchment manuscript book */}
              <path d="M50 75C42 70 30 70 20 73V33C30 30 42 30 50 35M50 75C58 70 70 70 80 73V33C70 30 58 30 50 35M50 75V35" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              {/* Candle flame of truth */}
              <path d="M50 18C50 18 47 23 47 25C47 26.6569 48.3431 28 50 28C51.6569 28 53 26.6569 53 25C53 23 50 18 50 18Z" fill="currentColor" opacity="0.6" />
              <circle cx="50" cy="25" r="8" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
            </svg>
          )
        };
      case "emerald":
        return {
          bg: "bg-gradient-to-br from-zinc-950 via-emerald-950/70 to-stone-950",
          accentColor: "text-emerald-400/30",
          liturgicalLabel: "Creation & Service",
          icon: (
            <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Minimal mountain peaks (Creation) */}
              <path d="M15 80L38 48L55 68L72 40L88 80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {/* Glowing Chi-Rho Sun */}
              <circle cx="50" cy="28" r="8" stroke="currentColor" strokeWidth="1.5" />
              <path d="M50 20V36M46 24H54" stroke="currentColor" strokeWidth="1" />
              {/* Subtle forest arches */}
              <path d="M10 80H90" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            </svg>
          )
        };
      case "blue":
        return {
          bg: "bg-gradient-to-br from-zinc-950 via-sky-950/70 to-stone-950",
          accentColor: "text-sky-400/30",
          liturgicalLabel: "Sacrament & Devotion",
          icon: (
            <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Glowing Monstrance Silhouette */}
              <circle cx="50" cy="40" r="14" stroke="currentColor" strokeWidth="2" />
              <circle cx="50" cy="40" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M50 54V75M38 75H62" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              {/* Rays */}
              <path d="M50 20V24M50 56V60M30 40H34M66 40H70M36 26L39 29M64 54L61 51M36 54L39 51M64 26L61 29" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            </svg>
          )
        };
      case "amber":
      default:
        return {
          bg: "bg-gradient-to-br from-zinc-950 via-amber-950/75 to-stone-950",
          accentColor: "text-amber-400/25",
          liturgicalLabel: "Fellowship",
          icon: (
            <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Elegant Gothic Vault & Arched Windows (Fellowship Hall/Cathedral) */}
              <path d="M25 85V45C25 31.1929 36.1929 20 50 20C63.8071 20 75 31.1929 75 45V85" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M35 85V55C35 46.7157 41.7157 40 50 40C58.2843 40 65 46.7157 65 55V85" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              {/* Eucharist / Rose window mandala */}
              <circle cx="50" cy="45" r="7" stroke="currentColor" strokeWidth="1" />
              <circle cx="50" cy="45" r="14" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
              <path d="M10 85H90" stroke="currentColor" strokeWidth="1" />
            </svg>
          )
        };
    }
  };

  const theme = getTheme(category, themeColor);

  return (
    <div
      className={`relative w-full h-full overflow-hidden flex flex-col justify-between p-4 select-none ${theme.bg} ${className}`}
    >
      {/* Intricate Geometric Parchment Pattern Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.02)_0%,rgba(0,0,0,0)_80%)] mix-blend-overlay pointer-events-none" />
      
      {/* Breathtaking Glowing Sacred Icon (Liturgical Motif) */}
      <div className={`absolute right-4 bottom-2 top-2 aspect-square pointer-events-none max-h-[85%] transition-all duration-700 ease-out group-hover:scale-105 group-hover:rotate-1 ${theme.accentColor} ${isPopup ? "w-16 right-2 bottom-1" : "w-28 opacity-90"}`}>
        {theme.icon}
      </div>

      {/* Liturgical category header label */}
      <div className="z-10 flex items-center justify-between">
        <span className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-white/50 bg-black/35 backdrop-blur-md px-2 py-0.5 rounded border border-white/5">
          {category}
        </span>
        <span className="text-[8px] font-bold uppercase tracking-wider text-amber-250/40">
          {theme.liturgicalLabel}
        </span>
      </div>

      {/* Modern, bold typography displaying a premium layout for the cover area */}
      <div className="z-10 max-w-[65%] mt-auto text-left">
        <h4 className={`font-serif tracking-tight text-white line-clamp-2 leading-tight ${isPopup ? "text-[11px] font-medium opacity-85" : "text-sm md:text-base font-semibold"}`}>
          {title}
        </h4>
        <span className="text-[8px] font-semibold text-rose-400/60 uppercase tracking-[0.15em] block mt-1">
          Viam Event
        </span>
      </div>
    </div>
  );
}
