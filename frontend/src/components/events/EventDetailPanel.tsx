import React, { useState } from "react";
import { CatholicEvent } from "@/types/event";
import { X, Calendar, MapPin, Share2, CornerUpRight, Heart, ExternalLink, ShieldCheck, Flag, Users, Clock, AlertTriangle } from "lucide-react";
import { FallbackCover } from "./FallbackCover";

interface EventDetailPanelProps {
  event: CatholicEvent;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
  isRsvpd: boolean;
  onToggleRsvp: () => void;
  onShowDetails?: () => void;
  isMobile?: boolean;
  isPopup?: boolean;
}

export function EventDetailPanel({ 
  event, 
  onClose, 
  isSaved, 
  onToggleSave, 
  isRsvpd,
  onToggleRsvp,
  onShowDetails,
  isMobile = false,
  isPopup = false
}: EventDetailPanelProps) {
  const [imageFailed, setImageFailed] = useState(false);

  // Load RSVPs for this specific event from localStorage
  const getEventRsvps = () => {
    if (typeof window === "undefined") return [];
    const registryKey = `viam_event_rsvps_${event.id}`;
    const storedRegistry = localStorage.getItem(registryKey);
    let rsvps = storedRegistry ? JSON.parse(storedRegistry) : [];
    
    if (rsvps.length === 0) {
      const mockNames = [
        { name: "John Montejano", status: "yes", guests: 2 },
        { name: "Jessica Clara", status: "yes", guests: 1 },
        { name: "Blake Anthony", status: "maybe", guests: 0 },
        { name: "Sophia Marie", status: "yes", guests: 0 },
        { name: "Matthew Paul", status: "yes", guests: 1 },
        { name: "Clara Bernadette", status: "maybe", guests: 0 }
      ];
      const seedCount = (event.title.charCodeAt(0) % 4) + 3;
      const seeded = mockNames.slice(0, seedCount).map((m, idx) => ({
        id: `mock-${idx}`,
        name: m.name,
        status: m.status as "yes" | "maybe",
        guests: m.guests,
        email: `${m.name.toLowerCase().replace(" ", "")}@viam.com`,
        updatedAt: new Date(Date.now() - idx * 4 * 60 * 60 * 1000).toISOString()
      }));
      localStorage.setItem(registryKey, JSON.stringify(seeded));
      rsvps = seeded;
    }
    return rsvps;
  };

  const rsvps = getEventRsvps();
  const goingCount = rsvps.filter((r: any) => r.status === "yes").reduce((acc: number, curr: any) => acc + 1 + curr.guests, 0);
  const maybeCount = rsvps.filter((r: any) => r.status === "maybe").reduce((acc: number, curr: any) => acc + 1 + curr.guests, 0);
  
  const formatDateFull = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
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

  const getGoogleCalendarUrl = (e: CatholicEvent) => {
    const start = new Date(e.startDateTime).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const end = e.endDateTime 
      ? new Date(e.endDateTime).toISOString().replace(/-|:|\.\d\d\d/g, "")
      : new Date(new Date(e.startDateTime).getTime() + 2 * 60 * 60 * 1000).toISOString().replace(/-|:|\.\d\d\d/g, "");
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title)}&dates=${start}/${end}&details=${encodeURIComponent(e.description || "")}&location=${encodeURIComponent((e.locationName ? e.locationName + ", " : "") + e.address + ", " + (e.city || ""))}`;
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: event.description,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${event.title} - ${formatDateFull(event.startDateTime)} at ${event.locationName || event.address}. Info in Viam.`);
      alert("Event details copied to clipboard!");
    }
  };

  const handleReport = () => {
    const reason = prompt("Why are you reporting this event?\n(e.g., Inappropriate content, cancelled event, inaccurate details)");
    if (reason) {
      alert("Thank you. Our moderators will review this submission.");
    }
  };

  if (isPopup) {
    return (
      <div onClick={(e) => e.stopPropagation()} className="w-[285px] flex flex-col p-4 text-stone-900 dark:text-zinc-200">
        <div className="w-full h-24 mb-3 overflow-hidden rounded-xl bg-stone-100 dark:bg-zinc-950/40 border border-stone-200 dark:border-white/5 relative shadow-sm shrink-0">
          {event.imageUrl && !imageFailed ? (
            <img 
              src={event.imageUrl} 
              alt={event.title} 
              className="w-full h-full object-cover" 
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
            <FallbackCover category={event.category} title={event.title} isPopup={true} />
          )}
        </div>
        
        <div className="flex flex-col gap-1">
          <h3 className="font-extrabold leading-tight text-sm text-stone-900 dark:text-white line-clamp-1">{event.title}</h3>
          <span className="text-[9px] uppercase tracking-wider text-rose-700 dark:text-rose-350 font-bold self-start mt-0.5">
            {event.category}
          </span>
        </div>

        <div className="flex flex-col gap-2 mt-3 text-left">
          {/* Simple Date Row */}
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-750 dark:text-zinc-300">
            <Calendar className="w-4 h-4 text-rose-600 dark:text-rose-455 shrink-0" />
            <span className="truncate">{formatDateFull(event.startDateTime).split(',')[1]?.trim() || formatDateFull(event.startDateTime)} at {formatTime(event.startDateTime)}</span>
          </div>

          {/* Simple Venue Row */}
          <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-zinc-400 font-medium">
            <MapPin className="w-4 h-4 text-stone-400 shrink-0" />
            <span className="truncate">{event.locationName || event.address}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => {
              if (onShowDetails) {
                onShowDetails();
              } else if (typeof window !== "undefined") {
                // Smooth scroll list to highlight this event card in the left sidebar panel
                const sidebarCard = document.getElementById(`event-card-${event.id}`);
                if (sidebarCard) {
                  sidebarCard.scrollIntoView({ behavior: "smooth", block: "center" });
                  sidebarCard.click();
                } else {
                  alert(`${event.title}\n\n${event.description || "No description provided."}`);
                }
              }
            }}
            className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-200 dark:border-white/5 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-stone-700 dark:text-zinc-300 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-98"
          >
            Details
          </button>
          
          <button
            onClick={onToggleRsvp}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all border shadow-sm active:scale-98 ${
              isRsvpd
                ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-350 border-rose-200 dark:border-rose-900/35 hover:bg-rose-200"
                : "bg-rose-900 hover:bg-rose-800 text-white border-rose-800/20"
            }`}
          >
            {isRsvpd ? "RSVP'd" : "RSVP"}
          </button>
        </div>
      </div>
    );
  }

  const panelContent = (
    <div className={`flex flex-col h-full ${isMobile ? "w-full" : "w-[300px]"}`}>
      <div className="w-full h-40 mb-4 overflow-hidden rounded-2xl bg-stone-100 dark:bg-zinc-950/40 border border-stone-200 dark:border-white/5 relative shadow-sm shrink-0">
        {event.imageUrl && !imageFailed ? (
          <img 
            src={event.imageUrl} 
            alt={event.title} 
            className="w-full h-full object-cover" 
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
          <FallbackCover category={event.category} title={event.title} />
        )}
      </div>

      <div className="flex items-start justify-between gap-2.5">
        <h3 className="font-bold leading-tight text-xl text-stone-900 dark:text-white">{event.title}</h3>
        {isMobile && (
          <button 
            onClick={onClose} 
            className="p-1.5 bg-stone-100 dark:bg-zinc-900/80 hover:bg-stone-200 dark:hover:bg-zinc-800 rounded-full text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white transition-colors shrink-0 border border-stone-200 dark:border-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-2 mb-4">
        <span className="text-[10px] uppercase tracking-wider bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/30 px-2 py-0.5 rounded-md font-bold">
          {event.category}
        </span>
        {event.verified && (
          <span className="text-[10px] uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-450" />
            Verified
          </span>
        )}
        {event.audience && (
          <span className="text-[10px] uppercase tracking-wider bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 border border-stone-200 dark:border-zinc-700/30 px-2 py-0.5 rounded-md font-bold">
            Audience: {event.audience === "young_adults" ? "Young Adults" : event.audience}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 text-left">
        {/* Date & Time block */}
        <div className="bg-stone-100/80 dark:bg-zinc-950/40 border border-stone-200 dark:border-white/5 rounded-xl p-3 flex gap-2.5">
          <Calendar className="w-4.5 h-4.5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-stone-500 dark:text-zinc-500 uppercase tracking-wider">Date & Time</span>
            <span className="text-xs font-semibold text-stone-800 dark:text-zinc-200 mt-0.5">{formatDateFull(event.startDateTime)}</span>
            <span className="text-xs text-stone-600 dark:text-zinc-400 font-medium mt-0.5">{formatTime(event.startDateTime)}{event.endDateTime ? ` - ${formatTime(event.endDateTime)}` : ""}</span>
          </div>
        </div>

        {/* Location & Directions block */}
        <a 
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((event.locationName ? event.locationName + ", " : "") + event.address + ", " + (event.city || ""))}`}
          target="_blank" 
          rel="noreferrer" 
          className="group/address flex items-start gap-2.5 bg-stone-100/80 dark:bg-zinc-950/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 p-2.5 rounded-xl border border-stone-200 dark:border-white/5 hover:border-rose-300 dark:hover:border-rose-900/35 transition-all duration-300 w-full"
        >
          <div className="bg-stone-200 dark:bg-zinc-900/80 p-2 rounded-lg border border-stone-300 dark:border-white/5 shrink-0 text-rose-600 dark:text-rose-400 group-hover/address:bg-rose-900 group-hover/address:text-white transition-colors duration-300">
            <CornerUpRight className="w-4 h-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-bold text-stone-500 dark:text-zinc-500 uppercase tracking-wider">Directions</span>
            <span className="text-xs text-stone-750 dark:text-zinc-350 group-hover/address:text-rose-700 dark:group-hover/address:text-rose-100 font-semibold mt-0.5 leading-snug">{event.locationName || "Event Location"}</span>
            <span className="text-[11px] text-stone-550 dark:text-zinc-400 leading-snug mt-0.5">{event.address}, {event.city}</span>
          </div>
        </a>

        {/* Host Details */}
        <div className="bg-stone-100/80 dark:bg-zinc-950/40 border border-stone-200 dark:border-white/5 rounded-xl p-3 flex gap-2.5">
          <Users className="w-4.5 h-4.5 text-rose-600 dark:text-rose-455 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-stone-500 dark:text-zinc-500 uppercase tracking-wider">Hosted By</span>
            <span className="text-xs font-semibold text-stone-800 dark:text-zinc-200 mt-0.5">{event.hostName || "Parish Community"}</span>
            <span className="text-[10px] text-stone-500 dark:text-zinc-400 uppercase tracking-wider mt-0.5">Type: {event.hostType || "Parish"}</span>
          </div>
        </div>

        {/* Description Block */}
        {event.description && (
          <div className="bg-stone-100/80 dark:bg-zinc-950/40 border border-stone-200 dark:border-white/5 rounded-xl p-3 flex flex-col text-left">
            <span className="text-[9px] font-bold text-stone-500 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Description</span>
            <p className="text-xs text-stone-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line font-medium max-h-36 overflow-y-auto custom-scrollbar">
              {event.description}
            </p>
          </div>
        )}

        {/* RSVP System */}
        <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200/50 dark:border-rose-900/25 rounded-xl p-3 text-center shrink-0">
          <div className="flex items-center justify-center gap-1.5 text-xs text-rose-800 dark:text-rose-200 font-bold">
            <Users className="w-3.5 h-3.5 text-rose-600 dark:text-rose-455" />
            <span>{goingCount} Catholics planning to attend</span>
          </div>
          <button 
            onClick={onToggleRsvp}
            className={`mt-2 w-full py-1.5 text-xs font-bold rounded-lg transition-all duration-350 border ${
              isRsvpd
                ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-350 border-rose-200 dark:border-rose-900/35 hover:bg-rose-200 dark:hover:bg-rose-900/40 shadow-sm"
                : "bg-rose-900 hover:bg-rose-800 text-white border-rose-800/20 shadow-md hover:shadow-lg active:scale-98"
            }`}
          >
            {isRsvpd ? "Cancel RSVP" : "RSVP to Event"}
          </button>

          {/* Interactive Guest Registry (Partiful-style) */}
          <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-rose-200/40 dark:border-rose-900/25 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800 dark:text-rose-300">Guest Registry</span>
              <span className="text-[9px] font-bold text-stone-500 dark:text-zinc-400">{goingCount} Going • {maybeCount} Maybe</span>
            </div>
            
            <div className="flex flex-wrap gap-1.5 mt-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-0.5">
              {rsvps.map((rsvp: any) => {
                const initials = rsvp.name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);
                
                return (
                  <div 
                    key={rsvp.id} 
                    className="flex items-center gap-1.5 bg-white dark:bg-zinc-900/90 border border-stone-200 dark:border-white/5 py-1 px-2.5 rounded-full text-[10px] font-semibold transition-all hover:scale-102 hover:shadow-sm"
                    title={`${rsvp.name} (${rsvp.status === "yes" ? "Going" : "Maybe"})`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white shrink-0 ${
                      rsvp.status === "yes" 
                        ? "bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
                        : "bg-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                    }`}>
                      {initials || "JM"}
                    </div>
                    <span className="text-stone-700 dark:text-zinc-300 truncate max-w-[80px] font-bold">
                      {rsvp.name.split(" ")[0]}
                    </span>
                    {rsvp.guests > 0 && (
                      <span className="bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-350 px-1 py-0.2 rounded-full text-[8px] font-black">
                        +{rsvp.guests}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Button Drawer Actions */}
      <div className="flex flex-col gap-2 pt-4 border-t border-stone-200 dark:border-white/5 mt-4">
        <div className="flex gap-2">
          <button 
            onClick={onToggleSave}
            className={`flex-1 text-xs py-2.5 rounded-xl font-bold transition-all duration-350 flex items-center justify-center gap-1.5 shadow-md border ${
              isSaved 
                ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/35 hover:bg-rose-200 dark:hover:bg-rose-900/40" 
                : "bg-stone-100 dark:bg-zinc-800/80 text-stone-700 dark:text-zinc-200 border-stone-200 dark:border-white/5 hover:bg-stone-200 dark:hover:bg-zinc-700/80"
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isSaved ? "fill-rose-600 dark:fill-rose-500" : ""}`} />
            {isSaved ? "Saved" : "Save Event"}
          </button>
          
          <a 
            href={getGoogleCalendarUrl(event)}
            target="_blank" 
            rel="noreferrer" 
            className="flex-1 text-center bg-rose-900 hover:bg-rose-800 text-white shadow-[0_4px_14px_rgba(190,18,60,0.25)] text-xs py-2.5 rounded-xl font-bold transition-all duration-350 flex items-center justify-center gap-1.5 border border-rose-800/20"
          >
            Add Calendar
          </a>
        </div>

        <div className="flex gap-2 w-full mt-1">
          {event.externalUrl && (
            <a 
              href={event.externalUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="flex-1 py-2 border border-stone-250 dark:border-white/10 text-stone-700 dark:text-zinc-300 hover:text-rose-700 hover:border-rose-300 dark:hover:text-white dark:hover:border-white/20 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1"
            >
              Event Website <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button 
            onClick={handleShare}
            className="flex-1 py-2 border border-stone-250 dark:border-white/10 text-stone-700 dark:text-zinc-300 hover:text-rose-700 hover:border-rose-300 dark:hover:text-white dark:hover:border-white/20 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1"
          >
            Share Event <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <button 
          onClick={handleReport}
          className="mt-2 text-stone-400 hover:text-amber-600 dark:text-zinc-600 dark:hover:text-amber-500 text-[10px] uppercase font-bold tracking-wider flex items-center justify-center gap-1 py-1"
        >
          <Flag className="w-3 h-3" /> Report Event
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return panelContent;
  }

  return (
    <div onClick={(e) => e.stopPropagation()} className="w-[300px] flex flex-col h-full bg-transparent p-5 text-stone-900 dark:text-zinc-200">
      {panelContent}
    </div>
  );
}
