"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Map, { Marker, Popup, Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Search, MapPin, ExternalLink, Plus, Check, Filter, CornerUpRight, LocateFixed, Map as MapIcon, List, Sparkles, X, MessageSquare, ChevronDown, ChevronUp, Car, Loader2, Clock, Sun, Moon } from "lucide-react";
import { haversineDistance, minDistanceToRoute } from "@/lib/geo";
import { AISearchBar } from "@/components/search/AISearchBar";
import { ParsedSearchIntent } from "@/types/searchIntent";
import { geminiSearchParser } from "@/lib/search/geminiSearchParser";
import { generateResultsSummary } from "@/lib/search/generateResultsSummary";
import { parseNaturalLanguageSearch } from "@/lib/search/parseNaturalLanguageSearch";

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
const ChurchCard = ({ church, isStop, toggleStop, onClick, isSelected, index }: any) => {
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
              <Car className="w-3 h-3 text-rose-600 dark:text-rose-450" />
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
            <Clock className="w-4 h-4 text-rose-600 dark:text-rose-450 mt-0.5 shrink-0 animate-pulse" />
            <div className="text-sm text-stone-700 dark:text-zinc-200 font-medium leading-relaxed line-clamp-3 whitespace-pre-line">
              {hoursText}
            </div>
          </div>
        )}

        <div className="mt-3.5 flex items-start gap-1.5 text-stone-500 dark:text-zinc-400">
          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-stone-400 dark:text-zinc-500" />
          <span className="text-xs leading-snug">{church.address}, {church.city}</span>
        </div>
      </div>
    </div>
  );
};


export default function Home() {
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
  const triggerResultsSummary = async (churches: any[], context: string, total: number) => {
    if (churches.length === 0) return;
    try {
      const summary = await generateResultsSummary(churches, context, total);
      if (summary) setResultsSummary(summary);
    } catch {}
  };


  const processedData = useMemo(() => {
    let processed = [...data];

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
  }, [mode, searchedCenter, routeLine, data, maxDistance, activeCategories]);

  // Keep a ref always in sync so async callbacks can access fresh data
  useEffect(() => {
    processedDataRef.current = processedData;
  }, [processedData]);

  // Called after a search completes to generate AI summary
  const triggerResultsSummaryFromQuery = (query: string) => {
    setTimeout(async () => {
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
    <div className={`flex flex-col h-[100dvh] overflow-hidden relative transition-colors duration-300 ${theme === 'dark' ? 'dark bg-zinc-950 text-zinc-200' : 'bg-stone-50 text-stone-900'}`}>
      {!hasSearched && (
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
          ? 'flex-none border-b border-stone-200 dark:border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)] py-3.5 bg-white/75 dark:bg-zinc-900/75 backdrop-blur-xl w-full' 
          : 'flex-1 overflow-y-auto w-full h-full pt-12 pb-16 custom-scrollbar bg-transparent'
      }`}>
        
        {!hasSearched ? (
          <div className="w-full max-w-3xl my-auto flex flex-col items-center py-6 relative">
            {/* Glowing Ambient Background Orb */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full viam-glow-orb pulse-glow-bg z-0" />
            
            <div className="text-center mb-8 hero-animate relative z-10">
              <h1 className="text-6xl font-serif font-bold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-b from-stone-900 via-stone-850 to-rose-600 dark:from-white dark:via-zinc-100 dark:to-rose-500 drop-shadow-[0_4px_30px_rgba(190,18,60,0.25)]">Viam</h1>
              <p className="text-lg text-stone-600 dark:text-zinc-400 font-medium">Find the Traditional Latin Mass near you or along your route.</p>
            </div>
            
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
                <AISearchBar onSearch={handleAISearch} isLoading={isLoading} loadingMessage={loadingMessage} />
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

            {/* Nearby TLM Preview Feed */}
            {mode === 'nearby' && nearbyPreview.length > 0 && (
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
                  See all nearby →
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full flex flex-col gap-2.5">
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
              <div className="flex-1 min-w-0">
                <AISearchBar onSearch={handleAISearch} isLoading={isLoading} loadingMessage={loadingMessage} compact={true} />
              </div>
              <button onClick={() => setShowFilters(true)} className="p-2 rounded-full border border-stone-200 dark:border-white/5 bg-stone-100/80 dark:bg-zinc-900/60 hover:bg-stone-200 dark:hover:bg-zinc-800 text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white shrink-0 ml-1 transition-all" title="Advanced Filters">
                <Filter className="w-4 h-4"/>
              </button>
              <button
                type="button"
                onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                className="p-2 rounded-full border border-stone-200 dark:border-white/5 bg-stone-100/80 dark:bg-zinc-900/60 hover:bg-stone-200 dark:hover:bg-zinc-800 text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white shrink-0 ml-1 transition-all flex items-center justify-center"
                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-500 dark:text-zinc-400" />}
              </button>
            </div>
 
            <div className="flex items-center flex-wrap gap-2 text-sm pb-1 w-full">
              <Sparkles className="w-4 h-4 text-rose-500 animate-pulse shrink-0 hidden md:block" />
              <span className="text-stone-600 dark:text-zinc-300 font-semibold shrink-0 hidden md:inline">AI interpreted:</span>
              <div className="flex flex-wrap gap-2 flex-1 w-full">
                {aiSummary ? (
                  <span className="bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/30 px-3 py-1 rounded-full font-medium truncate max-w-full tag-pop">{aiSummary}</span>
                ) : (
                  <span className="bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/30 px-3 py-1 rounded-full font-medium whitespace-nowrap tag-pop">{mode === 'route' ? 'Route Search' : 'Nearby Search'}</span>
                )}
                {activeCategories.map(c => (
                  <span key={c} className="bg-stone-100 dark:bg-zinc-900 border border-stone-200 dark:border-white/5 text-stone-700 dark:text-zinc-300 px-3 py-1 rounded-full whitespace-nowrap flex items-center gap-1.5 tag-pop">
                    {c} 
                    <button onClick={() => toggleCategory(c)} className="hover:text-rose-600 dark:hover:text-rose-400"><X className="w-3 h-3"/></button>
                  </span>
                ))}
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
                      {activeCategories.includes(cat) ? <Check className="w-4 h-4 text-rose-600 dark:text-rose-400" /> : <Plus className="w-4 h-4 text-stone-400 dark:text-zinc-500" />}
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
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
          <div className={`w-full md:w-[400px] bg-stone-50 dark:bg-zinc-950 border-r border-stone-200 dark:border-white/5 overflow-y-auto p-4 flex-col gap-3.5 z-10 shadow-[4px_0_20px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_30px_rgba(0,0,0,0.65)] custom-scrollbar pb-24 md:pb-4 ${mobileView === 'map' ? 'hidden md:flex' : 'flex'}`}>
            
            <div className="text-sm font-semibold text-stone-500 dark:text-zinc-400 flex justify-between items-center px-1 mb-2">
              <span>{processedData.length > 50 ? `Showing top 50 of ${processedData.length} matches` : `Showing ${processedData.length} matches`}</span>
              {selectedStops.length > 0 && (
                <span className="bg-emerald-950/40 text-emerald-350 px-3 py-1 rounded-full text-xs font-bold border border-emerald-900/30">
                  {selectedStops.length} Stop{selectedStops.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

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

            {displayedData.map((church, idx) => (
              <ChurchCard 
                key={idx}
                index={idx}
                church={church} 
                isStop={selectedStops.some(s => s.church_name === church.church_name)}
                isSelected={selectedChurch?.church_name === church.church_name}
                toggleStop={toggleStop}
                onClick={() => {
                  setSelectedChurch(church);
                  animateMapTo(church.latitude, church.longitude, 13);
                  if(window.innerWidth < 768) setMobileView('map');
                }}
              />
            ))}
            
            {processedData.length > 50 && (
              <div className="text-center py-4 text-stone-500 dark:text-zinc-500 text-sm font-medium">
                Zoom map or refine search to see more results
              </div>
            )}

            {processedData.length === 0 && (
              <div className="text-center text-stone-500 dark:text-zinc-400 py-16 px-4 bg-stone-100 dark:bg-zinc-900/20 rounded-2xl border border-dashed border-stone-300 dark:border-zinc-800 shrink-0">
                <MapPin className="w-10 h-10 mx-auto text-rose-400/50 mb-3 animate-pulse" />
                <p className="font-semibold text-stone-800 dark:text-zinc-200">No locations found</p>
                <p className="text-sm text-stone-500 dark:text-zinc-500 mt-1">Try expanding your radius or using fewer filters.</p>
                <button onClick={() => {setMaxDistance(10000); setActiveCategories([])}} className="mt-4 px-5 py-2 bg-stone-200 hover:bg-stone-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-stone-300 dark:border-white/5 rounded-full text-sm font-semibold transition-all text-stone-700 dark:text-zinc-300 shadow-sm">
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          {/* Right Panel: Map */}
          <div className={`flex-1 bg-stone-200 dark:bg-zinc-950 relative border-l border-stone-200 dark:border-white/5 ${mobileView === 'list' ? 'hidden md:block' : 'block'}`}>
            <Map
              ref={mapRef}
              initialViewState={viewState}
              onClick={() => setSelectedChurch(null)}
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

              {displayedData.map((church, idx) => {
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
              })}

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

                    <div className="flex gap-2.5 pt-4 border-t border-stone-200 dark:border-white/5 mt-auto">
                      <button 
                        onClick={() => toggleStop(selectedChurch)}
                        className={`flex-1 text-xs py-2.5 rounded-xl font-bold transition-all duration-350 flex items-center justify-center gap-1.5 shadow-md border ${
                          selectedStops.some(s => s.church_name === selectedChurch.church_name) 
                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/35 hover:bg-emerald-200 dark:hover:bg-emerald-900/40' 
                            : 'bg-stone-100 dark:bg-zinc-800/80 text-stone-700 dark:text-zinc-200 border-stone-200 dark:border-white/5 hover:bg-stone-200 dark:hover:bg-zinc-700/80'
                        }`}
                      >
                        {selectedStops.some(s => s.church_name === selectedChurch.church_name) ? <><Check className="w-3.5 h-3.5"/>Added</> : <><Plus className="w-3.5 h-3.5"/>Add Stop</>}
                      </button>
                      {selectedChurch.website && (
                        <a 
                          href={selectedChurch.website} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex-1 text-center bg-rose-900 hover:bg-rose-800 text-white shadow-[0_4px_14px_rgba(190,18,60,0.25)] text-xs py-2.5 rounded-xl font-bold transition-all duration-350 flex items-center justify-center gap-1.5 border border-rose-800/20"
                        >
                          Website <ExternalLink className="w-3.5 h-3.5"/>
                        </a>
                      )}
                    </div>
                  </div>
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
                    <h3 className="font-bold text-stone-900 dark:text-white leading-tight text-xl">{selectedChurch.church_name}</h3>
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
                  </div>
                  <button 
                    onClick={() => setSelectedChurch(null)} 
                    className="p-2 bg-stone-100 dark:bg-zinc-900/80 hover:bg-stone-200 dark:hover:bg-zinc-800 rounded-full text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white transition-colors shrink-0 border border-stone-200 dark:border-white/5"
                  >
                    <X className="w-4 h-4" />
                  </button>
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
                  <div className="bg-stone-200 dark:bg-zinc-950/80 p-2 rounded-lg border border-stone-300 dark:border-white/5 shrink-0 text-rose-600 dark:text-rose-400 group-hover/address:bg-rose-900 group-hover/address:text-white transition-colors duration-300">
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
                      <Clock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0 animate-pulse" />
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
    </div>
  );
}
