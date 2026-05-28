import React, { useState } from "react";
import { CatholicEvent } from "@/types/event";
import { Calendar, MapPin, Share2, CornerUpRight, Plus, Check, Clock, User, Heart } from "lucide-react";
import { FallbackCover } from "./FallbackCover";

interface EventCardProps {
  event: CatholicEvent;
  isSaved: boolean;
  onToggleSave: (e: React.MouseEvent) => void;
  isRsvpd: boolean;
  onToggleRsvp: (e: React.MouseEvent) => void;
  onClick: () => void;
  onShowDetails?: () => void;
  isSelected: boolean;
  index: number;
}

export function EventCard({ event, isSaved, onToggleSave, isRsvpd, onToggleRsvp, onClick, onShowDetails, isSelected, index }: EventCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const delay = Math.min(index * 0.04, 0.4);

  // Format Date and Time
  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Google Calendar URL Generator
  const getGoogleCalendarUrl = (e: CatholicEvent) => {
    const start = new Date(e.startDateTime).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const end = e.endDateTime 
      ? new Date(e.endDateTime).toISOString().replace(/-|:|\.\d\d\d/g, "")
      : new Date(new Date(e.startDateTime).getTime() + 2 * 60 * 60 * 1000).toISOString().replace(/-|:|\.\d\d\d/g, "");
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title)}&dates=${start}/${end}&details=${encodeURIComponent(e.description || "")}&location=${encodeURIComponent((e.locationName ? e.locationName + ", " : "") + e.address + ", " + (e.city || ""))}`;
  };

  // Share Event Trigger
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: event.description,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${event.title} - ${formatDate(event.startDateTime)} at ${event.locationName || event.address}. Details inside Viam.`);
      alert("Event details copied to clipboard!");
    }
  };

  return (
    <div
      id={`event-card-${event.id}`}
      className={`rounded-2xl border cursor-pointer group relative shrink-0 card-animate overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isSelected
          ? "neural-glass-card-active border-rose-500/45 shadow-[0_0_30px_rgba(190,18,60,0.18)] scale-[1.015]"
          : "neural-glass-card border-stone-200 dark:border-white/5 shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.2)] hover:border-rose-500/30 hover:bg-stone-100 dark:hover:bg-zinc-900/60 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_12px_30px_rgba(0,0,0,0.4)] hover:scale-[1.01]"
      }`}
      style={{ animationDelay: `${delay}s` }}
      onClick={onClick}
    >
      <div className="w-full h-28 md:h-32 overflow-hidden bg-stone-100 dark:bg-zinc-950/40 border-b border-stone-200 dark:border-white/5 relative shrink-0">
        {event.imageUrl && !imageFailed ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            loading="lazy"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              if (img.src && !img.src.includes("api.codetabs.com")) {
                img.src = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(event.imageUrl!)}`;
              } else {
                setImageFailed(true);
              }
            }}
          />
        ) : (
          <FallbackCover category={event.category} title={event.title} themeColor={event.themeColor} />
        )}
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-lg leading-tight text-stone-900 dark:text-white group-hover:text-rose-900 dark:group-hover:text-rose-100 transition-colors duration-300">
              {event.title}
            </h3>
            <button
              onClick={onToggleSave}
              className={`shrink-0 p-1.5 rounded-full border transition-all duration-200 ${
                isSaved
                  ? "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800/35 hover:bg-rose-200 dark:hover:bg-rose-900/50 scale-110"
                  : "bg-stone-100 dark:bg-zinc-800/60 text-stone-500 dark:text-zinc-400 border-stone-200 dark:border-white/5 hover:bg-stone-200 dark:hover:bg-zinc-700/60 hover:text-stone-750"
              }`}
              title={isSaved ? "Saved" : "Save Event"}
            >
              <Heart className={`w-4 h-4 ${isSaved ? "fill-rose-600 dark:fill-rose-500" : ""}`} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-[9px] uppercase tracking-wider bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/30 px-2 py-0.5 rounded-md font-bold">
              {event.category}
            </span>
            {event.verified && (
              <span className="text-[9px] uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 px-2 py-0.5 rounded-md font-bold">
                Verified
              </span>
            )}
            {event.audience && event.audience !== "everyone" && (
              <span className="text-[9px] uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800/60 text-zinc-650 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/30 px-2 py-0.5 rounded-md font-bold">
                {event.audience === "young_adults" ? "Young Adults" : event.audience}
              </span>
            )}
          </div>

          <div className="mt-3.5 bg-stone-50 dark:bg-zinc-950/40 border border-stone-200 dark:border-white/5 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-stone-700 dark:text-zinc-200">
              <Calendar className="w-4 h-4 text-rose-600 dark:text-rose-450 shrink-0" />
              <span>
                {formatDate(event.startDateTime)} at {formatTime(event.startDateTime)}
              </span>
            </div>
            {event.locationName && (
              <div className="flex items-start gap-2.5 text-xs text-stone-600 dark:text-zinc-300">
                <User className="w-4 h-4 text-rose-600 dark:text-rose-450 shrink-0 mt-0.5" />
                <span className="line-clamp-1">{event.hostName || "Community Host"}</span>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-start gap-1.5 text-stone-500 dark:text-zinc-400">
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-stone-400 dark:text-zinc-500" />
            <span className="text-xs leading-snug">
              {event.locationName ? `${event.locationName}, ` : ""}{event.city || event.address}
            </span>
          </div>
        </div>

        {/* Action Button Row */}
        <div className="pt-2 border-t border-stone-100 dark:border-white/5 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleRsvp(e);
            }}
            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl border transition-all duration-350 flex items-center justify-center gap-1 active:scale-[0.98] ${
              isRsvpd
                ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/35 hover:bg-rose-200 dark:hover:bg-rose-900/50"
                : "bg-rose-900 hover:bg-rose-800 text-white border-rose-800/20 shadow-sm hover:shadow"
            }`}
          >
            {isRsvpd ? "RSVP'd" : "RSVP"}
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onShowDetails) {
                onShowDetails();
              } else {
                onClick();
              }
            }}
            className="py-1.5 px-3 bg-stone-100 hover:bg-stone-200 dark:bg-zinc-900/60 dark:hover:bg-zinc-800/80 border border-stone-200 dark:border-white/5 hover:border-rose-450 dark:hover:border-rose-900/30 text-stone-750 dark:text-zinc-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1"
          >
            Details
          </button>
          
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((event.locationName ? event.locationName + ", " : "") + event.address + ", " + (event.city || ""))}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 bg-stone-100 dark:bg-zinc-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-stone-500 dark:text-zinc-400 hover:text-rose-600 border border-stone-200 dark:border-white/5 rounded-xl transition-all"
            title="Directions"
          >
            <CornerUpRight className="w-4 h-4" />
          </a>

          <a
            href={getGoogleCalendarUrl(event)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 bg-stone-100 dark:bg-zinc-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-stone-500 dark:text-zinc-400 hover:text-rose-600 border border-stone-200 dark:border-white/5 rounded-xl transition-all"
            title="Add to Calendar"
          >
            <Calendar className="w-4 h-4" />
          </a>

          <button
            onClick={handleShare}
            className="p-1.5 bg-stone-100 dark:bg-zinc-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-stone-500 dark:text-zinc-400 hover:text-rose-600 border border-stone-200 dark:border-white/5 rounded-xl transition-all"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
