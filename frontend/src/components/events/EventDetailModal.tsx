import React, { useState, useEffect } from "react";
import { X, Calendar, MapPin, Share2, CornerUpRight, Heart, ExternalLink, ShieldCheck, Flag, Users, Clock, Flame, User, Sparkles } from "lucide-react";
import { CatholicEvent, ARCHETYPES } from "@/types/event";
import { FallbackCover } from "./FallbackCover";

interface EventDetailModalProps {
  event: CatholicEvent;
  isOpen: boolean;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
  isRsvpd: boolean;
  onToggleRsvp: () => void;
}

export function EventDetailModal({
  event,
  isOpen,
  onClose,
  isSaved,
  onToggleSave,
  isRsvpd,
  onToggleRsvp,
}: EventDetailModalProps) {
  const [imageFailed, setImageFailed] = useState(false);

  // Auto-reset image failed state when switching events
  useEffect(() => {
    setImageFailed(false);
  }, [event.id]);

  // Keydown Escape handler for closing the modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        console.log("Event Detail Modal Escape key close event triggered");
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Lock background body scroll when modal is open to prevent double scroll jumpiness
  useEffect(() => {
    if (isOpen && typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = "unset";
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Load RSVPs for this specific event from localStorage
  const getEventRsvps = () => {
    if (typeof window === "undefined") return [];
    const registryKey = `viam_event_rsvps_${event.id}`;
    const storedRegistry = localStorage.getItem(registryKey);
    let rsvps = storedRegistry ? JSON.parse(storedRegistry) : [];

    return rsvps;
  };

  const rsvps = getEventRsvps();
  const goingRegistry = rsvps.filter((r: any) => r.status === "yes");
  const maybeRegistry = rsvps.filter((r: any) => r.status === "maybe");

  const totalGoing = goingRegistry.reduce((acc: number, curr: any) => acc + 1 + curr.guests, 0);
  const totalMaybe = maybeRegistry.reduce((acc: number, curr: any) => acc + 1 + curr.guests, 0);
  const totalResponses = totalGoing + totalMaybe;

  const goingPct = totalResponses > 0 ? (totalGoing / totalResponses) * 100 : 100;
  const maybePct = totalResponses > 0 ? (totalMaybe / totalResponses) * 100 : 0;

  // Format Date and Time
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

  // Liturgical theme definitions matching Partiful colors with warm, masculine tones
  const getThemeStyles = (color?: typeof event.themeColor) => {
    const activeColor = color || (
      event.category === "Rosary" || event.category === "Feast Day" || event.category === "Procession" ? "burgundy" :
      event.category === "Philosophy / Theology" || event.category === "Class / Formation" || event.category === "Latin Class" ? "violet" :
      event.category === "Hiking" || event.category === "Volunteer / Charity" || event.category === "Family Friendly" ? "emerald" :
      event.category === "Other" ? "blue" : "amber"
    );

    switch (activeColor) {
      case "burgundy":
        return {
          primaryColor: "#7a1c31",
          hoverColor: "#5f1323",
          glow: "from-[#7a1c31]/15 via-transparent to-transparent",
          textAccent: "text-[#7a1c31] dark:text-[#f472b6]",
          borderAccent: "border-[#7a1c31]/20 dark:border-[#f472b6]/20",
          lightBg: "bg-[#7a1c31]/5 dark:bg-[#f472b6]/5",
          liturgicalColorName: "Sacred Red",
          accentRing: "ring-[#7a1c31]/10",
          badgeBg: "bg-[#7a1c31]/10 text-[#7a1c31] dark:bg-[#f472b6]/10 dark:text-[#f472b6]"
        };
      case "violet":
        return {
          primaryColor: "#4d2873",
          hoverColor: "#391b59",
          glow: "from-[#4d2873]/15 via-transparent to-transparent",
          textAccent: "text-[#4d2873] dark:text-[#c084fc]",
          borderAccent: "border-[#4d2873]/20 dark:border-[#c084fc]/20",
          lightBg: "bg-[#4d2873]/5 dark:bg-[#c084fc]/5",
          liturgicalColorName: "Academic Violet",
          accentRing: "ring-[#4d2873]/10",
          badgeBg: "bg-[#4d2873]/10 text-[#4d2873] dark:bg-[#c084fc]/10 dark:text-[#c084fc]"
        };
      case "emerald":
        return {
          primaryColor: "#135c44",
          hoverColor: "#0c402f",
          glow: "from-[#135c44]/15 via-transparent to-transparent",
          textAccent: "text-[#135c44] dark:text-[#34d399]",
          borderAccent: "border-[#135c44]/20 dark:border-[#34d399]/20",
          lightBg: "bg-[#135c44]/5 dark:bg-[#34d399]/5",
          liturgicalColorName: "Creation Teal",
          accentRing: "ring-[#135c44]/10",
          badgeBg: "bg-[#135c44]/10 text-[#135c44] dark:bg-[#34d399]/10 dark:text-[#34d399]"
        };
      case "blue":
        return {
          primaryColor: "#1b4373",
          hoverColor: "#112f54",
          glow: "from-[#1b4373]/15 via-transparent to-transparent",
          textAccent: "text-[#1b4373] dark:text-[#60a5fa]",
          borderAccent: "border-[#1b4373]/20 dark:border-[#60a5fa]/20",
          lightBg: "bg-[#1b4373]/5 dark:bg-[#60a5fa]/5",
          liturgicalColorName: "Sacrament Blue",
          accentRing: "ring-[#1b4373]/10",
          badgeBg: "bg-[#1b4373]/10 text-[#1b4373] dark:bg-[#60a5fa]/10 dark:text-[#60a5fa]"
        };
      case "amber":
      default:
        return {
          primaryColor: "#965c15",
          hoverColor: "#78470d",
          glow: "from-[#965c15]/15 via-transparent to-transparent",
          textAccent: "text-[#965c15] dark:text-[#fbbf24]",
          borderAccent: "border-[#965c15]/20 dark:border-[#fbbf24]/20",
          lightBg: "bg-[#965c15]/5 dark:bg-[#fbbf24]/5",
          liturgicalColorName: "Fellowship Gold",
          accentRing: "ring-[#965c15]/10",
          badgeBg: "bg-[#965c15]/10 text-[#965c15] dark:bg-[#fbbf24]/10 dark:text-[#fbbf24]"
        };
    }
  };

  const theme = getThemeStyles(event.themeColor);

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
      navigator.clipboard.writeText(`${event.title} - ${formatDateFull(event.startDateTime)} at ${event.locationName || event.address}. RSVP in Viam!`);
      alert("Event details link copied to clipboard!");
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 lg:p-8 bg-foreground/60 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Immersive modal card with balanced height and responsive structural stabilization */}
      <div
        className={`w-full max-w-4xl bg-card border border-border rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl relative drawer-slide-up flex flex-col text-foreground h-full max-h-[85vh] md:max-h-[80vh] lg:max-h-[85vh] ${theme.accentRing} ring-1`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dynamic color visual aura background */}
        <div className={`absolute -top-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-br filter blur-[100px] pointer-events-none opacity-40 ${theme.glow}`} />
        <div className={`absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gradient-to-bl filter blur-[100px] pointer-events-none opacity-40 ${theme.glow}`} />

        {/* 1. Permanent Sticky Header (Anchored Close Button keeps layout clean) */}
        <div className="sticky top-0 z-45 w-full flex items-center justify-between px-5 sm:px-6 py-4 bg-card/90 backdrop-blur-md border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-muted text-muted-foreground px-2.5 py-1 rounded border border-border shrink-0">
              Event Details
            </span>
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-primary animate-pulse truncate">
              Live Registry
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-muted hover:bg-secondary text-muted-foreground border border-border rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Unified Content Scroll Area */}
        <div className="overflow-y-auto custom-scrollbar flex-1 flex flex-col pb-16 lg:pb-0">
          
          {/* Cover Photo Block */}
          <div className="w-full h-44 sm:h-56 md:h-64 lg:h-72 overflow-hidden bg-muted relative border-b border-border shrink-0 select-none">
            {event.imageUrl && !imageFailed ? (
              <>
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-[1.01]"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    if (img.src && !img.src.includes("api.codetabs.com")) {
                      img.src = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(event.imageUrl!)}`;
                    } else {
                      setImageFailed(true);
                    }
                  }}
                />
                {/* Visual richness overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-950/20 to-transparent pointer-events-none" />
              </>
            ) : (
              <FallbackCover category={event.category} title={event.title} themeColor={event.themeColor} />
            )}
            
            {/* Elegant glassmorphic floating category badge on cover photo */}
            <div className="absolute bottom-4 left-4 z-10">
              <span className="backdrop-blur-md bg-stone-900/65 dark:bg-zinc-950/75 text-[#faf8f2] text-[10px] font-black uppercase tracking-[0.2em] px-3.5 py-1.5 rounded-full border border-white/10 shadow-md">
                {event.category}
              </span>
            </div>
          </div>

          {/* Info flow container */}
          <div className="p-5 sm:p-7 md:p-8 lg:p-10 flex flex-col gap-8">
            
            {/* Title Section (Below hero to completely prevent absolute overlay text collisions) */}
            <div className="text-left border-b border-border pb-6">
              <div className="flex flex-wrap items-center gap-2 mb-3.5">
                <span 
                  className="text-[10px] font-black uppercase tracking-[0.18em] px-3.5 py-1 rounded-full border shadow-sm transition-all duration-300"
                  style={{
                    backgroundColor: `${theme.primaryColor}12`,
                    borderColor: `${theme.primaryColor}22`,
                    color: theme.primaryColor
                  }}
                >
                  ✨ {theme.liturgicalColorName}
                </span>
                {event.verified && (
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-350 border border-emerald-250/20 dark:border-emerald-900/20 px-3.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-450" /> Verified
                  </span>
                )}
                {event.audience && (
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] bg-stone-100 dark:bg-zinc-900 text-stone-600 dark:text-zinc-350 border border-stone-200 dark:border-zinc-800 px-3.5 py-1 rounded-full shadow-sm">
                    👤 {event.audience === "young_adults" ? "Young Adults" : event.audience.toUpperCase()}
                  </span>
                )}
              </div>

              <h2 className="font-display font-semibold text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-foreground tracking-tight leading-tight max-w-3xl">
                {event.title}
              </h2>
            </div>
            
            {/* Split layout: Details vs Dynamic RSVP Card */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              
              {/* Left Column: Details Flow (lg:col-span-3) */}
              <div className="lg:col-span-3 flex flex-col gap-6 text-left">
                
                {/* Time & Date Block */}
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl border ${theme.borderAccent} ${theme.lightBg} ${theme.textAccent} shrink-0`}>
                    <Calendar className="w-6 h-6 stroke-[2]" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 dark:text-zinc-500">Date & Time</span>
                    <span className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white mt-1 leading-snug break-words">
                      {formatDateFull(event.startDateTime)}
                    </span>
                    <span className="text-sm font-semibold text-stone-650 dark:text-zinc-400 mt-1">
                      {formatTime(event.startDateTime)}{event.endDateTime ? ` - ${formatTime(event.endDateTime)}` : " (2h duration)"}
                    </span>
                  </div>
                </div>

                {/* Location Block */}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((event.locationName ? event.locationName + ", " : "") + event.address + ", " + (event.city || ""))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-4 group/addr p-3 -mx-3 rounded-2xl hover:bg-stone-50/50 dark:hover:bg-zinc-900/60 transition-all border border-transparent hover:border-stone-200/50 dark:hover:border-white/5"
                >
                  <div className={`p-3 rounded-2xl border ${theme.borderAccent} ${theme.lightBg} ${theme.textAccent} shrink-0 group-hover/addr:bg-[#7a1c31] group-hover/addr:text-white group-hover/addr:border-transparent transition-all duration-350`}>
                    <MapPin className="w-6 h-6 stroke-[2]" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 dark:text-zinc-500 flex items-center gap-1">
                      Venue & Location <CornerUpRight className="w-3.5 h-3.5 text-stone-450 group-hover/addr:text-[#7a1c31] transition-colors" />
                    </span>
                    <span className="text-base sm:text-lg font-extrabold text-stone-950 dark:text-white mt-1 leading-snug group-hover/addr:text-[#7a1c31] dark:group-hover/addr:text-rose-100 transition-colors break-words">
                      {event.locationName || "Event Location"}
                    </span>
                    <span className="text-sm font-medium text-stone-600 dark:text-zinc-450 mt-1">
                      {event.address}, {event.city}
                    </span>
                  </div>
                </a>

                {/* Hosted By Block */}
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl border ${theme.borderAccent} ${theme.lightBg} ${theme.textAccent} shrink-0`}>
                    <User className="w-6 h-6 stroke-[2]" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 dark:text-zinc-500">Organized By</span>
                    <span className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white mt-1 leading-snug break-words">
                      {event.hostName || "Community Host"}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#7a1c31] dark:text-[#f472b6] mt-1">
                      {event.hostType || "Parish"} Organizer
                    </span>
                  </div>
                </div>

                {/* Elegant parchment gathering description container */}
                {event.description && (
                  <div className="mt-2 bg-[#fdfcf7]/60 dark:bg-zinc-900/30 border border-stone-200 dark:border-zinc-900 rounded-[1.8rem] p-5 sm:p-6 lg:p-8 flex flex-col">
                    <span className="text-[10px] font-black text-stone-450 dark:text-zinc-500 uppercase tracking-[0.15em] mb-3">
                      About the Gathering
                    </span>
                    <p className="text-sm sm:text-base text-stone-750 dark:text-zinc-350 leading-relaxed whitespace-pre-wrap font-medium">
                      {event.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Partiful-inspired Interactive RSVP Panel (lg:col-span-2) - Visible only on Desktop viewports */}
              <div className="hidden lg:flex lg:col-span-2 flex-col gap-4">
                
                {/* Central Interactive RSVP Box - Warm stone/ivory invite box */}
                <div className={`border rounded-[1.8rem] sm:rounded-[2.2rem] p-5 sm:p-6 shadow-md relative overflow-hidden text-center flex flex-col justify-between bg-[#fdfcf7]/80 dark:bg-zinc-900/40 border-stone-200 dark:border-white/5 ${theme.accentRing} ring-1`}>
                  
                  <div>
                    <h4 className="font-extrabold text-base sm:text-lg text-stone-900 dark:text-white mb-2 flex items-center justify-center gap-1.5">
                      <Flame className="w-5 h-5 text-amber-500 fill-amber-500" /> Viam Guest List
                    </h4>
                    
                    {/* Big Stats Indicator */}
                    <div className="flex justify-around items-center py-4 my-2 border-y border-stone-200/50 dark:border-white/5">
                      <div className="flex flex-col text-center">
                        <span className="text-2xl sm:text-3xl font-black text-stone-950 dark:text-white">{totalGoing}</span>
                        <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-450 tracking-wider">Going</span>
                      </div>
                      <div className="w-[1px] h-8 bg-stone-200 dark:bg-white/5" />
                      <div className="flex flex-col text-center">
                        <span className="text-2xl sm:text-3xl font-black text-stone-950 dark:text-white">{totalMaybe}</span>
                        <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-450 tracking-wider">Maybe</span>
                      </div>
                    </div>

                    {/* Progress Bar Visual (Going vs Maybe) */}
                    <div className="w-full bg-stone-200 dark:bg-zinc-800 h-3 rounded-full overflow-hidden flex shadow-inner mb-4 mt-2">
                      {totalResponses > 0 ? (
                        <>
                          <div 
                            style={{ width: `${goingPct}%` }} 
                            className="bg-emerald-500 h-full transition-all duration-500 shadow-[inset_-2px_0_4px_rgba(0,0,0,0.1)]" 
                            title={`${totalGoing} Going`} 
                          />
                          <div 
                            style={{ width: `${maybePct}%` }} 
                            className="bg-amber-500 h-full transition-all duration-500" 
                            title={`${totalMaybe} Maybe`} 
                          />
                        </>
                      ) : (
                        <div className="w-full bg-stone-300 dark:bg-zinc-700 h-full flex items-center justify-center text-[8px] font-bold text-stone-500">No responses yet</div>
                      )}
                    </div>
                  </div>

                  {/* RSVP Buttons. CRITICAL BUG FIXED: Solid contrast theme styles with custom hex rendering prevent dynamic failure */}
                  <div className="flex flex-col gap-2.5 mt-3 w-full">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log("Modify RSVP clicked - desktop");
                        onToggleRsvp();
                      }}
                      className="w-full py-3.5 sm:py-4 px-4 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all duration-300 active:scale-98 border flex items-center justify-center gap-2 hover:shadow-md hover:brightness-105 select-none leading-none"
                      style={{
                        backgroundColor: isRsvpd ? "#ffffff" : theme.primaryColor,
                        color: isRsvpd ? theme.primaryColor : "#faf8f2",
                        borderColor: isRsvpd ? theme.primaryColor : "transparent",
                        borderWidth: isRsvpd ? "2px" : "1px"
                      }}
                    >
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>{isRsvpd ? "Modify RSVP Details" : "RSVP to Catholic Event"}</span>
                    </button>
                    
                    <button
                      onClick={onToggleSave}
                      className="w-full py-3 px-4 rounded-2xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 leading-none hover:bg-stone-50 dark:hover:bg-zinc-800"
                      style={{
                        backgroundColor: isSaved ? `${theme.primaryColor}0d` : "transparent",
                        color: isSaved ? theme.primaryColor : "inherit",
                        borderColor: isSaved ? `${theme.primaryColor}30` : "rgba(0,0,0,0.1)"
                      }}
                    >
                      <Heart className={`w-3.5 h-3.5 shrink-0 ${isSaved ? "fill-current" : ""}`} />
                      <span>{isSaved ? "Saved Bookmark" : "Save Bookmark"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Fully Expanded Guest Registry Panel */}
            <div className="border border-stone-200 dark:border-zinc-900 rounded-[1.8rem] p-5 sm:p-6 md:p-8 bg-[#fdfcf7]/40 dark:bg-zinc-900/10 text-left mt-2">
              <h4 className="font-extrabold text-base sm:text-lg text-stone-900 dark:text-white mb-2 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-5 h-5 text-rose-900 dark:text-rose-455" /> Attendee Registry
              </h4>
              <p className="text-xs text-stone-450 dark:text-zinc-500 -mt-0.5 leading-normal mb-6 font-semibold">
                See who is joining in fellowship. Maybes are displayed separately; No RSVPs are strictly private.
              </p>

              {/* Going Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-sm" />
                  <span className="text-[10px] font-black text-stone-500 dark:text-zinc-400 uppercase tracking-wider">Going ({totalGoing})</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {goingRegistry.length > 0 ? (
                    goingRegistry.map((rsvp: any) => {
                      const initials = rsvp.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                      const arch = ARCHETYPES.find(a => a.id === rsvp.archetype) || ARCHETYPES[0];
                      return (
                        <div 
                          key={rsvp.id}
                          className="flex items-center gap-2.5 bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm border border-stone-200/50 dark:border-white/5 py-1.5 px-4 rounded-full text-xs font-semibold shadow-sm transition-all hover:scale-105 cursor-default"
                          title={`${rsvp.name} (${rsvp.email})`}
                        >
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 shadow-sm"
                            style={{ backgroundColor: theme.primaryColor }}
                          >
                            {initials || "JM"}
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-stone-850 dark:text-zinc-200 flex items-center gap-1 font-bold">
                              {rsvp.name}
                              <span className="text-[10px]" title={arch.name}>{arch.emoji}</span>
                            </span>
                            <span className="text-[8px] font-black uppercase tracking-wider text-stone-450 dark:text-zinc-500">{arch.name}</span>
                          </div>
                          {rsvp.guests > 0 && (
                            <span 
                              className="px-2 py-0.5 rounded-full text-[9px] font-black shrink-0 border ml-1"
                              style={{
                                backgroundColor: `${theme.primaryColor}12`,
                                color: theme.primaryColor,
                                borderColor: `${theme.primaryColor}25`
                              }}
                            >
                              +{rsvp.guests}
                            </span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-xs text-stone-400 dark:text-zinc-650 font-semibold italic">No confirmations yet. Be the first!</span>
                  )}
                </div>
              </div>

              {/* Maybe Section */}
              <div>
                <div className="flex items-center gap-2 mb-3.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 shadow-sm" />
                  <span className="text-[10px] font-black text-stone-500 dark:text-zinc-400 uppercase tracking-wider">Maybe ({totalMaybe})</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {maybeRegistry.length > 0 ? (
                    maybeRegistry.map((rsvp: any) => {
                      const initials = rsvp.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                      const arch = ARCHETYPES.find(a => a.id === rsvp.archetype) || ARCHETYPES[0];
                      return (
                        <div 
                          key={rsvp.id}
                          className="flex items-center gap-2.5 bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm border border-stone-200/50 dark:border-white/5 py-1.5 px-4 rounded-full text-xs font-semibold shadow-sm transition-all hover:scale-105 cursor-default"
                          title={`${rsvp.name} (${rsvp.email})`}
                        >
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 shadow-sm"
                            style={{ backgroundColor: theme.primaryColor }}
                          >
                            {initials || "JM"}
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-stone-850 dark:text-zinc-200 flex items-center gap-1 font-bold">
                              {rsvp.name}
                              <span className="text-[10px]" title={arch.name}>{arch.emoji}</span>
                            </span>
                            <span className="text-[8px] font-black uppercase tracking-wider text-stone-450 dark:text-zinc-500">{arch.name}</span>
                          </div>
                          {rsvp.guests > 0 && (
                            <span 
                              className="px-2 py-0.5 rounded-full text-[9px] font-black shrink-0 border ml-1"
                              style={{
                                backgroundColor: `${theme.primaryColor}12`,
                                color: theme.primaryColor,
                                borderColor: `${theme.primaryColor}25`
                              }}
                            >
                              +{rsvp.guests}
                            </span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-xs text-stone-400 dark:text-zinc-650 font-semibold italic">No "maybe" RSVPs currently.</span>
                  )}
                </div>
              </div>

            </div>

            {/* Bottom website + calendar buttons - high-fidelity, cohesive white/ivory glassmorphic action pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 border-t border-stone-200/50 dark:border-white/5 pt-6 mt-4">
              <a 
                href={getGoogleCalendarUrl(event)}
                target="_blank"
                rel="noreferrer"
                className="py-3.5 px-4 bg-white/60 dark:bg-zinc-900/60 hover:bg-stone-50 dark:hover:bg-zinc-800 border border-stone-250/50 dark:border-white/5 text-stone-850 dark:text-zinc-200 text-xs font-bold uppercase tracking-wider rounded-2xl text-center shadow-sm transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4 shrink-0" style={{ color: theme.primaryColor }} />
                <span>Add Google Calendar</span>
              </a>
              {event.externalUrl && (
                <a 
                  href={event.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3.5 px-4 bg-white/60 dark:bg-zinc-900/60 hover:bg-stone-50 dark:hover:bg-zinc-800 border border-stone-250/50 dark:border-white/5 text-stone-850 dark:text-zinc-200 text-xs font-bold uppercase tracking-wider rounded-2xl text-center shadow-sm transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" style={{ color: theme.primaryColor }} />
                  <span>Event Website</span>
                </a>
              )}
              <button 
                onClick={handleShare}
                className="py-3.5 px-4 bg-white/60 dark:bg-zinc-900/60 hover:bg-stone-50 dark:hover:bg-zinc-800 border border-stone-250/50 dark:border-white/5 text-stone-850 dark:text-zinc-200 text-xs font-bold uppercase tracking-wider rounded-2xl shadow-sm transition-all duration-300 flex items-center justify-center gap-2 md:col-span-1 sm:col-span-2"
              >
                <Share2 className="w-4 h-4 shrink-0" style={{ color: theme.primaryColor }} />
                <span>Share Details Link</span>
              </button>
            </div>

          </div>

        </div>

        {/* Pinned Mobile/Tablet RSVP CTA Bar - Pinned at the bottom of the card only on lg:hidden viewports */}
        <div className="lg:hidden sticky bottom-0 z-40 w-full px-5 py-4 bg-[#faf8f2]/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-stone-200/50 dark:border-zinc-900/70 flex gap-3 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log("Modify RSVP clicked - mobile");
              onToggleRsvp();
            }}
            className="flex-1 py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-98 border flex items-center justify-center gap-2 hover:shadow-md select-none leading-none"
            style={{
              backgroundColor: theme.primaryColor,
              color: "#faf8f2",
              borderColor: "transparent",
            }}
          >
            <Sparkles className="w-4 h-4 shrink-0 animate-pulse" />
            <span>{isRsvpd ? "Modify RSVP" : "RSVP Now"}</span>
          </button>
          
          <button
            onClick={onToggleSave}
            className="p-3.5 rounded-xl border flex items-center justify-center transition-all duration-350 hover:bg-stone-50 dark:hover:bg-zinc-800"
            style={{
              borderColor: isSaved ? `${theme.primaryColor}40` : "rgba(0,0,0,0.1)",
              color: isSaved ? theme.primaryColor : "inherit",
              backgroundColor: isSaved ? `${theme.primaryColor}08` : "transparent"
            }}
          >
            <Heart className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
          </button>
        </div>

      </div>
    </div>
  );
}

