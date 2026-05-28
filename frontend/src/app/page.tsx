"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Map, { Marker, Popup, Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Search, MapPin, ExternalLink, Plus, Check, Filter, CornerUpRight, LocateFixed, Map as MapIcon, List, Sparkles, X, MessageSquare, ChevronDown, ChevronUp, Car, Loader2, Clock, Sun, Moon, Heart, User, LogOut, Lock, ShieldCheck, ClipboardCheck } from "lucide-react";
import { haversineDistance, minDistanceToRoute } from "@/lib/geo";
import { AISearchBar } from "@/components/search/AISearchBar";
import { ParsedSearchIntent } from "@/types/searchIntent";
import { geminiSearchParser } from "@/lib/search/geminiSearchParser";
import { generateResultsSummary } from "@/lib/search/generateResultsSummary";
import { parseNaturalLanguageSearch } from "@/lib/search/parseNaturalLanguageSearch";
import { CatholicEvent, EventCategory } from "@/types/event";
import { DEMO_EVENTS } from "@/lib/events/demoEvents";
import { DiscoveryLayerToggle } from "@/components/discovery/DiscoveryLayerToggle";
import { EventCard } from "@/components/events/EventCard";
import { EventDetailPanel } from "@/components/events/EventDetailPanel";
import { EventDetailModal } from "@/components/events/EventDetailModal";
import { EventFilters } from "@/components/events/EventFilters";
import { EventEmptyState } from "@/components/events/EventEmptyState";
import { EventSubmissionForm } from "@/components/events/EventSubmissionForm";
import { RsvpModal } from "@/components/events/RsvpModal";
import { Calendar } from "lucide-react";
import { useAuthSafe } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { saveItem, unsaveItem, rsvpToEvent, unRsvp } from "@/lib/firestore/userActions";
import { submitEvent, getApprovedEvents, getPendingEvents, moderateEvent, getUserSubmissions, uploadEventImage, updateEventImageUrl } from "@/lib/firestore/events";
import { UserManagementPanel } from "@/components/admin/UserManagementPanel";

interface ChurchLocation {
  church_name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  hours: string;
  category_normalized: string;
  website: string;
  image_url: string;
  distanceFromRoute?: number;
  distanceFromOrigin?: number;
  detourMinutes?: number;
}

const CATEGORIES = ["FSSP", "ICKSP", "SSPX", "Diocesan", "Independent", "Unknown"];
const DISTANCES = [5, 10, 25, 50, 100, 10000];

// HTML Stripper that preserves line breaks for readability
const formatMassTimes = (html: string) => {
  if (!html) return "";
  let text = html.replace(/<br\s*[\/]?>/gi, '\n')
                 .replace(/<\/p>/gi, '\n')
                 .replace(/<\/div>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/ +/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n').trim();
  return text;
};

// Autocomplete Component
function AutocompleteInput({ placeholder, value, onChange, onSelectCoords, icon: Icon, className }: any) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (value.length > 2 && isOpen && value !== "Current Location") {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=5&countrycodes=us,ca,gb,au`);
          const data = await res.json();
          setSuggestions(data);
        } catch (e) {}
      } else {
        setSuggestions([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [value, isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className={`relative flex items-center w-full ${className}`}>
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 dark:text-zinc-500 w-5 h-5 z-10" />}
      <input
        type="text"
        placeholder={placeholder}
        className={`w-full py-2.5 bg-transparent focus:outline-none min-w-0 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-zinc-500 text-sm ${Icon ? 'pl-10 pr-4' : 'px-4'} ${value === 'Current Location' ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}`}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => { if(value.length > 2 && value !== "Current Location") setIsOpen(true); }}
      />
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900/95 border border-stone-200 dark:border-white/5 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden z-50 text-sm max-h-60 overflow-y-auto custom-scrollbar">
          {suggestions.map((s, i) => (
            <li 
              key={i} 
              className="p-3 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer border-b border-stone-100 dark:border-white/5 last:border-0 transition-colors flex items-start gap-2 group text-stone-700 dark:text-zinc-300"
              onClick={() => {
                const displayName = s.display_name.split(',').slice(0, 3).join(',');
                onChange(displayName);
                if (onSelectCoords) onSelectCoords({ lat: parseFloat(s.lat), lon: parseFloat(s.lon) });
                setIsOpen(false);
              }}
            >
              <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <span className="text-stone-700 dark:text-zinc-300 group-hover:text-rose-700 dark:group-hover:text-white transition-colors">{s.display_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Sidebar Church Card Component
const ChurchCard = ({ church, isStop, toggleStop, onClick, isSelected, index, isSaved, onToggleSave }: any) => {
  const hoursText = formatMassTimes(church.hours);
  const delay = Math.min(index * 0.04, 0.4);

  return (
    <div
      className={`rounded-2xl border cursor-pointer group relative shrink-0 card-animate overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isSelected 
          ? 'neural-glass-card-active border-rose-500/45 shadow-[0_0_30px_rgba(190,18,60,0.18)] scale-[1.015]' 
          : 'neural-glass-card border-stone-200 dark:border-white/5 shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.2)] hover:border-rose-500/30 hover:bg-stone-100 dark:hover:bg-zinc-900/60 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_12px_30px_rgba(0,0,0,0.4)] hover:scale-[1.01]'
      }`}
      style={{ animationDelay: `${delay}s` }}
      onClick={onClick}
    >
      {/* Small image strip on mobile, hidden on wider cards */}
      {church.image_url && (
        <div className="w-full h-28 md:h-32 overflow-hidden bg-stone-100 dark:bg-zinc-950/40 border-b border-stone-200 dark:border-white/5">
          <img
            src={church.image_url}
            alt={church.church_name}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
          />
        </div>
      )}
      
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-lg leading-tight text-stone-900 dark:text-white group-hover:text-rose-900 dark:group-hover:text-rose-100 transition-colors duration-300">{church.church_name}</h3>
          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleSave(e); }}
              className={`shrink-0 p-1.5 rounded-full border transition-all duration-200 ${
                isSaved 
                  ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-900/35 scale-110' 
                  : 'bg-stone-100 dark:bg-zinc-800/60 text-stone-500 dark:text-zinc-400 border-stone-200 dark:border-white/5 hover:bg-stone-200 dark:hover:bg-zinc-700/60 hover:text-rose-700 dark:hover:text-rose-350'
              }`}
              title={isSaved ? "Remove from Saved" : "Save Mass Location"}
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-800 dark:fill-rose-700 text-rose-800 dark:text-rose-300' : ''}`} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); toggleStop(church); }}
              className={`shrink-0 p-1.5 rounded-full border transition-all duration-200 ${
                isStop 
                  ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/35 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 hover:text-emerald-800 dark:hover:text-emerald-355 scale-110' 
                  : 'bg-stone-100 dark:bg-zinc-800/60 text-stone-500 dark:text-zinc-400 border-stone-200 dark:border-white/5 hover:bg-stone-200 dark:hover:bg-zinc-700/60 hover:text-stone-750 dark:hover:text-zinc-205'
              }`}
              title={isStop ? "Remove Stop" : "Add Stop"}
            >
              {isStop ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(church.church_name + ', ' + church.address + ', ' + church.city)}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 p-1.5 rounded-full border bg-stone-100 dark:bg-zinc-800/60 text-stone-500 dark:text-zinc-400 border-stone-200 dark:border-white/5 hover:bg-rose-100 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-350 hover:border-rose-300 dark:hover:border-rose-900/35 transition-all duration-200"
              title="Get Directions on Google Maps"
            >
              <CornerUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-2.5">
          <span className="text-[10px] uppercase tracking-wider bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/30 px-2 py-0.5 rounded-md font-bold">
            {church.category_normalized || "Unknown"}
          </span>
          
          {church.distanceFromRoute !== undefined && (
            <span className="text-[10px] uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
              <CornerUpRight className="w-3 h-3" />
              {church.distanceFromRoute.toFixed(1)} mi detour
            </span>
          )}
          {church.detourMinutes !== undefined && church.distanceFromRoute !== undefined && (
            <span className="text-[10px] uppercase tracking-wider bg-stone-100 dark:bg-zinc-800/60 text-stone-600 dark:text-zinc-300 border border-stone-200 dark:border-zinc-700/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
              <Car className="w-3 h-3 text-rose-600 dark:text-rose-455" />
              {church.detourMinutes < 60
                ? `+${church.detourMinutes} min`
                : `+${Math.floor(church.detourMinutes/60)}h ${church.detourMinutes%60}m`}
            </span>
          )}
          {church.distanceFromOrigin !== undefined && (
            <span className="text-[10px] uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/30 px-2 py-0.5 rounded-md font-bold">
              {church.distanceFromOrigin.toFixed(1)} mi
            </span>
          )}
        </div>

        {hoursText && (
          <div className="mt-3.5 bg-stone-50 dark:bg-zinc-950/40 border border-stone-200 dark:border-white/5 rounded-xl p-3 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-rose-600 dark:text-rose-455 mt-0.5 shrink-0 animate-pulse" />
            <div className="text-sm text-stone-700 dark:text-zinc-200 font-medium leading-relaxed line-clamp-3 whitespace-pre-line">
              {hoursText}
            </div>
          </div>
        )}

        <a 
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(church.church_name + ', ' + church.address + ', ' + church.city)}`}
          target="_blank" 
          rel="noreferrer" 
          onClick={(e) => e.stopPropagation()}
          className="mt-3.5 flex items-start gap-1.5 text-stone-500 hover:text-rose-700 dark:text-zinc-400 dark:hover:text-rose-300 transition-colors group/addr"
        >
          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-stone-400 dark:text-zinc-500 group-hover/addr:text-rose-555" />
          <span className="text-xs leading-snug group-hover/addr:underline">{church.address}, {church.city}</span>
        </a>
      </div>
    </div>
  );
};


function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Synchronize Theme state to document element for Tailwind class selectors
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const [hasSearched, setHasSearched] = useState(false);
  const [data, setData] = useState<ChurchLocation[]>([]);
  const [selectedChurch, setSelectedChurch] = useState<ChurchLocation | null>(null);
  
  const [mode, setMode] = useState<'nearby' | 'route'>('nearby');
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  
  // Input strings
  const [searchNearby, setSearchNearby] = useState("");
  const [routeFrom, setRouteFrom] = useState("");
  const [routeTo, setRouteTo] = useState("");

  // Cached coordinates from Autocomplete
  const [searchNearbyCoords, setSearchNearbyCoords] = useState<{lat: number, lon: number} | null>(null);
  const [routeFromCoords, setRouteFromCoords] = useState<{lat: number, lon: number} | null>(null);
  const [routeToCoords, setRouteToCoords] = useState<{lat: number, lon: number} | null>(null);
  
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [maxDistance, setMaxDistance] = useState<number>(25);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStops, setSelectedStops] = useState<ChurchLocation[]>([]);

  // ==========================================
  // EVENTS LAYER STATES
  // ==========================================
  const [discoveryLayer, setDiscoveryLayer] = useState<"masses" | "events">("masses");
  const [pendingEvents, setPendingEvents] = useState<CatholicEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CatholicEvent | null>(null);
  
  // --- AUTH & SAVED STATE (REAL FIREBASE & FIRESTORE) ---
  const auth = useAuthSafe();
  
  // Backwards compatibility virtual user session
  const currentUser = useMemo(() => {
    if (!auth || !auth.isLoggedIn || !auth.userProfile) return null;
    return {
      email: auth.userProfile.email || auth.userProfile.phone || auth.firebaseUser?.email || auth.firebaseUser?.phoneNumber || "",
      role: auth.userProfile.role,
      state: auth.userProfile.region || "",
      uid: auth.firebaseUser?.uid || auth.firebaseUser?.id || "",
      displayName: auth.userProfile.displayName,
      avatarUrl: auth.userProfile.avatarUrl || null
    };
  }, [auth?.userProfile, auth?.isLoggedIn, auth?.firebaseUser]);

  const [dbApprovedEvents, setDbApprovedEvents] = useState<CatholicEvent[]>([]);
  const [dbPendingEvents, setDbPendingEvents] = useState<CatholicEvent[]>([]);
  const [dbSubmissions, setDbSubmissions] = useState<CatholicEvent[]>([]);
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [rsvpEvent, setRsvpEvent] = useState<CatholicEvent | null>(null);
  const [rsvpUpdatedTrigger, setRsvpUpdatedTrigger] = useState(0);
  const [detailedEventModal, setDetailedEventModal] = useState<CatholicEvent | null>(null);

  // Helper to get reactive RSVP status from localStorage for immediate UI responses
  const getIsEventRsvpd = (eventId: string) => {
    if (typeof window === "undefined") return false;
    const uid = auth?.firebaseUser?.uid || "anonymous";
    const stored = localStorage.getItem(`viam_rsvp_events_${uid}`);
    if (!stored) return false;
    try {
      const list = JSON.parse(stored);
      return Array.isArray(list) && list.includes(eventId);
    } catch {
      return false;
    }
  };

  // Sync detailed event modal changes to reflect updated database states (e.g. RSVP updates)
  useEffect(() => {
    if (detailedEventModal) {
      const latest = [...dbApprovedEvents, ...dbPendingEvents, ...dbSubmissions].find(e => e.id === detailedEventModal.id);
      if (latest) {
        setDetailedEventModal(latest);
      }
    }
  }, [dbApprovedEvents, dbPendingEvents, dbSubmissions]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShowDebug(
        window.location.search.includes("debug=true") || 
        window.location.hostname === "localhost" || 
        window.location.hostname === "127.0.0.1"
      );
    }
  }, []);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isEventManagementOpen, setIsEventManagementOpen] = useState(false);
  
  // Login modal local states
  const [emailInput, setEmailInput] = useState("");
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);

  // Toast notification system
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Expose saved items from context
  const savedMasses = auth?.savedMasses || [];
  const savedEvents = auth?.savedEvents || [];

  const loadDbEvents = useCallback(async () => {
    try {
      const approved = await getApprovedEvents();
      const mappedApproved = approved.map(e => ({
        ...e,
        themeColor: (localStorage.getItem(`viam_event_theme_${e.id}`) as any) || undefined
      }));
      setDbApprovedEvents(mappedApproved);

      if (auth?.isLoggedIn && auth.firebaseUser) {
        const submissions = await getUserSubmissions(auth.firebaseUser.uid);
        const mappedSubmissions = submissions.map(e => ({
          ...e,
          themeColor: (localStorage.getItem(`viam_event_theme_${e.id}`) as any) || undefined
        }));
        setDbSubmissions(mappedSubmissions);

        if (auth.isAdmin) {
          const region = auth.userProfile?.role === "local_admin" ? auth.userProfile.region : undefined;
          const pending = await getPendingEvents(region, auth.firebaseUser.uid, auth.userProfile?.role);
          const mappedPending = pending.map(e => ({
            ...e,
            themeColor: (localStorage.getItem(`viam_event_theme_${e.id}`) as any) || undefined
          }));
          setDbPendingEvents(mappedPending);
        }
      }
    } catch (error) {
      console.error("Error loading events from Firestore:", error);
    }
  }, [auth?.isLoggedIn, auth?.firebaseUser, auth?.isAdmin, auth?.userProfile?.region]);

  // Load events from database on mount and whenever authentication status changes
  useEffect(() => {
    loadDbEvents();
  }, [loadDbEvents]);

  // Sync selected event changes to reflect updated database states (e.g. RSVP, moderation updates)
  useEffect(() => {
    if (selectedEvent) {
      const latest = [...dbApprovedEvents, ...dbPendingEvents, ...dbSubmissions].find(e => e.id === selectedEvent.id);
      if (latest) {
        setSelectedEvent(latest);
      }
    }
  }, [dbApprovedEvents, dbPendingEvents, dbSubmissions]);

  // Auto-close login modal on successful authentication
  useEffect(() => {
    if (auth?.isLoggedIn) {
      setShowLoginModal(false);
    }
  }, [auth?.isLoggedIn]);

  const handleToggleSaveMass = async (e: React.MouseEvent | null, church: ChurchLocation) => {
    if (e) e.stopPropagation();
    if (!auth || !auth.isLoggedIn || !auth.firebaseUser) {
      setShowLoginModal(true);
      return;
    }
    const stableId = encodeURIComponent(church.church_name + '|' + church.address);
    const exists = auth.savedMasses.includes(stableId);
    // Optimistic update
    if (exists) {
      auth.setSavedMasses(prev => prev.filter(id => id !== stableId));
    } else {
      auth.setSavedMasses(prev => [...prev, stableId]);
    }
    try {
      if (exists) {
        await unsaveItem(auth.firebaseUser.uid, "mass", stableId);
        showToast("Removed from Saved Masses.");
      } else {
        await saveItem(auth.firebaseUser.uid, "mass", stableId);
        showToast("Saved to your Masses.");
      }
    } catch (err) {
      console.error("Error toggling saved mass:", err);
      // Rollback optimistic update
      if (exists) {
        auth.setSavedMasses(prev => [...prev, stableId]);
      } else {
        auth.setSavedMasses(prev => prev.filter(id => id !== stableId));
      }
      showToast("Could not save. Please try again.", "error");
    }
  };

  const handleToggleSaveEvent = async (e: React.MouseEvent | null, eventId: string) => {
    if (e) e.stopPropagation();
    if (!auth || !auth.isLoggedIn || !auth.firebaseUser) {
      setShowLoginModal(true);
      return;
    }
    const exists = auth.savedEvents.includes(eventId);
    // Optimistic update
    if (exists) {
      auth.setSavedEvents(prev => prev.filter(id => id !== eventId));
    } else {
      auth.setSavedEvents(prev => [...prev, eventId]);
    }
    try {
      if (exists) {
        await unsaveItem(auth.firebaseUser.uid, "event", eventId);
        showToast("Removed from Saved Events.");
      } else {
        await saveItem(auth.firebaseUser.uid, "event", eventId);
        showToast("Saved to your Events.");
      }
    } catch (err) {
      console.error("Error toggling saved event:", err);
      // Rollback optimistic update
      if (exists) {
        auth.setSavedEvents(prev => [...prev, eventId]);
      } else {
        auth.setSavedEvents(prev => prev.filter(id => id !== eventId));
      }
      showToast("Could not save. Please try again.", "error");
    }
  };

  const handleToggleRsvp = (eventId: string) => {
    const target = [...DEMO_EVENTS, ...dbApprovedEvents, ...dbPendingEvents, ...dbSubmissions].find(e => e.id === eventId);
    if (target) {
      setRsvpEvent(target);
    }
  };

  const handleRsvpSubmit = async (status: "yes" | "maybe" | "no", guests: number, name: string, email: string, archetype?: string) => {
    if (!rsvpEvent) return;
    try {
      const uid = auth?.firebaseUser?.uid || "anonymous";
      const responseData = { status, guests, name, email, archetype: archetype || "patristic", updatedAt: new Date().toISOString() };
      
      // 1. Save detailed RSVP to localStorage
      localStorage.setItem(`viam_rsvp_response_${rsvpEvent.id}_${uid}`, JSON.stringify(responseData));

      // 1.5. Update global event RSVP registry for interactive display
      const registryKey = `viam_event_rsvps_${rsvpEvent.id}`;
      const storedRegistry = localStorage.getItem(registryKey);
      let registry = storedRegistry ? JSON.parse(storedRegistry) : [];
      
      // Remove existing entry for the user
      registry = registry.filter((r: any) => r.email.toLowerCase() !== email.toLowerCase() && r.id !== uid);

      // Add new entry if going or maybe
      if (status !== "no") {
        registry.unshift({
          id: uid,
          name: name,
          status: status,
          guests: guests,
          email: email,
          archetype: archetype || "patristic",
          updatedAt: new Date().toISOString()
        });
      }
      localStorage.setItem(registryKey, JSON.stringify(registry));

      // 2. Sync to auth profile list so Cancel RSVP/RSVP state triggers correctly on UI
      const userRsvpKey = `viam_rsvp_events_${uid}`;
      const stored = localStorage.getItem(userRsvpKey);
      const list = stored ? JSON.parse(stored) : [];
      
      if (status !== "no") {
        if (!list.includes(rsvpEvent.id)) {
          localStorage.setItem(userRsvpKey, JSON.stringify([...list, rsvpEvent.id]));
        }
        // Increment rsvpCount locally (1 for self + guests)
        const countKey = `viam_event_rsvp_count_${rsvpEvent.id}`;
        localStorage.setItem(countKey, String(guests + 1));
      } else {
        localStorage.setItem(userRsvpKey, JSON.stringify(list.filter((id: string) => id !== rsvpEvent.id)));
        // Reset rsvpCount locally
        localStorage.setItem(`viam_event_rsvp_count_${rsvpEvent.id}`, "0");
      }

      // 3. Trigger a rerender to recalculate processedEvents useMemo with new counts
      setRsvpUpdatedTrigger(prev => prev + 1);

      // 4. Reload local database & context sync
      if (auth?.refreshProfile) {
        await auth.refreshProfile();
      }
      await loadDbEvents();
    } catch (err) {
      console.error("Failed to submit RSVP:", err);
      throw err;
    }
  };

  const handleApproveEvent = async (eventId: string) => {
    if (!auth || !auth.isLoggedIn || !auth.firebaseUser) return;
    try {
      await moderateEvent(eventId, "approve", auth.firebaseUser.uid);
      await loadDbEvents();
    } catch (err) {
      console.error("Error approving event:", err);
    }
  };

  const handleRejectEvent = async (eventId: string) => {
    if (!auth || !auth.isLoggedIn || !auth.firebaseUser) return;
    try {
      await moderateEvent(eventId, "reject", auth.firebaseUser.uid);
      await loadDbEvents();
    } catch (err) {
      console.error("Error rejecting event:", err);
    }
  };

  const [activeEventCategories, setActiveEventCategories] = useState<EventCategory[]>([]);
  const [activeAudience, setActiveAudience] = useState<string>("any");
  const [activeHostType, setActiveHostType] = useState<string>("any");
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "tomorrow" | "weekend" | "month">("all");
  const [showSubmitForm, setShowSubmitForm] = useState<boolean>(false);

  const [searchedCenter, setSearchedCenter] = useState<{lat: number, lon: number} | null>(null);
  const [routeLine, setRouteLine] = useState<number[][] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  type SearchStatus = 'idle' | 'parsing' | 'getting_location' | 'searching' | 'success' | 'error' | 'cancelled';
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
  const [loadingMessage, setLoadingMessage] = useState("Thinking...");
  const searchRequestIdRef = useRef<number>(0);

  const resetSearchInteractionState = () => {
    setIsLoading(false);
    setSearchStatus('idle');
    setLoadingMessage("Thinking...");
    setClarificationMsg("");
    setResultsSummary("");
    setResultsSummaryExpanded(false);
    setDisambiguationOptions(null);
    setDisambiguationLocation(null);
  };

  const getCurrentLocationFresh = async (): Promise<{ lat: number, lon: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => reject(err),
        { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }
      );
    });
  };
  
  const [viewState, setViewState] = useState({
    longitude: -98.5795,
    latitude: 39.8283,
    zoom: 3.5
  });

  const mapRef = useRef<any>(null);

  const animateMapTo = (lat: number, lon: number, zoom?: number) => {
    const targetZoom = zoom ?? 10;
    setViewState(prev => ({
      ...prev,
      latitude: lat,
      longitude: lon,
      zoom: targetZoom
    }));
    
    if (mapRef.current) {
      const map = mapRef.current.getMap ? mapRef.current.getMap() : mapRef.current;
      if (map) {
        map.flyTo({
          center: [lon, lat],
          zoom: targetZoom,
          duration: 1500,
          essential: true
        });
      }
    }
  };


  // AI Interpretation State
  const [aiSummary, setAiSummary] = useState<string>("");
  const [clarificationMsg, setClarificationMsg] = useState<string>("");
  const [resultsSummary, setResultsSummary] = useState<string>("");
  const [resultsSummaryExpanded, setResultsSummaryExpanded] = useState(false);
  const [disambiguationOptions, setDisambiguationOptions] = useState<string[] | null>(null);
  const [disambiguationLocation, setDisambiguationLocation] = useState<string | null>(null);
  const [pendingQuery, setPendingQuery] = useState<string>("");
  const processedDataRef = useRef<ChurchLocation[]>([]);
  const maxDistanceRef = useRef<number>(10000);
  const [nearbyPreview, setNearbyPreview] = useState<ChurchLocation[]>([]);

  // Compute nearby events preview based on geolocation center
  const nearbyEventsPreview = useMemo(() => {
    if (hasSearched) return [];
    const center = searchedCenter || { lat: 37.7749, lon: -122.4194 };
    const allEvents = [...DEMO_EVENTS, ...dbApprovedEvents];
    return allEvents
      .filter((e): e is CatholicEvent & { latitude: number; longitude: number } => 
        e.latitude !== undefined && e.longitude !== undefined && e.latitude !== null && e.longitude !== null
      )
      .map(e => ({
        ...e,
        distanceFromOrigin: haversineDistance(center.lat, center.lon, e.latitude, e.longitude)
      }))
      .filter(e => e.distanceFromOrigin <= 100)
      .sort((a, b) => (a.distanceFromOrigin ?? 999) - (b.distanceFromOrigin ?? 999))
      .slice(0, 3);
  }, [searchedCenter, dbApprovedEvents, hasSearched]);

  // Keep maxDistanceRef in sync so async closures always see the latest value
  useEffect(() => {
    maxDistanceRef.current = maxDistance;
  }, [maxDistance]);

  // Fetch initial church data
  useEffect(() => {
    fetch("/data/latinmass_locations.json")
      .then((res) => res.json())
      .then((json) => {
        const parsed = json.map((item: any) => ({
          ...item,
          latitude: parseFloat(item.latitude),
          longitude: parseFloat(item.longitude),
        })).filter((item: any) => !isNaN(item.latitude) && !isNaN(item.longitude));
        setData(parsed);
      });
  }, []);

  // Compute nearby preview whenever location or data changes
  useEffect(() => {
    if (data.length === 0 || hasSearched) return;
    const center = searchedCenter || { lat: 37.7749, lon: -122.4194 };
    const withDist = data
      .map(c => ({ ...c, distanceFromOrigin: haversineDistance(center.lat, center.lon, c.latitude, c.longitude) }))
      .filter(c => c.distanceFromOrigin <= 100)
      .sort((a, b) => (a.distanceFromOrigin ?? 999) - (b.distanceFromOrigin ?? 999));
    setNearbyPreview(withDist.slice(0, 3));
  }, [searchedCenter, data, hasSearched]);

  // IP-based geolocation fallback (requires no permissions, works on HTTP local network)
  const fetchIpLocation = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data && data.latitude && data.longitude) {
        setSearchNearbyCoords({ lat: data.latitude, lon: data.longitude });
        setSearchNearby("Current Location");
        setSearchedCenter({ lat: data.latitude, lon: data.longitude });
        animateMapTo(data.latitude, data.longitude, 10);
        return true;
      }
    } catch (e) {
      console.error("IP Geolocation failed", e);
    }
    return false;
  };

  // Auto-fetch user location on initial app load without prompting permissions immediately
  useEffect(() => {
    // Check if we already have permission. If so, use exact GPS.
    if (navigator.permissions && navigator.geolocation) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            setSearchNearbyCoords({ lat, lon });
            setSearchNearby("Current Location");
            setSearchedCenter({ lat, lon });
            animateMapTo(lat, lon, 10);
          });
        } else {
          // If not granted, use silent IP geocoding so the app still centers on their city automatically
          fetchIpLocation();
        }
      });
    } else {
      // Fallback for browsers without permissions API or insecure origin (local network testing)
      fetchIpLocation();
    }
  }, []);

  const geocodeFallback = async (query: string) => {
    if (!query || query === "Current Location") return null;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    } catch (e) {
      console.error("Geocoding failed", e);
    }
    return null;
  };

  const handleLocateMe = async () => {
    setIsLoading(true);
    setSearchStatus('getting_location');
    setLoadingMessage("Finding your location...");
    try {
      const coords = await getCurrentLocationFresh();
      setSearchNearbyCoords(coords);
      setSearchNearby("Current Location");
      setSearchedCenter(coords);
      animateMapTo(coords.lat, coords.lon, 10);
    } catch (e) {
      const success = await fetchIpLocation();
      if (!success) alert("Unable to retrieve location. Please check browser permissions or network.");
    } finally {
      setIsLoading(false);
      setSearchStatus('idle');
    }
  };

  const executeRouteSearch = async (
    fromQuery: string,
    toQuery: string,
    summaryContext?: string,
    fromCoordsOverride?: { lat: number; lon: number } | null,
    toCoordsOverride?: { lat: number; lon: number } | null
  ) => {
    setHasSearched(true);
    setIsLoading(true);
    setSearchStatus('searching');
    setLoadingMessage("Searching Route...");
    setSearchedCenter(null);
    setSelectedChurch(null); // Clear selected church popup from previous search!
    try {
      const fromC = fromCoordsOverride || (await geocodeFallback(fromQuery));
      const toC = toCoordsOverride || (await geocodeFallback(toQuery));
      
      if (fromC && toC) {
        setRouteFromCoords(fromC);
        setRouteToCoords(toC);
        const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${fromC.lon},${fromC.lat};${toC.lon},${toC.lat}?geometries=geojson&overview=full`);
        const osrmData = await osrmRes.json();
        if (osrmData.routes && osrmData.routes.length > 0) {
          const coords = osrmData.routes[0].geometry.coordinates;
          setRouteLine(coords);
          const midLat = (fromC.lat + toC.lat) / 2;
          const midLon = (fromC.lon + toC.lon) / 2;
          animateMapTo(midLat, midLon, 5);
          setMobileView('list'); // Default to list on mobile so results are visible
        }
      } else {
        alert("Could not find one of the route locations.");
      }
    } catch (e) {
      alert("Failed to calculate route.");
    } finally {
      setIsLoading(false);
      setSearchStatus('success');
      if (summaryContext) {
        setTimeout(() => triggerResultsSummaryFromQuery(summaryContext), 300);
      }
    }
  };

  const executeNearbySearch = async (query: string, coordsOverride?: {lat: number, lon: number} | null, summaryContext?: string) => {
    setSelectedChurch(null); // Clear selected church popup from previous search!
    setHasSearched(true);
    setIsLoading(true);
    setSearchStatus('searching');
    setLoadingMessage("Searching Mass locations...");
    setRouteLine(null);
    try {
      let coords = coordsOverride;
      if (!coords && query !== "Current Location") {
        coords = await geocodeFallback(query);
      }
      if (coords) {
        setSearchedCenter(coords);
        animateMapTo(coords.lat, coords.lon, 10);
        setMobileView('list'); // Default to list view on mobile after search
      } else {
        alert("Location not found. Please try a more specific city.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setSearchStatus('success');
      if (summaryContext) {
        setTimeout(() => triggerResultsSummaryFromQuery(summaryContext), 300);
      }
    }
  };

  const handleSearchNearby = async (e: React.FormEvent) => {
    e.preventDefault();
    executeNearbySearch(searchNearby, searchNearbyCoords);
  };

  const handleSearchRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    executeRouteSearch(routeFrom, routeTo);
  };

  const handleAISearch = async (rawQuery: string | ParsedSearchIntent) => {
    const requestId = ++searchRequestIdRef.current;
    setIsLoading(true);
    setSearchStatus('parsing');
    setLoadingMessage("Understanding your search...");
    setHasSearched(true);
    setClarificationMsg("");
    setAiSummary("");
    setResultsSummary("");
    setResultsSummaryExpanded(false);
    setDisambiguationOptions(null);
    setDisambiguationLocation(null);
    setSelectedChurch(null); // Clear selected church popup from previous search!
    setSelectedEvent(null);  // Clear selected event popup from previous search!

    try {
      // If called with a raw string from the search bar, run Gemini
      let intent: ParsedSearchIntent;
      const queryString = typeof rawQuery === "string" ? rawQuery : "";

      if (typeof rawQuery === "string") {
        setPendingQuery(rawQuery);
        try {
          intent = await geminiSearchParser(rawQuery);
        } catch (e) {
          console.warn("Gemini failed, using regex fallback", e);
          intent = parseNaturalLanguageSearch(rawQuery);
        }
      } else {
        intent = rawQuery;
      }

      if (requestId !== searchRequestIdRef.current) return;

      // Conversational Route-to-City Fallback:
      // If intent is route_search but origin is missing or contains conversational filler noise (indicating a single destination), transform to city_search.
      if (intent.intent === "route_search" && (!intent.origin || ["i'm going", "going", "heading", "traveling", "i am going", "driving to", "i'm driving"].some(p => intent.origin?.toLowerCase().startsWith(p)))) {
        intent.intent = "city_search";
        intent.location = intent.destination;
        intent.origin = undefined;
        intent.destination = undefined;
        if (intent.location) {
          intent.displaySummary = `TLM near ${intent.location}`;
        }
      }

      // Handle disambiguation
      if (intent.clarificationNeeded && intent.ambiguousOptions?.length) {
        setDisambiguationLocation(intent.ambiguousLocation || "that location");
        setDisambiguationOptions(intent.ambiguousOptions);
        setClarificationMsg(intent.clarificationQuestion || `Did you mean one of these?`);
        return;
      }

      // Unknown / needs clarification without options
      if (intent.clarificationNeeded || intent.intent === "unknown") {
        setClarificationMsg(intent.clarificationQuestion || "I couldn't understand that. Try: 'TLM near Dallas' or 'Nashville to San Francisco'.");
        return;
      }

      if (intent.displaySummary) setAiSummary(intent.displaySummary);
      if (intent.discoveryLayer) {
        setDiscoveryLayer(intent.discoveryLayer);
      }
      if (intent.eventCategory) {
        setActiveEventCategories([intent.eventCategory as EventCategory]);
      } else {
        setActiveEventCategories([]);
      }
      // CRITICAL: Only keep categories that exist in our valid CATEGORIES array to prevent zero-result bugs
      const validCategories = (intent.categories || []).filter((c: string) => CATEGORIES.includes(c));
      setActiveCategories(validCategories);
      // Set radius BEFORE executing search so filter picks it up synchronously
      const resolvedRadius = intent.radiusMiles ?? 10000;
      setMaxDistance(resolvedRadius);

      if (intent.intent === "route_search" && intent.origin && intent.destination) {
        setMode("route");
        setRouteFrom(intent.origin);
        setRouteTo(intent.destination);
        await executeRouteSearch(intent.origin, intent.destination, queryString, intent.originCoords, intent.destinationCoords);
      } else if (intent.intent === "nearby_search" || intent.useCurrentLocation) {
        setMode("nearby");
        setSearchStatus('getting_location');
        setLoadingMessage("Finding your location...");
        let coords: {lat: number, lon: number} | null = null;
        try {
          coords = await getCurrentLocationFresh();
        } catch {
          // GPS denied — fall back to IP geolocation silently
          const ok = await fetchIpLocation();
          if (!ok) {
            setClarificationMsg("Location permission needed. Enter a city instead.");
            return;
          }
          // fetchIpLocation sets searchedCenter directly via state
          // Set the search to run without explicit coords override
        }
        if (requestId !== searchRequestIdRef.current) return;
        if (coords) {
          setSearchNearbyCoords(coords);
          setSearchNearby("Current Location");
          setSearchedCenter(coords);
          animateMapTo(coords.lat, coords.lon, 10);
          await executeNearbySearch("Current Location", coords, queryString);
        }
      } else if (intent.intent === "city_search" && intent.location) {
        setMode("nearby");
        setSearchNearby(intent.location);
        await executeNearbySearch(intent.location, intent.locationCoords, queryString);
      } else if (intent.intent === "category_search") {
        if (!searchedCenter && !routeLine) {
          setSearchStatus('getting_location');
          setLoadingMessage("Finding your location...");
          try {
            const coords = await getCurrentLocationFresh();
            if (requestId !== searchRequestIdRef.current) return;
            setSearchNearbyCoords(coords);
            setSearchNearby("Current Location");
            setSearchedCenter(coords);
            animateMapTo(coords.lat, coords.lon, 10);
            await executeNearbySearch("Current Location", coords, queryString);
          } catch (err) {
            if (requestId !== searchRequestIdRef.current) return;
            setClarificationMsg("Location permission is needed. Enter a city or address instead.");
          }
        }
      }
    } catch (e) {
      console.error(e);
      setSearchStatus('error');
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Generate AI results summary after data is ready
  const triggerResultsSummary = async (items: any[], context: string, total: number) => {
    if (items.length === 0) return;
    try {
      const summary = await generateResultsSummary(items, context, total, discoveryLayerRef.current);
      if (summary) setResultsSummary(summary);
    } catch {}
  };


  const processedData = useMemo(() => {
    let processed = [...data];

    if (showSavedOnly) {
      processed = processed.filter(c => {
        const stableId = encodeURIComponent(c.church_name + '|' + c.address);
        return savedMasses.includes(stableId);
      });
    }

    if (mode === 'nearby' && searchedCenter) {
      processed = processed.map(c => ({
        ...c,
        distanceFromOrigin: haversineDistance(searchedCenter.lat, searchedCenter.lon, c.latitude, c.longitude)
      }));
    } else if (mode === 'route' && routeLine) {
      processed = processed.map(c => {
        const dist = minDistanceToRoute(c.latitude, c.longitude, routeLine);
        const estMinutes = Math.round(dist * 4.5);
        return {
          ...c,
          distanceFromRoute: dist,
          detourMinutes: estMinutes > 0 ? estMinutes : 1
        };
      });
    }

    processed = processed.filter(c => {
      if (mode === 'nearby' && c.distanceFromOrigin !== undefined && c.distanceFromOrigin > maxDistance) return false;
      if (mode === 'route' && c.distanceFromRoute !== undefined && c.distanceFromRoute > maxDistance) return false;
      if (activeCategories.length > 0 && !activeCategories.includes(c.category_normalized) && !activeCategories.includes("Unknown")) return false;
      return true;
    });

    if (mode === 'nearby') {
      processed.sort((a, b) => (a.distanceFromOrigin || 0) - (b.distanceFromOrigin || 0));
    } else if (mode === 'route') {
      processed.sort((a, b) => (a.distanceFromRoute || 0) - (b.distanceFromRoute || 0));
    }

    return processed;
  }, [mode, searchedCenter, routeLine, data, maxDistance, activeCategories, showSavedOnly, savedMasses]);

  const processedEvents = useMemo(() => {
    let events = [...DEMO_EVENTS, ...dbApprovedEvents];

    // If logged in, also include the user's own pending submissions so they can preview them
    if (auth?.isLoggedIn && auth.firebaseUser) {
      const myPending = dbSubmissions.filter(e => e.status === "pending");
      const existingIds = new Set(events.map(e => e.id));
      for (const e of myPending) {
        if (!existingIds.has(e.id)) {
          events.push(e);
        }
      }

      // If user is admin, also show the pending events in their jurisdiction on the map/lists
      if (auth.isAdmin) {
        for (const e of dbPendingEvents) {
          if (!existingIds.has(e.id)) {
            events.push(e);
          }
        }
      }
    }

    if (showSavedOnly) {
      events = events.filter(e => savedEvents.includes(e.id));
    }

    if (mode === 'nearby' && searchedCenter) {
      events = events.map(e => ({
        ...e,
        distanceFromOrigin: e.latitude && e.longitude 
          ? haversineDistance(searchedCenter.lat, searchedCenter.lon, e.latitude, e.longitude)
          : undefined
      }));
    } else if (mode === 'route' && routeLine) {
      events = events.map(e => {
        const dist = e.latitude && e.longitude 
          ? minDistanceToRoute(e.latitude, e.longitude, routeLine)
          : undefined;
        const estMinutes = dist !== undefined ? Math.round(dist * 4.5) : undefined;
        return {
          ...e,
          distanceFromRoute: dist,
          detourMinutes: estMinutes !== undefined && estMinutes > 0 ? estMinutes : 1
        };
      });
    }

    events = events.filter(e => {
      if (mode === 'nearby' && e.distanceFromOrigin !== undefined && e.distanceFromOrigin > maxDistance) return false;
      if (mode === 'route' && e.distanceFromRoute !== undefined && e.distanceFromRoute > maxDistance) return false;
      
      // Category filter
      if (activeEventCategories.length > 0 && !activeEventCategories.includes(e.category)) return false;
      
      // Audience filter
      if (activeAudience !== "any" && e.audience !== activeAudience) return false;

      // Host type filter
      if (activeHostType !== "any" && e.hostType !== activeHostType) return false;

      // Verified filter
      if (verifiedOnly && !e.verified) return false;

      // Date filter
      if (dateFilter !== "all") {
        const eventDate = new Date(e.startDateTime);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        if (dateFilter === "today") {
          const startOfToday = new Date(today);
          const endOfToday = new Date(today);
          endOfToday.setHours(23, 59, 59, 999);
          if (eventDate < startOfToday || eventDate > endOfToday) return false;
        } else if (dateFilter === "tomorrow") {
          const startOfTomorrow = new Date(tomorrow);
          const endOfTomorrow = new Date(tomorrow);
          endOfTomorrow.setHours(23, 59, 59, 999);
          if (eventDate < startOfTomorrow || eventDate > endOfTomorrow) return false;
        } else if (dateFilter === "weekend") {
          const dayOfWeek = today.getDay();
          const startOfWeekend = new Date(today);
          const diffToFriday = (5 - dayOfWeek + 7) % 7;
          startOfWeekend.setDate(today.getDate() + (diffToFriday === 0 && today.getHours() >= 12 ? 0 : diffToFriday));
          if (diffToFriday === 0 && today.getHours() < 12) {
            startOfWeekend.setHours(12, 0, 0, 0);
          } else {
            startOfWeekend.setHours(0, 0, 0, 0);
          }

          const endOfWeekend = new Date(startOfWeekend);
          const daysToSunday = (0 - startOfWeekend.getDay() + 7) % 7;
          endOfWeekend.setDate(startOfWeekend.getDate() + (daysToSunday === 0 ? 0 : daysToSunday));
          endOfWeekend.setHours(23, 59, 59, 999);

          if (eventDate < startOfWeekend || eventDate > endOfWeekend) return false;
        } else if (dateFilter === "month") {
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          if (eventDate < startOfMonth || eventDate > endOfMonth) return false;
        }
      }

      return true;
    });

    if (mode === 'nearby') {
      events.sort((a, b) => (a.distanceFromOrigin || 0) - (b.distanceFromOrigin || 0));
    } else if (mode === 'route') {
      events.sort((a, b) => (a.distanceFromRoute || 0) - (b.distanceFromRoute || 0));
    }

    // Map dynamic RSVP counts from localStorage
    events = events.map(e => {
      if (typeof window !== "undefined") {
        const localCount = localStorage.getItem(`viam_event_rsvp_count_${e.id}`);
        if (localCount) {
          return { ...e, rsvpCount: parseInt(localCount, 10) };
        }
      }
      return e;
    });

    return events;
  }, [mode, searchedCenter, routeLine, dbApprovedEvents, dbPendingEvents, dbSubmissions, maxDistance, activeEventCategories, activeAudience, activeHostType, verifiedOnly, dateFilter, showSavedOnly, savedEvents, auth?.isLoggedIn, auth?.isAdmin, rsvpUpdatedTrigger]);

  const adminPendingEvents = useMemo(() => {
    return dbPendingEvents;
  }, [dbPendingEvents]);

  // Keep refs always in sync so async callbacks can access fresh data
  useEffect(() => {
    processedDataRef.current = processedData;
  }, [processedData]);

  const processedEventsRef = useRef<CatholicEvent[]>([]);
  useEffect(() => {
    processedEventsRef.current = processedEvents;
  }, [processedEvents]);

  const discoveryLayerRef = useRef<"masses" | "events">("masses");
  useEffect(() => {
    discoveryLayerRef.current = discoveryLayer;
  }, [discoveryLayer]);

  // URL Deep Linking handler
  useEffect(() => {
    const eventId = searchParams.get("event");
    if (eventId && processedEvents.length > 0) {
      const target = processedEvents.find(e => e.id === eventId);
      if (target && !detailedEventModal) {
        setDiscoveryLayer("events");
        setDetailedEventModal(target);
      }
    }
  }, [searchParams, processedEvents, detailedEventModal]);

  // Called after a search completes to generate AI summary
  const triggerResultsSummaryFromQuery = (query: string) => {
    setTimeout(async () => {
      if (discoveryLayerRef.current === "events") {
        const freshEvents = processedEventsRef.current;
        if (freshEvents.length > 0) {
          const radius = maxDistanceRef.current;
          let relevantCount = freshEvents.length;
          if (mode === 'nearby') {
            const withinRadius = freshEvents.filter(e => e.distanceFromOrigin != null && e.distanceFromOrigin <= Math.min(radius, 50)).length;
            relevantCount = withinRadius > 0 ? withinRadius : freshEvents.filter(e => e.distanceFromOrigin != null && e.distanceFromOrigin <= 150).length;
          } else if (mode === 'route') {
            const within15 = freshEvents.filter(e => e.distanceFromRoute != null && e.distanceFromRoute <= 15).length;
            relevantCount = within15 > 0 ? within15 : freshEvents.filter(e => e.distanceFromRoute != null && e.distanceFromRoute <= 50).length;
          }
          await triggerResultsSummary(freshEvents, query, relevantCount);
        }
      } else {
        const freshData = processedDataRef.current;
        if (freshData.length > 0) {
          const radius = maxDistanceRef.current;
          let relevantCount = freshData.length;
          if (mode === 'nearby') {
            const withinRadius = freshData.filter(c => c.distanceFromOrigin != null && c.distanceFromOrigin <= Math.min(radius, 50)).length;
            relevantCount = withinRadius > 0 ? withinRadius : freshData.filter(c => c.distanceFromOrigin != null && c.distanceFromOrigin <= 150).length;
          } else if (mode === 'route') {
            const within15 = freshData.filter(c => c.distanceFromRoute != null && c.distanceFromRoute <= 15).length;
            relevantCount = within15 > 0 ? within15 : freshData.filter(c => c.distanceFromRoute != null && c.distanceFromRoute <= 50).length;
          }
          await triggerResultsSummary(freshData, query, relevantCount);
        }
      }
    }, 500);
  };

  const toggleCategory = (cat: string) => {
    setActiveCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const toggleStop = (church: ChurchLocation) => {
    setSelectedStops(prev => {
      const exists = prev.find(p => p.church_name === church.church_name);
      if (exists) return prev.filter(p => p.church_name !== church.church_name);
      return [...prev, church];
    });
  };

  const buildGoogleMapsUrl = () => {
    if (mode === 'route' && routeFrom && routeTo) {
      const origin = encodeURIComponent(routeFrom);
      const dest = encodeURIComponent(routeTo);
      let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`;
      if (selectedStops.length > 0) {
        const waypoints = selectedStops.map(s => encodeURIComponent(`${s.church_name}, ${s.address}, ${s.city}`)).join('|');
        url += `&waypoints=${waypoints}`;
      }
      return url;
    }
    if (searchedCenter) {
      return `https://www.google.com/maps/search/?api=1&query=${searchedCenter.lat},${searchedCenter.lon}`;
    }
    return "https://www.google.com/maps";
  };

  const displayedData = processedData.slice(0, 50);

  return (
    <div className={`flex flex-col h-[100dvh] overflow-hidden relative transition-colors duration-300 ${theme === 'dark' ? 'dark bg-background text-foreground' : 'bg-background text-foreground'}`}>
      {showDebug && (
        <div className="fixed bottom-4 left-4 bg-black/80 text-white text-xs p-3 rounded-lg z-[9999] font-mono pointer-events-none">
          <div>Auth Debug:</div>
          <div>isLoggedIn: {String(auth?.isLoggedIn)}</div>
          <div>firebaseUser: {auth?.firebaseUser ? 'Yes' : 'No'}</div>
          <div>userProfile: {auth?.userProfile ? 'Yes' : 'No'}</div>
          <div>userRole: {auth?.userProfile?.role || 'None'}</div>
          <div>authLoading: {String(auth?.authLoading)}</div>
          <div>authStep: {auth?.authStep || 'None'}</div>
        </div>
      )}
      {!hasSearched && (
        <>
          <button
            type="button"
            onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            className={`fixed top-4 right-4 z-50 p-2.5 rounded-full border shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center ${
              theme === 'dark' 
                ? 'bg-zinc-900/90 border-white/10 text-rose-455 hover:bg-zinc-800/90 shadow-[0_0_15px_rgba(190,18,60,0.2)]' 
                : 'bg-white/90 border-stone-200 text-stone-700 hover:bg-stone-100 shadow-md'
            }`}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 animate-pulse text-amber-400" /> : <Moon className="w-5 h-5 text-stone-650" />}
          </button>

          {!currentUser ? (
            <button
              type="button"
              onClick={() => setShowLoginModal(true)}
              className={`fixed top-4 right-16 z-50 px-4 py-2.5 rounded-full border shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 ${
                theme === 'dark'
                  ? 'bg-zinc-900/95 border-white/10 text-rose-350 hover:bg-zinc-800/95 shadow-[0_0_15px_rgba(190,18,60,0.15)]'
                  : 'bg-white/95 border-stone-200 text-stone-700 hover:bg-stone-50 shadow-md'
              }`}
            >
              <User className="w-4 h-4" />
              <span className="text-xs font-bold">Log In</span>
            </button>
          ) : (
            <div className="fixed top-4 right-16 z-50 group">
              <button
                className={`px-4 py-2.5 rounded-full border shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 ${
                  theme === 'dark'
                    ? 'bg-rose-950/30 border-rose-950/45 text-rose-350 hover:bg-rose-950/40 shadow-[0_0_15px_rgba(190,18,60,0.15)]'
                    : 'bg-rose-50/95 border-rose-200 text-rose-800 hover:bg-rose-100 shadow-md'
                }`}
              >
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="Avatar" className="w-4 h-4 rounded-full object-cover border border-rose-300/30" />
                ) : (
                  <User className="w-4 h-4 fill-rose-850/10 dark:fill-rose-350/10" />
                )}
                <span className="text-xs font-bold truncate max-w-[140px]">
                  {currentUser.email.split('@')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-zinc-950 border border-stone-200 dark:border-white/5 shadow-xl py-2 z-[60] origin-top-right scale-0 group-hover:scale-100 transition-all duration-200 ease-out translate-y-1 group-hover:translate-y-0 opacity-0 group-hover:opacity-100">
                <div className="px-4 py-2 border-b border-stone-100 dark:border-white/5">
                  <p className="text-xs text-stone-500 dark:text-zinc-500">Logged in as</p>
                  <p className="text-sm font-bold text-stone-900 dark:text-white truncate">{currentUser.email}</p>
                  <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-350 uppercase tracking-wider">
                    {currentUser.role.replace('_', ' ')}
                  </span>
                </div>
                
                <button
                  onClick={() => router.push("/profile")}
                  className="w-full text-left px-4 py-2 text-sm text-stone-700 dark:text-zinc-300 flex items-center gap-2 hover:bg-stone-50 dark:hover:bg-zinc-900/60 transition-colors"
                >
                  <User className="w-4 h-4 text-stone-400" />
                  My Pilgrim Profile
                </button>

                <button
                  onClick={() => setShowSavedOnly(prev => !prev)}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-stone-50 dark:hover:bg-zinc-900/60 transition-colors ${showSavedOnly ? 'text-rose-700 dark:text-rose-350 font-bold' : 'text-stone-700 dark:text-zinc-300'}`}
                >
                  <Heart className={`w-4 h-4 ${showSavedOnly ? 'fill-rose-700 text-rose-700' : ''}`} />
                  {showSavedOnly ? 'Showing Saved Only' : 'Show Saved Items'}
                </button>

                {(currentUser.role === 'local_admin' || currentUser.role === 'master_admin') && (
                  <button
                    onClick={() => router.push("/admin")}
                    className="w-full text-left px-4 py-2 text-sm text-emerald-700 dark:text-emerald-350 flex items-center gap-2 hover:bg-stone-50 dark:hover:bg-zinc-900/60 transition-colors font-bold"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-450" />
                    Admin Dashboard
                  </button>
                )}

                <button
                  onClick={async () => {
                    if (auth) await auth.signOut();
                    setShowSavedOnly(false);
                    setIsAdminDashboardOpen(false);
                    setIsUserManagementOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-650 dark:text-red-400 flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors border-t border-stone-100 dark:border-white/5 mt-1 pt-2"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {/* Header / Search Area */}
      {/* Full-Width Loading Banner */}
      {isLoading && (
        <div className="flex-none w-full z-30 overflow-hidden bg-rose-100 dark:bg-rose-950/80 border-b border-rose-200 dark:border-rose-500/20 backdrop-blur-md">
          <div className="flex items-center justify-center gap-3 py-2.5 text-rose-700 dark:text-rose-200 text-sm font-semibold">
            {/* Pulsing dot trio */}
            <div className="flex gap-1 items-center">
              <div className="w-1.5 h-1.5 bg-rose-500 dark:bg-rose-400 rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
              <div className="w-1.5 h-1.5 bg-rose-500 dark:bg-rose-400 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
              <div className="w-1.5 h-1.5 bg-rose-500 dark:bg-rose-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
            </div>
            <span className="tracking-wide text-rose-800 dark:text-rose-100">{loadingMessage}</span>
          </div>
          {/* Shimmer progress bar */}
          <div className="h-0.5 w-full bg-rose-200 dark:bg-rose-950 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-500 to-transparent animate-[shimmer_1.2s_linear_infinite] bg-[length:200%_100%]" />
          </div>
        </div>
      )}
      <header className={`z-20 px-4 md:px-6 transition-all duration-500 flex flex-col items-center relative ${
        hasSearched 
          ? 'flex-none border-b border-border shadow-card py-3.5 bg-card/80 backdrop-blur-xl w-full' 
          : 'flex-1 overflow-y-auto w-full h-full pt-12 pb-16 custom-scrollbar bg-transparent'
      }`}>
        
        {!hasSearched ? (
          <div className="w-full max-w-3xl my-auto flex flex-col items-center py-6 relative">
            {/* Glowing Ambient Background Orb */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl z-0" />
            
          <div className="text-center mb-8 hero-animate relative z-10">
              <h1 className="font-display text-5xl md:text-6xl font-semibold tracking-tight mb-4 text-foreground">Viam</h1>
              <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-lg mx-auto text-balance">
                Discover Catholic events and the Traditional Latin Mass near you.
              </p>
            </div>
            
            <DiscoveryLayerToggle 
              activeLayer={discoveryLayer} 
              onChange={(layer) => {
                setDiscoveryLayer(layer);
                setSelectedChurch(null);
                setSelectedEvent(null);
              }}
              className="mb-6 hero-animate hero-animate-delay-1"
            />

            {discoveryLayer === "events" && (
              <button 
                onClick={() => setShowSubmitForm(true)}
                className="mb-6 hero-animate hero-animate-delay-1 px-6 py-2.5 bg-rose-900/15 hover:bg-rose-900/25 text-rose-700 dark:text-rose-350 border border-dashed border-rose-300 dark:border-rose-900/50 rounded-full font-bold flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-98 transition-all shadow-sm z-10 relative"
              >
                <Plus className="w-4 h-4 text-rose-600 dark:text-rose-455" />
                Submit Catholic Event
              </button>
            )}

            <div className="flex bg-stone-100/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-stone-200 dark:border-white/5 p-1 rounded-full mb-6 hero-animate hero-animate-delay-1 relative z-10 shadow-lg">
              <button 
                onClick={() => setMode('nearby')}
                className={`px-6 py-2 text-sm rounded-full font-bold transition-all flex items-center gap-2 ${
                  mode === 'nearby' 
                    ? 'bg-rose-900 text-white border border-rose-500/30 shadow-[0_0_20px_rgba(190,18,60,0.3)]' 
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200/40 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800/40'
                }`}
              >
                <Sparkles className="w-4 h-4 text-rose-400" /> AI Search
              </button>
              <button 
                onClick={() => setMode('route')}
                className={`px-6 py-2 text-sm rounded-full font-bold transition-all flex items-center gap-2 ${
                  mode === 'route' 
                    ? 'bg-rose-900 text-white border border-rose-500/30 shadow-[0_0_20px_rgba(190,18,60,0.3)]' 
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200/40 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800/40'
                }`}
              >
                <CornerUpRight className="w-4 h-4" /> Route
              </button>
            </div>

            {mode === 'nearby' ? (
              <div className="w-full hero-animate hero-animate-delay-2">
                <AISearchBar onSearch={handleAISearch} isLoading={isLoading} loadingMessage={loadingMessage} discoveryLayer={discoveryLayer} />
              </div>
            ) : (
              <form onSubmit={handleSearchRoute} className="w-full max-w-3xl flex flex-col gap-3 relative z-10">
                <div className="flex flex-col gap-2 bg-stone-100/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-stone-200 dark:border-white/5 rounded-2xl p-4 shadow-xl focus-within:border-rose-500/45 focus-within:shadow-[0_0_35px_rgba(190,18,60,0.12)] transition-all duration-300">
                  <AutocompleteInput placeholder="From (e.g. San Francisco, CA)" value={routeFrom} onChange={setRouteFrom} onSelectCoords={setRouteFromCoords} icon={MapPin} className="rounded-xl" />
                  <div className="border-t border-stone-200 dark:border-white/5" />
                  <AutocompleteInput placeholder="To (e.g. Los Angeles, CA)" value={routeTo} onChange={setRouteTo} onSelectCoords={setRouteToCoords} icon={MapPin} className="rounded-xl" />
                </div>
                <button 
                  disabled={isLoading} 
                  type="submit" 
                  className="w-full bg-rose-900 text-white py-3.5 rounded-full font-bold hover:bg-rose-800 disabled:opacity-50 hover:scale-[1.01] active:scale-99 transition-all duration-300 flex items-center justify-center gap-2 border border-rose-600/30 shadow-[0_0_20px_rgba(190,18,60,0.2)] hover:shadow-[0_0_30px_rgba(190,18,60,0.4)]"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CornerUpRight className="w-5 h-5" />}
                  Find Masses Along Route
                </button>
              </form>
            )}

            {mode === 'nearby' && (
              <button onClick={() => setShowFilters(true)} className="mt-8 text-sm text-stone-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-455 flex items-center gap-1.5 font-medium transition-colors hero-animate hero-animate-delay-3">
                <Filter className="w-4 h-4 text-stone-400 group-hover:text-rose-600 dark:text-zinc-550 dark:group-hover:text-rose-455"/> Advanced Filters
              </button>
            )}

            {/* Nearby TLM/Events Preview Feed */}
            {mode === 'nearby' && (
              discoveryLayer === 'masses' 
                ? nearbyPreview.length > 0 && (
                  <div className="w-full max-w-3xl mt-10 hero-animate" style={{ animationDelay: '0.45s' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="w-4 h-4 text-rose-500 animate-pulse" />
                      <p className="text-sm font-bold text-stone-600 dark:text-zinc-300 uppercase tracking-wider">Nearest Masses to You</p>
                    </div>
                    <div className="flex flex-col gap-3">
                      {nearbyPreview.map((church, idx) => {
                        const hoursText = formatMassTimes(church.hours);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              const coords = { lat: church.latitude, lon: church.longitude };
                              setMode('nearby');
                              setSearchNearby(church.city || church.church_name);
                              setSearchNearbyCoords(coords);
                              setSearchedCenter(coords);
                              setHasSearched(true);
                              setAiSummary(`Masses near ${church.city || church.church_name}`);
                              
                              // Focus directly on the church in the results view
                              setSelectedChurch(church);
                              animateMapTo(church.latitude, church.longitude, 14);
                              if (window.innerWidth < 768) {
                                setMobileView('map');
                              }
                              setTimeout(() => triggerResultsSummaryFromQuery(church.city || church.church_name), 300);
                            }}
                            className="text-left w-full bg-white dark:bg-zinc-900/60 hover:bg-stone-50 dark:hover:bg-zinc-800/60 rounded-2xl border border-stone-200 dark:border-white/5 shadow-md hover:shadow-lg dark:shadow-xl hover:border-rose-300 dark:hover:border-rose-500/20 hover:scale-[1.01] transition-all duration-300 p-4 group card-animate"
                            style={{ animationDelay: `${0.45 + idx * 0.08}s` }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-[10px] uppercase tracking-wider bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/30 px-2 py-0.5 rounded-md font-bold shrink-0">
                                    {church.category_normalized || 'TLM'}
                                  </span>
                                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/30 px-2 py-0.5 rounded-md font-bold">
                                    {church.distanceFromOrigin?.toFixed(1)} mi
                                  </span>
                                </div>
                                <h4 className="font-bold text-stone-900 dark:text-white text-base leading-tight group-hover:text-rose-700 dark:group-hover:text-rose-300 transition-colors">{church.church_name}</h4>
                                {hoursText && (
                                  <p className="text-xs text-stone-600 dark:text-zinc-300 mt-1.5 line-clamp-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-rose-500 dark:text-rose-400 shrink-0" /> {hoursText}
                                  </p>
                                )}
                                <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1 line-clamp-1 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-stone-400 dark:text-zinc-500 shrink-0" /> {church.address}, {church.city}
                                </p>
                              </div>
                              <div className="shrink-0 w-8 h-8 rounded-full bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-white/5 group-hover:bg-rose-100 dark:group-hover:bg-rose-950/30 group-hover:border-rose-200 dark:group-hover:border-rose-800/30 flex items-center justify-center transition-colors">
                                <CornerUpRight className="w-4 h-4 text-stone-500 dark:text-zinc-400 group-hover:text-rose-600 dark:group-hover:text-rose-455 transition-colors" />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAISearch('TLM near me')}
                      className="mt-3 w-full text-sm text-center text-stone-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 font-semibold py-2 transition-colors"
                    >
                      See all nearby Masses →
                    </button>
                  </div>
                )
                : nearbyEventsPreview.length > 0 && (
                  <div className="w-full max-w-3xl mt-10 hero-animate" style={{ animationDelay: '0.45s' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="w-4 h-4 text-rose-500 animate-pulse" />
                      <p className="text-sm font-bold text-stone-600 dark:text-zinc-300 uppercase tracking-wider">Nearest Events to You</p>
                    </div>
                    <div className="flex flex-col gap-3">
                      {nearbyEventsPreview.map((event, idx) => {
                        const eventDateText = event.startDateTime 
                          ? new Date(event.startDateTime).toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' })
                          : "";
                        const eventTimeText = event.startDateTime
                          ? new Date(event.startDateTime).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })
                          : "";
                        return (
                          <button
                            key={event.id || idx}
                            type="button"
                            onClick={() => {
                              const coords = { lat: event.latitude, lon: event.longitude };
                              setMode('nearby');
                              setSearchNearby(event.city || event.locationName || event.title);
                              setSearchNearbyCoords(coords);
                              setSearchedCenter(coords);
                              setHasSearched(true);
                              setAiSummary(`Events near ${event.city || event.locationName || event.title}`);
                              
                              // Focus directly on the event and select it
                              setSelectedEvent(event);
                              // Open its modal directly
                              setDetailedEventModal(event);
                              animateMapTo(event.latitude, event.longitude, 14);
                              if (window.innerWidth < 768) {
                                setMobileView('map');
                              }
                              setTimeout(() => triggerResultsSummaryFromQuery(event.city || event.locationName || event.title), 300);
                            }}
                            className="text-left w-full bg-white dark:bg-zinc-900/60 hover:bg-stone-50 dark:hover:bg-zinc-800/60 rounded-2xl border border-stone-200 dark:border-white/5 shadow-md hover:shadow-lg dark:shadow-xl hover:border-rose-300 dark:hover:border-rose-500/20 hover:scale-[1.01] transition-all duration-300 p-4 group card-animate"
                            style={{ animationDelay: `${0.45 + idx * 0.08}s` }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-[10px] uppercase tracking-wider bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/30 px-2 py-0.5 rounded-md font-bold shrink-0">
                                    {event.category || 'Event'}
                                  </span>
                                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/30 px-2 py-0.5 rounded-md font-bold">
                                    {event.distanceFromOrigin?.toFixed(1)} mi
                                  </span>
                                </div>
                                <h4 className="font-bold text-stone-900 dark:text-white text-base leading-tight group-hover:text-rose-700 dark:group-hover:text-rose-300 transition-colors">{event.title}</h4>
                                {eventDateText && (
                                  <p className="text-xs text-stone-600 dark:text-zinc-300 mt-1.5 line-clamp-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-rose-500 dark:text-rose-400 shrink-0" /> {eventDateText} at {eventTimeText}
                                  </p>
                                )}
                                <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1 line-clamp-1 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-stone-400 dark:text-zinc-555 shrink-0" /> {event.locationName || event.address}, {event.city}
                                </p>
                              </div>
                              <div className="shrink-0 w-8 h-8 rounded-full bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-white/5 group-hover:bg-rose-100 dark:group-hover:bg-rose-950/30 group-hover:border-rose-200 dark:group-hover:border-rose-800/30 flex items-center justify-center transition-colors">
                                <CornerUpRight className="w-4 h-4 text-stone-500 dark:text-zinc-400 group-hover:text-rose-600 dark:group-hover:text-rose-455 transition-colors" />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAISearch('Catholic Events near me')}
                      className="mt-3 w-full text-sm text-center text-stone-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 font-semibold py-2 transition-colors"
                    >
                      See all nearby Events →
                    </button>
                  </div>
                )
            )}
          </div>
        ) : (
          <div className="w-full flex flex-col gap-2">
            {/* Row 1: Logo, toggles, utility actions */}
            <div className="flex items-center w-full gap-2">
              <h1 className="text-xl font-serif text-rose-700 dark:text-rose-500 font-bold tracking-tight cursor-pointer shrink-0 hover:text-rose-600 dark:hover:text-rose-400 transition-colors drop-shadow-[0_0_12px_rgba(190,18,60,0.15)]" onClick={() => { setHasSearched(false); setMode('nearby'); resetSearchInteractionState(); }}>Viam</h1>
              <div className="hidden md:flex bg-stone-100 dark:bg-zinc-950 p-0.5 rounded-full shrink-0 border border-stone-200 dark:border-white/5">
                <button 
                  onClick={() => setMode('nearby')}
                  className={`px-3 py-1 text-xs rounded-full font-bold transition-all flex items-center gap-1 ${
                    mode === 'nearby' 
                      ? 'bg-rose-900/80 text-white border border-rose-500/20 shadow' 
                      : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-900'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-rose-400" /> AI Search
                </button>
                <button 
                  onClick={() => setMode('route')}
                  className={`px-3 py-1 text-xs rounded-full font-bold transition-all flex items-center gap-1 ${
                    mode === 'route' 
                      ? 'bg-rose-900/80 text-white border border-rose-500/20 shadow' 
                      : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-900'
                  }`}
                >
                  <CornerUpRight className="w-3 h-3 text-rose-400" /> Route
                </button>
              </div>
              <DiscoveryLayerToggle 
                activeLayer={discoveryLayer} 
                onChange={(layer) => {
                  setDiscoveryLayer(layer);
                  setSelectedChurch(null);
                  setSelectedEvent(null);
                }} 
                className="hidden md:flex shrink-0 scale-90"
              />
              <div className="flex-1" />
              {discoveryLayer === "events" && (
                <button
                  onClick={() => setShowSubmitForm(true)}
                  className="hidden md:flex py-1.5 px-3 bg-rose-900 hover:bg-rose-800 text-white rounded-full text-xs font-bold transition-all border border-rose-800/20 shadow-md hover:shadow-lg active:scale-98 items-center gap-1 shrink-0 ml-1 mr-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Submit Event
                </button>
              )}
              <button onClick={() => setShowFilters(true)} className="p-2 rounded-full border border-stone-200 dark:border-white/5 bg-stone-100/80 dark:bg-zinc-900/60 hover:bg-stone-200 dark:hover:bg-zinc-800 text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white shrink-0 transition-all" title="Advanced Filters">
                <Filter className="w-4 h-4"/>
              </button>
              <button
                type="button"
                onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                className="p-2 rounded-full border border-stone-200 dark:border-white/5 bg-stone-100/80 dark:bg-zinc-900/60 hover:bg-stone-200 dark:hover:bg-zinc-800 text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white shrink-0 transition-all flex items-center justify-center"
                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-500 dark:text-zinc-400" />}
              </button>

              {!currentUser ? (
                <button
                  type="button"
                  onClick={() => setShowLoginModal(true)}
                  className="p-2 rounded-full border border-stone-200 dark:border-white/5 bg-stone-100/80 dark:bg-zinc-900/60 hover:bg-stone-200 dark:hover:bg-zinc-800 text-stone-500 dark:text-zinc-400 hover:text-rose-750 dark:hover:text-rose-400 shrink-0 ml-1 transition-all flex items-center justify-center gap-1"
                  title="Log In"
                >
                  <User className="w-4 h-4" />
                  <span className="text-xs font-bold px-0.5 hidden md:inline">Log In</span>
                </button>
              ) : (
                <div className="relative group shrink-0 ml-1">
                  <button
                    className="p-2 rounded-full border border-rose-200 dark:border-rose-950/45 bg-rose-50/60 dark:bg-rose-950/20 text-rose-800 dark:text-rose-350 hover:bg-rose-100 dark:hover:bg-rose-950/40 shrink-0 transition-all flex items-center justify-center gap-1"
                    title={`${currentUser.email} (${currentUser.role})`}
                  >
                    <User className="w-4 h-4 fill-rose-800/10 dark:fill-rose-350/10" />
                    <span className="text-xs font-bold max-w-[140px] truncate hidden lg:inline">
                      {currentUser.email.split('@')[0]}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-60 hidden lg:block" />
                  </button>
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-zinc-950 border border-stone-200 dark:border-white/5 shadow-xl py-2 z-[60] origin-top-right scale-0 group-hover:scale-100 transition-all duration-200 ease-out translate-y-1 group-hover:translate-y-0 opacity-0 group-hover:opacity-100">
                    <div className="px-4 py-2 border-b border-stone-100 dark:border-white/5">
                      <p className="text-xs text-stone-500 dark:text-zinc-500">Logged in as</p>
                      <p className="text-sm font-bold text-stone-900 dark:text-white truncate">{currentUser.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-350 uppercase tracking-wider">
                        {currentUser.role.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => router.push("/profile")}
                      className="w-full text-left px-4 py-2 text-sm text-stone-700 dark:text-zinc-300 flex items-center gap-2 hover:bg-stone-50 dark:hover:bg-zinc-900/60 transition-colors"
                    >
                      <User className="w-4 h-4 text-stone-400" />
                      My Pilgrim Profile
                    </button>

                    <button
                      onClick={() => setShowSavedOnly(prev => !prev)}
                      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-stone-50 dark:hover:bg-zinc-900/60 transition-colors ${showSavedOnly ? 'text-rose-700 dark:text-rose-350 font-bold' : 'text-stone-700 dark:text-zinc-300'}`}
                    >
                      <Heart className={`w-4 h-4 ${showSavedOnly ? 'fill-rose-700 text-rose-700' : ''}`} />
                      {showSavedOnly ? 'Showing Saved Only' : 'Show Saved Items'}
                    </button>

                    {(currentUser.role === 'local_admin' || currentUser.role === 'master_admin') && (
                      <button
                        onClick={() => router.push("/admin")}
                        className="w-full text-left px-4 py-2 text-sm text-emerald-700 dark:text-emerald-350 flex items-center gap-2 hover:bg-stone-50 dark:hover:bg-zinc-900/60 transition-colors font-bold"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-450" />
                        Admin Dashboard
                      </button>
                    )}

                    <button
                      onClick={async () => {
                        if (auth) await auth.signOut();
                        setShowSavedOnly(false);
                        setIsAdminDashboardOpen(false);
                        setIsUserManagementOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-650 dark:text-red-400 flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors border-t border-stone-100 dark:border-white/5 mt-1 pt-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Row 2: Full-width search bar */}
            <div className="w-full">
              <AISearchBar onSearch={handleAISearch} isLoading={isLoading} loadingMessage={loadingMessage} compact={true} discoveryLayer={discoveryLayer} />
            </div>
 
            {/* Row 3: AI interpreted chips */}
            <div className="flex items-center flex-wrap gap-2 text-sm w-full">
              <Sparkles className="w-4 h-4 text-rose-500 animate-pulse shrink-0 hidden md:block" />
              <span className="text-stone-600 dark:text-zinc-300 font-semibold shrink-0 hidden md:inline text-xs">AI:</span>
              <div className="flex flex-wrap gap-1.5 flex-1 w-full">
                {aiSummary ? (
                  <span className="bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/30 px-3 py-1 rounded-full font-medium truncate max-w-full tag-pop">{aiSummary}</span>
                ) : (
                  <span className="bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/30 px-3 py-1 rounded-full font-medium whitespace-nowrap tag-pop">{mode === 'route' ? 'Route Search' : 'Nearby Search'}</span>
                )}
                {discoveryLayer === "events" ? (
                  activeEventCategories.map(c => (
                    <span key={c} className="bg-stone-100 dark:bg-zinc-900 border border-stone-200 dark:border-white/5 text-stone-700 dark:text-zinc-300 px-3 py-1 rounded-full whitespace-nowrap flex items-center gap-1.5 tag-pop">
                      {c} 
                      <button 
                        onClick={() => {
                          setActiveEventCategories(prev => prev.filter(x => x !== c));
                        }} 
                        className="hover:text-rose-600 dark:hover:text-rose-400"
                      >
                        <X className="w-3 h-3"/>
                      </button>
                    </span>
                  ))
                ) : (
                  activeCategories.map(c => (
                    <span key={c} className="bg-stone-100 dark:bg-zinc-900 border border-stone-200 dark:border-white/5 text-stone-700 dark:text-zinc-300 px-3 py-1 rounded-full whitespace-nowrap flex items-center gap-1.5 tag-pop">
                      {c} 
                      <button onClick={() => toggleCategory(c)} className="hover:text-rose-600 dark:hover:text-rose-400"><X className="w-3 h-3"/></button>
                    </span>
                  ))
                )}
                <span className="bg-stone-100 dark:bg-zinc-900 border border-stone-200 dark:border-white/5 text-stone-700 dark:text-zinc-300 px-3 py-1 rounded-full whitespace-nowrap">
                  {maxDistance === 10000 ? "Any distance" : `Within ${maxDistance} mi`}
                </span>
              </div>
            </div>
          </div>
        )}

        {clarificationMsg && hasSearched && (
          <div className="absolute top-full left-0 right-0 z-10 w-full max-w-3xl mx-auto mt-2 bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-500/25 text-amber-800 dark:text-amber-200 p-4 rounded-xl flex items-center justify-between shadow-lg dark:shadow-2xl backdrop-blur-xl">
             <div className="flex items-center gap-3 font-medium">
               <Sparkles className="w-5 h-5 text-amber-500 dark:text-amber-400 animate-pulse" />
               {clarificationMsg}
             </div>
             <button onClick={() => setClarificationMsg("")} className="text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-100"><X className="w-5 h-5"/></button>
          </div>
        )}
      </header>

      {/* Full Screen Advanced Search Drawer / Bottom Sheet */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex md:justify-end bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowFilters(false)}>
          <div className="w-full md:w-96 bg-white dark:bg-zinc-950/95 h-[85vh] md:h-full mt-auto md:mt-0 shadow-2xl flex flex-col drawer-slide-up md:drawer-slide-left rounded-t-3xl md:rounded-none border-t md:border-t-0 md:border-l border-stone-200 dark:border-white/5" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-stone-200 dark:border-white/5 flex justify-between items-center bg-stone-50 dark:bg-zinc-900/60 rounded-t-3xl md:rounded-none">
              <h3 className="font-bold text-lg text-stone-900 dark:text-white flex items-center gap-2"><Filter className="w-5 h-5 text-rose-600 dark:text-rose-500"/> Advanced Search</h3>
              <button onClick={() => setShowFilters(false)} className="p-2 bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400 border border-stone-200 dark:border-white/5 rounded-full hover:bg-stone-200 dark:hover:bg-zinc-700 hover:text-stone-900 dark:hover:text-white transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6 custom-scrollbar">
              {/* Discovery Layer Toggle */}
              <div>
                <h4 className="text-[10px] font-bold text-stone-500 dark:text-zinc-500 uppercase tracking-widest mb-2.5 font-mono">Discovery Layer</h4>
                <DiscoveryLayerToggle 
                  activeLayer={discoveryLayer} 
                  onChange={(layer) => {
                    setDiscoveryLayer(layer);
                    setSelectedChurch(null);
                    setSelectedEvent(null);
                  }}
                  className="w-full justify-between"
                />
              </div>

              {/* Search Mode Toggle */}
              <div>
                <h4 className="text-[10px] font-bold text-stone-500 dark:text-zinc-500 uppercase tracking-widest mb-2.5 font-mono">Search Mode</h4>
                <div className="flex bg-stone-100 dark:bg-zinc-900 p-0.5 rounded-xl border border-stone-200 dark:border-white/5">
                  <button 
                    type="button"
                    onClick={() => setMode('nearby')}
                    className={`flex-1 py-2 text-xs rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${mode === 'nearby' ? 'bg-rose-900 text-white shadow border border-rose-500/20' : 'text-stone-500 dark:text-zinc-400 hover:bg-stone-200/60 dark:hover:bg-zinc-800/40'}`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-rose-400" /> AI / Nearby
                  </button>
                  <button 
                    type="button"
                    onClick={() => setMode('route')}
                    className={`flex-1 py-2 text-xs rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${mode === 'route' ? 'bg-rose-900 text-white shadow border border-rose-500/20' : 'text-stone-500 dark:text-zinc-400 hover:bg-stone-200/60 dark:hover:bg-zinc-800/40'}`}
                  >
                    <CornerUpRight className="w-3.5 h-3.5" /> Along Route
                  </button>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-white mb-3">Manual Search</h4>
                {mode === 'nearby' ? (
                  <form onSubmit={(e) => { handleSearchNearby(e); setShowFilters(false); }} className="relative flex-1 w-full flex bg-stone-100 dark:bg-zinc-900/40 border border-stone-200 dark:border-white/5 rounded-xl focus-within:border-rose-500/45 focus-within:ring-1 focus-within:ring-rose-500/30 focus-within:bg-white dark:focus-within:bg-zinc-900/90 transition-all">
                    <AutocompleteInput 
                      placeholder="Search city or ZIP..." 
                      value={searchNearby}
                      onChange={setSearchNearby}
                      onSelectCoords={setSearchNearbyCoords}
                      icon={Search}
                      className="rounded-xl"
                    />
                    <button type="button" onClick={() => { handleLocateMe(); setShowFilters(false); }} className="shrink-0 p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/20 rounded-full transition-colors my-1 mx-1" title="Use My Location">
                      <LocateFixed className="w-5 h-5" />
                    </button>
                    <button disabled={isLoading} type="submit" className="shrink-0 m-1 bg-rose-900 border border-rose-500/20 text-white px-4 rounded-lg text-sm font-semibold hover:bg-rose-800 disabled:opacity-50 transition-colors">
                      Go
                    </button>
                  </form>
                ) : (
                  <form onSubmit={(e) => { handleSearchRoute(e); setShowFilters(false); }} className="flex flex-col gap-2 w-full bg-stone-100 dark:bg-zinc-900/40 p-3 rounded-xl border border-stone-200 dark:border-white/5 focus-within:border-rose-500/45 focus-within:ring-1 focus-within:ring-rose-500/30 focus-within:bg-white dark:focus-within:bg-zinc-900/90 transition-all">
                    <AutocompleteInput 
                      placeholder="From (e.g. SF)" 
                      value={routeFrom}
                      onChange={setRouteFrom}
                      onSelectCoords={setRouteFromCoords}
                      className="bg-stone-50 dark:bg-zinc-950/60 border border-stone-200 dark:border-white/5 rounded-lg"
                    />
                    <AutocompleteInput 
                      placeholder="To (e.g. LA)" 
                      value={routeTo}
                      onChange={setRouteTo}
                      onSelectCoords={setRouteToCoords}
                      className="bg-stone-50 dark:bg-zinc-950/60 border border-stone-200 dark:border-white/5 rounded-lg"
                    />
                    <button disabled={isLoading} type="submit" className="mt-2 bg-rose-900 border border-rose-500/20 text-white px-5 py-2.5 w-full rounded-lg font-semibold hover:bg-rose-800 disabled:opacity-50 transition-colors">
                      Search Route
                    </button>
                  </form>
                )}
              </div>

              {discoveryLayer === "events" ? (
                <EventFilters
                  activeCategories={activeEventCategories}
                  toggleCategory={(cat) => {
                    setActiveEventCategories(prev =>
                      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                    );
                  }}
                  clearCategories={() => setActiveEventCategories([])}
                  maxDistance={maxDistance}
                  setMaxDistance={setMaxDistance}
                  activeAudience={activeAudience}
                  setActiveAudience={setActiveAudience}
                  activeHostType={activeHostType}
                  setActiveHostType={setActiveHostType}
                  verifiedOnly={verifiedOnly}
                  setVerifiedOnly={setVerifiedOnly}
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
                />
              ) : (
                <>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 dark:text-white mb-3">Distance ({mode === 'route' ? 'Max Detour' : 'Search Radius'})</h4>
                    <div className="flex flex-wrap gap-2">
                      {DISTANCES.map(d => (
                        <button 
                          key={d} 
                          onClick={() => setMaxDistance(d)}
                          className={`px-4 py-2 text-sm rounded-xl border transition-colors font-medium ${maxDistance === d ? 'bg-rose-900 text-white border-rose-600/45' : 'bg-stone-100 dark:bg-zinc-900 border-stone-200 dark:border-white/5 text-stone-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-800 hover:text-stone-900 dark:hover:text-white'}`}
                        >
                          {d === 10000 ? "Any distance" : `${d} miles`}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 dark:text-white mb-3">Communities</h4>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(cat => (
                        <button 
                          key={cat}
                          onClick={() => toggleCategory(cat)}
                          className={`px-4 py-2 text-sm rounded-xl border transition-colors font-medium flex items-center gap-1.5 ${activeCategories.includes(cat) ? 'bg-rose-100 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/30 text-rose-700 dark:text-rose-300' : 'bg-stone-100 dark:bg-zinc-900 hover:bg-stone-200 dark:hover:bg-zinc-800 text-stone-600 dark:text-zinc-400 border-stone-200 dark:border-white/5 hover:text-stone-900 dark:hover:text-white'}`}
                        >
                          {activeCategories.includes(cat) ? <Check className="w-4 h-4 text-rose-600 dark:text-rose-455" /> : <Plus className="w-4 h-4 text-stone-400 dark:text-zinc-550" />}
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="p-5 border-t border-stone-200 dark:border-white/5 bg-stone-50 dark:bg-zinc-900/60">
               <button onClick={() => setShowFilters(false)} className="w-full py-3 bg-rose-900 hover:bg-rose-800 border border-rose-500/20 text-white rounded-xl font-bold transition-colors shadow-[0_0_20px_rgba(190,18,60,0.15)]">Show Results</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content (Only visible if hasSearched) */}
      {hasSearched && (
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">
          {/* Left Panel: List */}
          <div className={`w-full md:w-[400px] bg-stone-50 dark:bg-zinc-950 border-r border-stone-200 dark:border-white/5 overflow-y-auto px-5 py-4 flex flex-col gap-4 z-10 shadow-[4px_0_20px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_30px_rgba(0,0,0,0.65)] custom-scrollbar pb-24 md:pb-4 ${mobileView === 'map' ? 'hidden md:flex' : 'flex'}`}>
            
            <div className="text-sm font-semibold text-stone-500 dark:text-zinc-400 flex justify-between items-center px-1 mb-2">
              <span>
                {discoveryLayer === "events"
                  ? (processedEvents.length > 50 ? `Showing top 50 of ${processedEvents.length} events` : `Showing ${processedEvents.length} events`)
                  : (processedData.length > 50 ? `Showing top 50 of ${processedData.length} matches` : `Showing ${processedData.length} matches`)
                }
              </span>
              
              <div className="flex items-center gap-1.5 shrink-0">
                {currentUser && (savedMasses.length > 0 || savedEvents.length > 0) && (
                  <button
                    onClick={() => setShowSavedOnly(prev => !prev)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all flex items-center gap-1 ${
                      showSavedOnly
                        ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-805 dark:text-rose-300 border-rose-300 dark:border-rose-900/40'
                        : 'bg-stone-100 dark:bg-zinc-900 text-stone-600 dark:text-zinc-400 border-stone-200 dark:border-white/5 hover:bg-stone-200 dark:hover:bg-zinc-800'
                    }`}
                    title="Toggle Saved Only"
                  >
                    <Heart className={`w-3 h-3 ${showSavedOnly ? 'fill-rose-800 dark:fill-rose-350 text-rose-800 dark:text-rose-300' : ''}`} />
                    <span>Saved ({discoveryLayer === 'masses' ? savedMasses.length : savedEvents.length})</span>
                  </button>
                )}

                {discoveryLayer === "masses" && selectedStops.length > 0 && (
                  <span className="bg-emerald-950/40 text-emerald-350 px-2.5 py-1 rounded-full text-[11px] font-bold border border-emerald-900/30">
                    {selectedStops.length} Stop{selectedStops.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {currentUser && (currentUser.role === 'local_admin' || currentUser.role === 'master_admin') && isAdminDashboardOpen ? (
              <div className="flex flex-col gap-4 bg-stone-100/70 dark:bg-zinc-900/25 border border-stone-200 dark:border-white/5 rounded-2xl p-4 mb-2 shadow-sm animate-fade-in shrink-0">
                <div className="flex items-center justify-between border-b border-stone-200 dark:border-white/5 pb-2.5">
                  <div className="flex items-center gap-2 text-stone-900 dark:text-white">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-450" />
                    <span className="font-bold text-sm">Moderation Portal</span>
                  </div>
                  <button 
                    onClick={() => setIsAdminDashboardOpen(false)}
                    className="text-stone-400 hover:text-stone-700 dark:hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="text-[10px] text-stone-500 dark:text-zinc-400 font-bold uppercase tracking-wider flex justify-between items-center">
                  <span>Scope</span>
                  <span className="bg-rose-50 dark:bg-rose-950/50 text-rose-750 dark:text-rose-350 px-2 py-0.5 rounded border border-rose-100 dark:border-rose-900/20">{currentUser.role === 'master_admin' ? 'Global / All States' : `${currentUser.state || 'CA'} State Only`}</span>
                </div>
                
                <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                  {adminPendingEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-stone-400 dark:text-zinc-555 gap-2">
                      <ClipboardCheck className="w-9 h-9 text-emerald-500 dark:text-emerald-455 opacity-60 animate-bounce" />
                      <span className="text-xs font-semibold">All caught up! No pending events.</span>
                    </div>
                  ) : (
                    adminPendingEvents.map(event => (
                      <div key={event.id} className="bg-white dark:bg-zinc-900 border border-stone-250 dark:border-white/5 rounded-xl p-3 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
                        <div>
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/45 text-rose-800 dark:text-rose-350 uppercase border border-rose-200/50 dark:border-rose-900/20">
                            {event.category}
                          </span>
                          <h4 className="font-bold text-xs text-stone-900 dark:text-white mt-1.5 leading-snug">{event.title}</h4>
                          <p className="text-[10px] text-stone-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">{event.description}</p>
                        </div>
                        
                        <div className="text-[10px] text-stone-600 dark:text-zinc-450 flex flex-col gap-1 border-t border-stone-100 dark:border-white/5 pt-2 font-medium">
                          <div><span className="font-bold text-stone-550">Location:</span> {event.locationName || event.address}, {event.city}, {event.state}</div>
                          <div><span className="font-bold text-stone-550">Date:</span> {new Date(event.startDateTime).toLocaleDateString("en-US")} {new Date(event.startDateTime).toLocaleTimeString("en-US", {hour: '2-digit', minute:'2-digit'})}</div>
                          <div><span className="font-bold text-stone-550">Host:</span> {event.hostName}</div>
                        </div>
                        
                        <div className="flex gap-2 border-t border-stone-100 dark:border-white/5 pt-2">
                          <button
                            onClick={() => handleApproveEvent(event.id)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] py-2 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleRejectEvent(event.id)}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] py-2 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            {discoveryLayer === "events" && (
              <button 
                onClick={() => setShowSubmitForm(true)}
                className="w-full bg-rose-900/10 hover:bg-rose-900/20 text-rose-700 dark:text-rose-350 border border-dashed border-rose-300 dark:border-rose-900/50 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.01] transition-all shrink-0 mb-2 shadow-sm animate-pulse"
              >
                <Plus className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                Submit Catholic Event
              </button>
            )}

            {/* Disambiguation Card */}
            {disambiguationOptions && disambiguationOptions.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/20 backdrop-blur-md rounded-2xl p-4 mb-2 shadow-md dark:shadow-xl">
                <div className="flex items-start gap-3">
                  <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-xl shrink-0 border border-amber-200 dark:border-amber-500/20">
                    <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400 animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm mb-1">Which <span className="italic">{disambiguationLocation}</span> did you mean?</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">I found multiple locations with that name. Please pick one:</p>
                    <div className="flex flex-col gap-2">
                      {disambiguationOptions.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => {
                            setDisambiguationOptions(null);
                            setDisambiguationLocation(null);
                            handleAISearch(`TLM near ${opt}`);
                          }}
                          className="w-full text-left text-sm font-medium bg-white dark:bg-zinc-900/80 border border-stone-200 dark:border-white/5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-stone-700 dark:text-zinc-300 hover:text-rose-700 dark:hover:text-white px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
                        >
                          <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => { setDisambiguationOptions(null); setDisambiguationLocation(null); }} className="text-amber-600 dark:text-amber-500 hover:text-amber-900 dark:hover:text-amber-800 shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            
            {resultsSummary && !disambiguationOptions && (
              <div className="bg-gradient-to-br from-rose-50 dark:from-rose-950/20 to-stone-50 dark:to-zinc-900/20 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-4 mb-2 shadow-sm dark:shadow-xl backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <div className="bg-rose-100 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-850/30 p-2 rounded-xl shrink-0">
                    <Sparkles className="w-4 h-4 text-rose-600 dark:text-rose-455 animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">AI Summary</p>
                    <p className="text-sm text-stone-700 dark:text-zinc-200 leading-relaxed">
                      {resultsSummaryExpanded
                        ? resultsSummary
                        : (resultsSummary.length > 165 ? resultsSummary.slice(0, 160) + '...' : resultsSummary)}
                    </p>
                    {resultsSummary.length > 165 && (
                      <button
                        onClick={() => setResultsSummaryExpanded(!resultsSummaryExpanded)}
                        className="mt-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-350 flex items-center gap-1 transition-colors"
                      >
                        {resultsSummaryExpanded ? <><ChevronUp className="w-3 h-3"/>Show less</> : <><ChevronDown className="w-3 h-3"/>Read more</>}
                      </button>
                    )}
                  </div>
                  <button onClick={() => setResultsSummary("")} className="text-stone-400 dark:text-zinc-550 hover:text-stone-700 dark:hover:text-zinc-350 shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {discoveryLayer === "events" ? (
              processedEvents.slice(0, 50).map((event, idx) => (
                <EventCard
                  key={event.id}
                  index={idx}
                  event={event}
                  isSaved={savedEvents.includes(event.id)}
                  onToggleSave={(e) => handleToggleSaveEvent(e, event.id)}
                  isRsvpd={getIsEventRsvpd(event.id)}
                  onToggleRsvp={(e) => { e.stopPropagation(); handleToggleRsvp(event.id); }}
                  onShowDetails={() => setDetailedEventModal(event)}
                  isSelected={selectedEvent?.id === event.id}
                  onClick={() => {
                    setSelectedEvent(event);
                    if (event.latitude && event.longitude) {
                      animateMapTo(event.latitude, event.longitude, 13);
                    }
                    if (window.innerWidth < 768) setMobileView('map');
                  }}
                />
              ))
            ) : (
              displayedData.map((church, idx) => (
                <ChurchCard 
                  key={idx}
                  index={idx}
                  church={church} 
                  isStop={selectedStops.some(s => s.church_name === church.church_name)}
                  isSelected={selectedChurch?.church_name === church.church_name}
                  toggleStop={toggleStop}
                  isSaved={savedMasses.includes(encodeURIComponent(church.church_name + '|' + church.address))}
                  onToggleSave={(e: React.MouseEvent) => handleToggleSaveMass(e, church)}
                  onClick={() => {
                    setSelectedChurch(church);
                    animateMapTo(church.latitude, church.longitude, 13);
                    if(window.innerWidth < 768) setMobileView('map');
                  }}
                />
              ))
            )}
            
            {discoveryLayer === "masses" && processedData.length > 50 && (
              <div className="text-center py-4 text-stone-500 dark:text-zinc-500 text-sm font-medium">
                Zoom map or refine search to see more results
              </div>
            )}

            {discoveryLayer === "events" && processedEvents.length > 50 && (
              <div className="text-center py-4 text-stone-500 dark:text-zinc-500 text-sm font-medium">
                Zoom map or refine search to see more events
              </div>
            )}

            {discoveryLayer === "masses" && processedData.length === 0 && (
              <div className="text-center text-stone-500 dark:text-zinc-400 py-16 px-4 bg-stone-100 dark:bg-zinc-900/20 rounded-2xl border border-dashed border-stone-300 dark:border-zinc-800 shrink-0">
                <MapPin className="w-10 h-10 mx-auto text-rose-455/50 mb-3 animate-pulse" />
                <p className="font-semibold text-stone-850 dark:text-zinc-200">No locations found</p>
                <p className="text-sm text-stone-500 dark:text-zinc-500 mt-1">Try expanding your radius or using fewer filters.</p>
                <button onClick={() => {setMaxDistance(10000); setActiveCategories([])}} className="mt-4 px-5 py-2 bg-stone-200 hover:bg-stone-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-stone-300 dark:border-white/5 rounded-full text-sm font-semibold transition-all text-stone-700 dark:text-zinc-300 shadow-sm">
                  Clear Filters
                </button>
              </div>
            )}

            {discoveryLayer === "events" && processedEvents.length === 0 && (
              <EventEmptyState
                onClearFilters={() => {
                  setMaxDistance(10000);
                  setActiveEventCategories([]);
                  setActiveAudience("any");
                  setActiveHostType("any");
                  setVerifiedOnly(false);
                  setDateFilter("all");
                }}
                onSubmitEventClick={() => setShowSubmitForm(true)}
              />
            )}
          </div>

          {/* Right Panel: Map */}
          <div className={`flex-1 bg-stone-200 dark:bg-zinc-950 relative border-l border-stone-200 dark:border-white/5 ${mobileView === 'list' ? 'hidden md:block' : 'block'}`}>
            <Map
              ref={mapRef}
              initialViewState={viewState}
              onClick={() => {
                setSelectedChurch(null);
                setSelectedEvent(null);
              }}
              mapStyle={theme === 'dark' ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"}
            >
              {routeLine && (
                <Source id="route" type="geojson" data={{
                  type: 'Feature',
                  properties: {},
                  geometry: { type: 'LineString', coordinates: routeLine }
                }}>
                  <Layer 
                    id="route-layer" 
                    type="line" 
                    layout={{ 'line-join': 'round', 'line-cap': 'round' }} 
                    paint={{ 'line-color': '#be123c', 'line-width': 6, 'line-opacity': 0.8 }} 
                  />
                </Source>
              )}

              {searchedCenter && !routeLine && (
                <Marker longitude={searchedCenter.lon} latitude={searchedCenter.lat}>
                  <div className="w-5 h-5 bg-rose-500 rounded-full border-4 border-white shadow-[0_0_20px_rgba(244,63,94,0.65)] animate-pulse" />
                </Marker>
              )}

              {discoveryLayer === "events" ? (
                processedEvents.slice(0, 50).map((event) => {
                  if (event.latitude == null || event.longitude == null) return null;
                  const isSelected = selectedEvent?.id === event.id;
                  
                  return (
                    <Marker
                      key={event.id}
                      longitude={event.longitude}
                      latitude={event.latitude}
                      style={{ zIndex: isSelected ? 10 : 1 }}
                    >
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                        }}
                        className={`transition-all duration-300 cursor-pointer ${isSelected ? 'scale-120 -translate-y-2' : 'hover:scale-110 hover:-translate-y-1'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 border-white transition-all ${isSelected ? 'bg-rose-700 text-white shadow-[0_0_20px_rgba(190,18,60,0.85)] scale-110 animate-pulse' : 'bg-rose-900 text-rose-100 hover:bg-rose-800 shadow-[0_4px_10px_rgba(0,0,0,0.3)]'}`}>
                          <Calendar className="w-4 h-4" />
                        </div>
                      </div>
                    </Marker>
                  );
                })
              ) : (
                displayedData.map((church, idx) => {
                  const isSelected = selectedChurch?.church_name === church.church_name;
                  const isStop = selectedStops.some(s => s.church_name === church.church_name);
                  
                  return (
                    <Marker
                      key={idx}
                      longitude={church.longitude}
                      latitude={church.latitude}
                      style={{ zIndex: isSelected ? 10 : isStop ? 5 : 1 }}
                    >
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedChurch(church);
                        }}
                        className={`transition-all duration-300 cursor-pointer ${isSelected ? 'scale-150 -translate-y-3 pin-glow-selected' : 'hover:scale-125 hover:-translate-y-1 drop-shadow-lg'}`}
                      >
                        <MapPin className={`w-8 h-8 ${isStop ? 'fill-emerald-500 text-stone-900 dark:text-zinc-950' : isSelected ? 'fill-rose-600 text-white' : 'fill-white dark:fill-zinc-900 text-rose-600 dark:text-rose-500'}`} />
                      </div>
                    </Marker>
                  );
                })
              )}

              {selectedChurch && (
                <Popup
                  longitude={selectedChurch.longitude}
                  latitude={selectedChurch.latitude}
                  offset={18}
                  onClose={() => setSelectedChurch(null)}
                  className="z-20 hidden md:block"
                  maxWidth="340px"
                >
                  <div onClick={(e) => e.stopPropagation()} className="w-[300px] flex flex-col h-full bg-transparent p-5">
                    {selectedChurch.image_url && (
                      <div className="w-[calc(100%+40px)] -mt-5 -mx-5 h-36 mb-4 overflow-hidden rounded-t-xl bg-stone-100 dark:bg-zinc-900/50">
                        <img src={selectedChurch.image_url} alt={selectedChurch.church_name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <h3 className="font-bold leading-tight text-xl mb-1.5">{selectedChurch.church_name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 mb-3">
                      <span className="text-[10px] uppercase tracking-wider bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/30 px-2 py-0.5 rounded-md font-bold">
                        {selectedChurch.category_normalized || "Unknown"}
                      </span>
                      {(selectedChurch.distanceFromRoute !== undefined) ? (
                        <>
                          <span className="text-[10px] uppercase tracking-wider bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                            <CornerUpRight className="w-3 h-3" />
                            {selectedChurch.distanceFromRoute.toFixed(1)} mi detour
                          </span>
                          {selectedChurch.detourMinutes !== undefined && (
                            <span className="text-[10px] uppercase tracking-wider bg-stone-100 dark:bg-zinc-800/60 text-stone-600 dark:text-zinc-300 border border-stone-200 dark:border-zinc-700/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                              <Car className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                              {selectedChurch.detourMinutes < 60
                                ? `+${selectedChurch.detourMinutes} min`
                                : `+${Math.floor(selectedChurch.detourMinutes/60)}h ${selectedChurch.detourMinutes%60}m`}
                            </span>
                          )}
                        </>
                      ) : selectedChurch.distanceFromOrigin !== undefined ? (
                        <span className="text-[10px] uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/30 px-2 py-0.5 rounded-md font-bold">
                          {selectedChurch.distanceFromOrigin.toFixed(1)} mi away
                        </span>
                      ) : null}
                    </div>
                    
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedChurch.church_name + ', ' + selectedChurch.address + ', ' + selectedChurch.city)}`}
                      target="_blank" 
                      rel="noreferrer" 
                      className="group/address flex items-start gap-2.5 bg-stone-100/80 dark:bg-zinc-950/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 p-2.5 rounded-xl border border-stone-200 dark:border-white/5 hover:border-rose-300 dark:hover:border-rose-900/35 transition-all duration-300 w-full mb-3"
                    >
                      <div className="bg-stone-200 dark:bg-zinc-900/80 p-1.5 rounded-lg border border-stone-300 dark:border-white/5 shrink-0 text-rose-600 dark:text-rose-400 group-hover/address:bg-rose-900 group-hover/address:text-white transition-colors duration-300">
                        <CornerUpRight className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-[9px] font-bold text-stone-500 dark:text-zinc-500 uppercase tracking-wider">Directions</span>
                        <span className="text-xs text-stone-600 dark:text-zinc-300 group-hover/address:text-rose-700 dark:group-hover/address:text-rose-100 mt-0.5 leading-snug">{selectedChurch.address}, {selectedChurch.city}</span>
                      </div>
                    </a>
                    
                    {selectedChurch.hours && (
                      <div className="bg-stone-100/80 dark:bg-zinc-950/40 border border-stone-200 dark:border-white/5 rounded-xl p-3 mb-4 max-h-36 overflow-y-auto custom-scrollbar text-left flex items-start gap-2">
                        <Clock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0 animate-pulse" />
                        <p className="text-xs whitespace-pre-wrap leading-relaxed font-medium">
                          {formatMassTimes(selectedChurch.hours)}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4 border-t border-stone-200 dark:border-white/5 mt-auto">
                      <button 
                        onClick={() => toggleStop(selectedChurch)}
                        className={`flex-1 text-[11px] py-2.5 rounded-xl font-bold transition-all duration-350 flex items-center justify-center gap-1 shadow-md border ${
                          selectedStops.some(s => s.church_name === selectedChurch.church_name) 
                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/35 hover:bg-emerald-200 dark:hover:bg-emerald-900/40' 
                            : 'bg-stone-100 dark:bg-zinc-800/80 text-stone-700 dark:text-zinc-200 border-stone-200 dark:border-white/5 hover:bg-stone-200 dark:hover:bg-zinc-700/80'
                        }`}
                      >
                        {selectedStops.some(s => s.church_name === selectedChurch.church_name) ? <><Check className="w-3.5 h-3.5"/>Added</> : <><Plus className="w-3.5 h-3.5"/>Add Stop</>}
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleToggleSaveMass(e, selectedChurch); }}
                        className={`px-2.5 py-2.5 rounded-xl border transition-all duration-200 shrink-0 flex items-center justify-center ${
                          savedMasses.includes(encodeURIComponent(selectedChurch.church_name + '|' + selectedChurch.address))
                            ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-900/35' 
                            : 'bg-stone-100 dark:bg-zinc-800/80 text-stone-500 dark:text-zinc-400 border-stone-200 dark:border-white/5 hover:bg-stone-200 dark:hover:bg-zinc-700/80 hover:text-rose-700 dark:hover:text-rose-350'
                        }`}
                        title="Save Mass Location"
                      >
                        <Heart className={`w-4 h-4 ${savedMasses.includes(encodeURIComponent(selectedChurch.church_name + '|' + selectedChurch.address)) ? 'fill-rose-800 dark:fill-rose-700 text-rose-800 dark:text-rose-300' : ''}`} />
                      </button>
                      {selectedChurch.website && (
                        <a 
                          href={selectedChurch.website} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex-1 text-center bg-rose-900 hover:bg-rose-800 text-white shadow-md text-[11px] py-2.5 rounded-xl font-bold transition-all duration-350 flex items-center justify-center gap-1 border border-rose-800/20"
                        >
                          Website <ExternalLink className="w-3.5 h-3.5"/>
                        </a>
                      )}
                    </div>
                  </div>
                </Popup>
              )}

              {selectedEvent && selectedEvent.longitude != null && selectedEvent.latitude != null && (
                <Popup
                  longitude={selectedEvent.longitude}
                  latitude={selectedEvent.latitude}
                  offset={18}
                  onClose={() => setSelectedEvent(null)}
                  className="z-20 hidden md:block"
                  maxWidth="340px"
                >
                  <EventDetailPanel
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    isSaved={savedEvents.includes(selectedEvent.id)}
                    onToggleSave={() => handleToggleSaveEvent(null, selectedEvent.id)}
                    isRsvpd={getIsEventRsvpd(selectedEvent.id)}
                    onToggleRsvp={() => handleToggleRsvp(selectedEvent.id)}
                    onShowDetails={() => setDetailedEventModal(selectedEvent)}
                    isPopup={true}
                  />
                </Popup>
              )}
            </Map>

            {/* Mobile Bottom Sheet for Selected Church Details */}
            {selectedChurch && (
              <div onClick={(e) => e.stopPropagation()} className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.6)] border-t border-stone-200 dark:border-white/10 z-50 p-5 pb-8 drawer-slide-up flex flex-col max-h-[60vh] overflow-y-auto custom-scrollbar">
                {/* Grab Handle */}
                <div className="w-12 h-1 bg-stone-300 dark:bg-zinc-800 rounded-full mx-auto mb-4 shrink-0" />

                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-stone-900 dark:white leading-tight text-xl">{selectedChurch.church_name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2.5">
                      <span className="text-[10px] uppercase tracking-wider bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/30 px-2 py-0.5 rounded-md font-bold">
                        {selectedChurch.category_normalized || "Unknown"}
                      </span>
                      {(selectedChurch.distanceFromRoute !== undefined) ? (
                        <>
                          <span className="text-[10px] uppercase tracking-wider bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                            <CornerUpRight className="w-3 h-3" />
                            {selectedChurch.distanceFromRoute.toFixed(1)} mi detour
                          </span>
                          {selectedChurch.detourMinutes !== undefined && (
                            <span className="text-[10px] uppercase tracking-wider bg-stone-100 dark:bg-zinc-800/60 text-stone-600 dark:text-zinc-300 border border-stone-200 dark:border-zinc-700/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                              <Car className="w-3 h-3 text-rose-600 dark:text-rose-455" />
                              {selectedChurch.detourMinutes < 60
                                ? `+${selectedChurch.detourMinutes} min`
                                : `+${Math.floor(selectedChurch.detourMinutes/60)}h ${selectedChurch.detourMinutes%60}m`}
                            </span>
                          )}
                        </>
                      ) : selectedChurch.distanceFromOrigin !== undefined ? (
                        <span className="text-[10px] uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/30 px-2 py-0.5 rounded-md font-bold">
                          {selectedChurch.distanceFromOrigin.toFixed(1)} mi away
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleToggleSaveMass(e, selectedChurch); }}
                      className={`p-2 rounded-full border transition-all duration-200 ${
                        savedMasses.includes(encodeURIComponent(selectedChurch.church_name + '|' + selectedChurch.address))
                          ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-900/35 scale-105 shadow-sm' 
                          : 'bg-stone-100 dark:bg-zinc-900/80 text-stone-500 dark:text-zinc-400 border-stone-200 dark:border-white/5 hover:bg-stone-200 dark:hover:bg-zinc-850 hover:text-rose-700 dark:hover:text-rose-350 shadow-sm'
                      }`}
                      title="Save Mass Location"
                    >
                      <Heart className={`w-4 h-4 ${savedMasses.includes(encodeURIComponent(selectedChurch.church_name + '|' + selectedChurch.address)) ? 'fill-rose-800 dark:fill-rose-700 text-rose-800 dark:text-rose-300' : ''}`} />
                    </button>
                    <button 
                      onClick={() => setSelectedChurch(null)} 
                      className="p-2 bg-stone-100 dark:bg-zinc-900/80 hover:bg-stone-200 dark:hover:bg-zinc-800 rounded-full text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white transition-colors shrink-0 border border-stone-200 dark:border-white/5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {selectedChurch.image_url && (
                  <div className="w-full h-36 mt-4 overflow-hidden rounded-2xl bg-stone-100 dark:bg-zinc-900/30 border border-stone-200 dark:border-white/5 shrink-0">
                    <img 
                      src={selectedChurch.image_url} 
                      alt={selectedChurch.church_name} 
                      className="w-full h-full object-cover" 
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  </div>
                )}

                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedChurch.church_name + ', ' + selectedChurch.address + ', ' + selectedChurch.city)}`}
                  target="_blank" 
                  rel="noreferrer" 
                  className="group/address flex items-start gap-3 bg-stone-100 dark:bg-zinc-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 p-3 rounded-xl border border-stone-200 dark:border-white/5 hover:border-rose-300 dark:hover:border-rose-900/30 transition-all duration-300 w-full mt-4 shrink-0"
                >
                  <div className="bg-stone-200 dark:bg-zinc-950/80 p-2 rounded-lg border border-stone-300 dark:border-white/5 shrink-0 text-rose-600 text-rose-400 group-hover/address:bg-rose-900 group-hover/address:text-white transition-colors duration-300">
                    <CornerUpRight className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[9px] font-bold text-stone-500 dark:text-zinc-500 uppercase tracking-wider">Directions</p>
                    <p className="text-xs text-stone-600 dark:text-zinc-300 group-hover/address:text-rose-700 dark:group-hover/address:text-rose-100 leading-snug mt-0.5">{selectedChurch.address}, {selectedChurch.city}</p>
                  </div>
                </a>

                {selectedChurch.hours && (
                  <div className="mt-4 shrink-0 text-left">
                    <p className="text-[9px] font-bold text-stone-500 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Mass Schedule</p>
                    <div className="bg-stone-100 dark:bg-zinc-900/40 border border-stone-200 dark:border-white/5 rounded-xl p-3 max-h-32 overflow-y-auto custom-scrollbar flex items-start gap-2">
                      <Clock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-455 mt-0.5 shrink-0 animate-pulse" />
                      <p className="text-xs text-stone-700 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed font-medium">
                        {formatMassTimes(selectedChurch.hours)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-stone-200 dark:border-white/5 mt-6 shrink-0">
                  <button 
                    onClick={() => toggleStop(selectedChurch)}
                    className={`flex-1 text-sm py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-1.5 shadow-md border ${
                      selectedStops.some(s => s.church_name === selectedChurch.church_name) 
                        ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/35 hover:bg-emerald-200 dark:hover:bg-emerald-900/40' 
                        : 'bg-rose-900 text-white border-transparent hover:bg-rose-800 shadow-[0_4px_14px_rgba(190,18,60,0.25)]'
                    }`}
                  >
                    {selectedStops.some(s => s.church_name === selectedChurch.church_name) ? <><Check className="w-4 h-4"/>Added Stop</> : <><Plus className="w-4 h-4"/>Add as Stop</>}
                  </button>
                  {selectedChurch.website && (
                    <a 
                      href={selectedChurch.website} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex-1 text-center bg-stone-200 dark:bg-zinc-800/80 hover:bg-stone-300 dark:hover:bg-zinc-700/80 text-stone-800 dark:text-white border border-stone-300 dark:border-white/5 shadow-sm text-sm py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-1.5"
                    >
                      Website <ExternalLink className="w-4 h-4"/>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Mobile Bottom Sheet for Selected Event Details */}
            {selectedEvent && (
              <div onClick={(e) => e.stopPropagation()} className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.6)] border-t border-stone-200 dark:border-white/10 z-50 p-5 pb-8 drawer-slide-up flex flex-col max-h-[60vh] overflow-y-auto custom-scrollbar">
                {/* Grab Handle */}
                <div className="w-12 h-1 bg-stone-300 dark:bg-zinc-800 rounded-full mx-auto mb-4 shrink-0" />
                <EventDetailPanel
                  event={selectedEvent}
                  onClose={() => setSelectedEvent(null)}
                  isSaved={savedEvents.includes(selectedEvent.id)}
                  onToggleSave={() => handleToggleSaveEvent(null, selectedEvent.id)}
                  isRsvpd={getIsEventRsvpd(selectedEvent.id)}
                  onToggleRsvp={() => handleToggleRsvp(selectedEvent.id)}
                  onShowDetails={() => setDetailedEventModal(selectedEvent)}
                  isMobile={true}
                />
              </div>
            )}

            {/* Floating Mobile Open in Maps Button (Only visible when stops are added or search exists) */}
            <div className="md:hidden absolute top-4 right-4 z-40">
               {(mode === 'route' && routeLine) || (mode === 'nearby' && searchedCenter) ? (
                <a 
                  href={buildGoogleMapsUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="flex justify-center items-center gap-2 bg-rose-900 hover:bg-rose-800 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg transition-colors border border-rose-800/25"
                >
                  Maps <ExternalLink className="w-4 h-4" />
                </a>
              ) : null}
            </div>
          </div>

          {/* Floating Mobile Tab Switcher */}
          <div className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-40">
            <button 
              onClick={() => setMobileView(mobileView === 'list' ? 'map' : 'list')} 
              className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md text-stone-800 dark:text-white px-6 py-3 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex items-center gap-2 font-semibold border border-stone-200 dark:border-rose-500/25 hover:border-rose-400 dark:hover:border-rose-500/40 hover:bg-stone-50 dark:hover:bg-zinc-800/90 transition-all duration-300"
            >
              {mobileView === 'list' ? <><MapIcon className="w-5 h-5 text-rose-600 dark:text-rose-400"/> Show Map</> : <><List className="w-5 h-5 text-rose-600 dark:text-rose-400"/> Show List</>}
            </button>
          </div>
        </div>
      )}

      {showSubmitForm && (
          <EventSubmissionForm
            onClose={() => setShowSubmitForm(false)}
            onSubmit={async (newEvent, imageFile) => {
              if (!auth || !auth.isLoggedIn || !auth.firebaseUser) {
                setShowLoginModal(true);
                return;
              }
              const center = searchedCenter || { lat: 37.7749, lon: -122.4194 };
              const eventData: Omit<CatholicEvent, "id" | "distanceFromOrigin" | "distanceFromRoute" | "detourMinutes"> = {
                ...newEvent,
                status: "pending",
                verified: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                latitude: newEvent.latitude || center.lat + (Math.random() - 0.5) * 0.02,
                longitude: newEvent.longitude || center.lon + (Math.random() - 0.5) * 0.02,
                hostName: auth.userProfile?.displayName || auth.firebaseUser.email || "Anonymous",
              };
              try {
                const eventId = await submitEvent(
                  eventData,
                  auth.firebaseUser.uid,
                  auth.userProfile?.displayName || "User"
                );

                if (newEvent.themeColor) {
                  localStorage.setItem(`viam_event_theme_${eventId}`, newEvent.themeColor);
                }

                let uploadedUrl = undefined;
                if (imageFile) {
                  try {
                    uploadedUrl = await uploadEventImage(eventId, imageFile);
                    await updateEventImageUrl(eventId, uploadedUrl);
                  } catch (uploadErr) {
                    console.error("Cover image upload failed but event metadata was saved:", uploadErr);
                  }
                }

                const fullEvent: CatholicEvent = {
                  ...eventData,
                  id: eventId,
                  imageUrl: uploadedUrl || undefined,
                  themeColor: newEvent.themeColor,
                  rsvpCount: 0,
                  submittedBy: auth.firebaseUser.uid,
                  submitterDisplayName: auth.userProfile?.displayName || "User"
                };
                await loadDbEvents();
                setSelectedEvent(fullEvent);
                if (fullEvent.latitude && fullEvent.longitude) {
                  animateMapTo(fullEvent.latitude, fullEvent.longitude, 13);
                }
              } catch (err) {
                console.error("Failed to submit event to database:", err);
                throw err;
              }
            }}
          />
        )}
        {rsvpEvent && (
          <RsvpModal
            isOpen={!!rsvpEvent}
            event={rsvpEvent}
            currentUser={currentUser}
            onClose={() => setRsvpEvent(null)}
            onSubmit={handleRsvpSubmit}
          />
        )}
        {detailedEventModal && (
          <EventDetailModal
            isOpen={!!detailedEventModal}
            event={detailedEventModal}
            isSaved={savedEvents.includes(detailedEventModal.id)}
            onToggleSave={() => handleToggleSaveEvent(null, detailedEventModal.id)}
            isRsvpd={getIsEventRsvpd(detailedEventModal.id)}
            onToggleRsvp={() => handleToggleRsvp(detailedEventModal.id)}
            onClose={() => setDetailedEventModal(null)}
          />
        )}
        {showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-zinc-950/70 backdrop-blur-md">
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-stone-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 shadow-2xl backdrop-blur-2xl p-6 md:p-8 flex flex-col gap-5 animate-in fade-in zoom-in duration-300">
              <button 
                onClick={() => {
                  setShowLoginModal(false);
                  auth?.setAuthError("");
                }} 
                className="absolute top-4 right-4 p-2 rounded-full text-stone-400 dark:text-zinc-550 hover:text-stone-700 dark:hover:text-zinc-350 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center">
                <div className="inline-flex p-3 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 mb-2">
                  <Lock className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-extrabold text-stone-950 dark:text-white">Sign In to Viam</h2>
                <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1 leading-normal">
                  Access live Traditional Latin Mass maps, RSVP to community events, and manage bookmarks.
                </p>
              </div>

              {/* Supabase Magic Link Form */}
              {auth?.authError && (
                <div className="bg-rose-50 dark:bg-rose-950/45 border border-rose-200 dark:border-rose-900/30 rounded-xl px-4 py-3 text-xs font-semibold text-rose-800 dark:text-rose-350 leading-snug">
                  {auth.authError}
                </div>
              )}

              {!auth?.magicLinkSent ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!auth) return;
                    setIsSendingMagicLink(true);
                    try {
                      await auth.sendMagicLink(emailInput.trim());
                    } finally {
                      setIsSendingMagicLink(false);
                    }
                  }}
                  className="flex flex-col gap-4"
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-zinc-400">Email Address</label>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => {
                        setEmailInput(e.target.value);
                        auth?.setAuthError("");
                      }}
                      placeholder="name@domain.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-250 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/30 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-zinc-650 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-sm"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingMagicLink}
                    className="w-full mt-1.5 py-2.5 bg-[#be123c] hover:bg-[#9f1239] active:scale-[0.98] disabled:bg-stone-200 dark:disabled:bg-zinc-800 disabled:text-stone-400 dark:disabled:text-zinc-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-300 shadow-md flex items-center justify-center gap-1.5"
                  >
                    {isSendingMagicLink ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Magic Link…</span>
                      </>
                    ) : (
                      "Send Magic Link"
                    )}
                  </button>
                </form>
              ) : (
                <div className="flex flex-col items-center gap-4 text-center py-2 animate-in fade-in zoom-in duration-300">
                  <div className="p-3.5 bg-rose-500/10 text-[#be123c] rounded-2xl border border-rose-500/20">
                    <ClipboardCheck className="w-6 h-6 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-extrabold text-stone-900 dark:text-white">Check your email for a login link!</h3>
                  <p className="text-xs text-stone-500 dark:text-zinc-400 leading-relaxed max-w-xs">
                    We sent a secure, passwordless one-time login link to <span className="font-semibold text-stone-850 dark:text-stone-200">{emailInput}</span>. 
                    Clicking the link inside that email will automatically sign you in.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      auth?.setMagicLinkSent(false);
                      auth?.setAuthError("");
                    }}
                    className="mt-2 text-[11px] text-rose-800 dark:text-rose-400 hover:underline font-bold"
                  >
                    Try another email address
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Master Admin User Management Panel Modal */}
        {isUserManagementOpen && (
          <UserManagementPanel
            onClose={() => setIsUserManagementOpen(false)}
          />
        )}

        {/* Toast Notification */}
        {toast && (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-xl shadow-xl border backdrop-blur-xl text-sm font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            toast.type === 'error'
              ? 'bg-red-50/95 dark:bg-red-950/95 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/50'
              : 'bg-white/95 dark:bg-zinc-900/95 text-stone-800 dark:text-white border-stone-200 dark:border-white/10'
          }`}>
            {toast.type === 'error'
              ? <X className="w-4 h-4 text-red-500" />
              : <Heart className="w-4 h-4 text-[#be123c] fill-[#be123c]" />}
            {toast.msg}
          </div>
        )}
    </div>
  );
}

export default function Home() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#09090b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-stone-600 dark:text-zinc-400">Loading finder...</span>
        </div>
      </div>
    }>
      <HomeContent />
    </React.Suspense>
  );
}

