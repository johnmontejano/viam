import React, { useState, useEffect, useRef } from "react";
import { X, Check, Users, Sparkles, Calendar, MapPin, Mail, User } from "lucide-react";
import { CatholicEvent, ARCHETYPES } from "@/types/event";

interface RsvpModalProps {
  event: CatholicEvent;
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onSubmit: (status: "yes" | "maybe" | "no", guestsCount: number, name: string, email: string, archetype?: string) => Promise<void>;
}

export function RsvpModal({ event, isOpen, onClose, currentUser, onSubmit }: RsvpModalProps) {
  const [status, setStatus] = useState<"yes" | "maybe" | "no">("yes");
  const [guestsCount, setGuestsCount] = useState<number>(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [archetype, setArchetype] = useState("patristic");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  // Focus capture and restore management
  useEffect(() => {
    if (isOpen) {
      if (typeof document !== "undefined") {
        previousFocus.current = document.activeElement as HTMLElement;
      }
      if (dialogRef.current) {
        dialogRef.current.focus();
      }
    }
  }, [isOpen]);

  // Logging and mounting metrics for debug specifications
  useEffect(() => {
    console.log("RSVP modal component is mounted", {
      isOpen,
      zIndexBackdrop: "z-60",
      zIndexModal: "z-70"
    });
    return () => {
      console.log("RSVP modal component is unmounted");
      if (previousFocus.current) {
        previousFocus.current.focus();
      }
    };
  }, [isOpen]);

  // Intercept the keyboard Escape key down event inside the capture phase
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        console.log("RSVP Modal Escape key capture event triggered");
        e.stopPropagation(); // Stops bubble propagation so underlying modal doesn't close
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown, true);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  // Pre-fill user data and existing RSVP if logged in
  useEffect(() => {
    if (currentUser && isOpen) {
      setName(currentUser.displayName || currentUser.email?.split("@")[0] || "");
      setEmail(currentUser.email || "");
      
      const uid = currentUser.uid || "anonymous";
      const savedResponse = localStorage.getItem(`viam_rsvp_response_${event.id}_${uid}`);
      if (savedResponse) {
        try {
          const parsed = JSON.parse(savedResponse);
          setStatus(parsed.status || "yes");
          setGuestsCount(parsed.guests || 0);
          if (parsed.archetype) {
            setArchetype(parsed.archetype);
          }
        } catch (e) {
          console.error("Failed to parse saved RSVP response", e);
        }
      }
    } else {
      setName("");
      setEmail("");
      setStatus("yes");
      setGuestsCount(0);
      setArchetype("patristic");
    }
    setSuccess(false);
  }, [currentUser, isOpen, event.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      alert("Please provide your name and email to RSVP.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(status, guestsCount, name, email, archetype);
      setSuccess(true);
    } catch (err) {
      console.error("RSVP submission failed:", err);
      alert("Failed to submit RSVP. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
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

  return (
    <div 
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md overflow-y-auto" 
      onClick={onClose}
    >
      <div 
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-md bg-[#faf8f2] dark:bg-zinc-950 border border-stone-250 dark:border-zinc-900 rounded-3xl p-6 shadow-2xl relative drawer-slide-up flex flex-col text-stone-900 dark:text-zinc-100 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 bg-stone-100 dark:bg-zinc-900/80 hover:bg-stone-200 dark:hover:bg-zinc-800 rounded-full text-stone-500 dark:text-zinc-400 border border-stone-200 dark:border-white/5 transition-all focus:ring-2 focus:ring-[#7a1c31]/30"
          aria-label="Close RSVP modal"
        >
          <X className="w-4 h-4" />
        </button>

        {success ? (
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 rounded-full flex items-center justify-center mb-4">
              <Check className="w-9 h-9 stroke-[3]" />
            </div>
            <h3 className="font-extrabold text-2xl text-stone-900 dark:text-white mb-2">You're on the list!</h3>
            
            <div className="bg-stone-50 dark:bg-zinc-900/40 border border-stone-200 dark:border-white/5 rounded-2xl p-4 text-sm text-stone-600 dark:text-zinc-300 leading-relaxed text-left flex flex-col gap-2.5 my-4 w-full">
              <div className="font-bold text-base text-rose-800 dark:text-rose-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> {event.title}
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-zinc-400 font-medium">
                <Calendar className="w-4 h-4 text-rose-600 dark:text-rose-455" />
                {formatDate(event.startDateTime)} at {formatTime(event.startDateTime)}
              </div>
              {event.locationName && (
                <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-zinc-400 font-medium">
                  <MapPin className="w-4 h-4 text-rose-600 dark:text-rose-455" />
                  {event.locationName}
                </div>
              )}
              
              <div className="border-t border-stone-200 dark:border-white/5 pt-3 mt-1 text-xs font-semibold text-stone-700 dark:text-zinc-200">
                Response: <span className="text-emerald-600 dark:text-emerald-450 uppercase">{status === "yes" ? "Going" : status === "maybe" ? "Maybe" : "Not Going"}</span>
                {status !== "no" && guestsCount > 0 && ` (+ ${guestsCount} Guest${guestsCount > 1 ? "s" : ""})`}
              </div>
              
              {status !== "no" && (
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-stone-400 dark:text-zinc-500 font-semibold text-xs">Your Focus:</span>
                  {(() => {
                    const arch = ARCHETYPES.find(a => a.id === archetype) || ARCHETYPES[0];
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${arch.colorClass}`}>
                        <span>{arch.emoji}</span>
                        <span>{arch.name}</span>
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="mt-2 w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wider text-[#faf8f2] shadow-lg transition-all focus:ring-2 focus:ring-[#7a1c31]/30"
              style={{ backgroundColor: "#7a1c31" }}
            >
              Perfect, see you there!
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-wider bg-rose-100 dark:bg-rose-950/40 text-[#7a1c31] dark:text-rose-350 px-2.5 py-1 rounded-md font-extrabold border border-rose-200/20 dark:border-rose-900/30">
                Update RSVP Status
              </span>
              <h3 className="font-extrabold text-xl text-stone-900 dark:text-white mt-2 leading-tight">
                Update RSVP Status
              </h3>
              <p className="text-xs text-stone-500 dark:text-zinc-400 font-semibold mt-1 truncate">
                {event.title}
              </p>
            </div>

            {/* Attendance Toggle Cards (Partiful-style) */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus("yes")}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all duration-300 gap-1.5 shadow-sm focus:outline-none ${
                  status === "yes"
                    ? "bg-rose-50 dark:bg-rose-950/50 border-[#7a1c31] text-[#7a1c31] dark:text-[#f472b6] scale-102 ring-2 ring-[#7a1c31]/20"
                    : "bg-stone-50 dark:bg-zinc-900/40 border-stone-200 dark:border-white/5 text-stone-500 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800"
                }`}
              >
                <span className="text-lg">Going</span>
                <span>Going</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus("maybe")}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all duration-300 gap-1.5 shadow-sm focus:outline-none ${
                  status === "maybe"
                    ? "bg-rose-50 dark:bg-rose-950/50 border-[#7a1c31] text-[#7a1c31] dark:text-[#f472b6] scale-102 ring-2 ring-[#7a1c31]/20"
                    : "bg-stone-50 dark:bg-zinc-900/40 border-stone-200 dark:border-white/5 text-stone-500 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800"
                }`}
              >
                <span className="text-lg">Maybe</span>
                <span>Maybe</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus("no")}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all duration-300 gap-1.5 shadow-sm focus:outline-none ${
                  status === "no"
                    ? "bg-rose-50 dark:bg-rose-950/50 border-[#7a1c31] text-[#7a1c31] dark:text-[#f472b6] scale-102 ring-2 ring-[#7a1c31]/20"
                    : "bg-stone-50 dark:bg-zinc-900/40 border-stone-200 dark:border-white/5 text-stone-500 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800"
                }`}
              >
                <span className="text-lg">Can't Go</span>
                <span>Can't Go</span>
              </button>
            </div>

            {/* Guest Selector (Visible if status is 'yes' or 'maybe') */}
            {status !== "no" && (
              <div className="bg-stone-50 dark:bg-zinc-900/40 border border-stone-200 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-2.5">
                <label className="text-xs font-bold text-stone-700 dark:text-zinc-350 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#7a1c31] dark:text-[#f472b6]" />
                  Bringing guests?
                </label>
                <div className="flex justify-between items-center gap-1.5">
                  {[0, 1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setGuestsCount(num)}
                      className={`w-9 h-9 rounded-full border text-xs font-bold transition-all duration-205 flex items-center justify-center focus:outline-none ${
                        guestsCount === num
                          ? "text-white border-transparent"
                          : "bg-white dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 border-stone-200 dark:border-zinc-700/60 hover:bg-stone-100 dark:hover:bg-zinc-750"
                      }`}
                      style={{
                        backgroundColor: guestsCount === num ? "#7a1c31" : undefined
                      }}
                    >
                      {num === 0 ? "0" : `+${num}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Attendance Archetype Theme Selector (Visible if status is 'yes' or 'maybe') */}
            {status !== "no" && (
              <div className="bg-stone-50 dark:bg-zinc-900/40 border border-stone-200 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-2.5">
                <label className="text-xs font-bold text-stone-700 dark:text-zinc-355 flex items-center gap-1.5 justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
                    Attendance Theme / Focus
                  </span>
                  <span className="text-[8px] bg-[#7a1c31]/10 text-[#7a1c31] dark:text-rose-350 dark:bg-rose-950/40 px-2 py-0.5 rounded font-black uppercase tracking-wider">Custom</span>
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                  {ARCHETYPES.map((arch) => (
                    <button
                      key={arch.id}
                      type="button"
                      onClick={() => setArchetype(arch.id)}
                      className={`flex items-start p-2.5 rounded-xl border text-left transition-all duration-250 gap-2.5 focus:outline-none ${
                        archetype === arch.id
                          ? `bg-white dark:bg-zinc-900 ${arch.colorClass} border-current ring-1 ring-current shadow-sm`
                          : "bg-white dark:bg-zinc-900/50 border-stone-200 dark:border-zinc-800 hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-600 dark:text-zinc-400"
                      }`}
                    >
                      <span className="text-xl leading-none mt-0.5">{arch.emoji}</span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-extrabold leading-tight">{arch.name}</span>
                        <span className="text-[9px] text-stone-400 dark:text-zinc-550 font-semibold leading-snug mt-0.5">{arch.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Information Form */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] font-bold text-stone-550 dark:text-zinc-450 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-stone-100 dark:bg-zinc-900 border border-stone-200 dark:border-white/5 p-3 rounded-xl focus:border-[#7a1c31]/45 focus:ring-1 focus:ring-[#7a1c31]/30 focus:bg-white dark:focus:bg-zinc-900/90 transition-all font-semibold text-sm outline-none"
                />
              </div>

              <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] font-bold text-stone-550 dark:text-zinc-450 uppercase tracking-wider flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Contact Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. johndoe@viam.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-stone-100 dark:bg-zinc-900 border border-stone-200 dark:border-white/5 p-3 rounded-xl focus:border-[#7a1c31]/45 focus:ring-1 focus:ring-[#7a1c31]/30 focus:bg-white dark:focus:bg-zinc-900/90 transition-all font-semibold text-sm outline-none"
                />
              </div>
            </div>

            {/* Submit & Cancel Actions Bar */}
            <div className="flex gap-3 mt-3 w-full shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 px-4 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 leading-none hover:bg-stone-50 dark:hover:bg-zinc-900/40"
                style={{
                  backgroundColor: "transparent",
                  color: "inherit",
                  borderColor: "rgba(0,0,0,0.15)",
                }}
              >
                Cancel
              </button>

              <button
                disabled={submitting}
                type="submit"
                className="flex-[2] py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-98 border flex items-center justify-center gap-2 hover:shadow-md hover:brightness-105 select-none leading-none disabled:opacity-50"
                style={{
                  backgroundColor: "#7a1c31",
                  color: "#faf8f2",
                  borderColor: "transparent",
                }}
              >
                {submitting ? (
                  <>Saving...</>
                ) : (
                  <>Save RSVP</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
