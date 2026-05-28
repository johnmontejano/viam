import React, { useState, useEffect, useRef } from "react";
import { EventCategory, CatholicEvent } from "@/types/event";
import { X, Calendar, MapPin, User, Mail, Link, FileText, CheckCircle2, AlertTriangle, Loader2, Upload, Sparkles } from "lucide-react";
import { FallbackCover } from "./FallbackCover";

interface EventSubmissionFormProps {
  onClose: () => void;
  onSubmit: (
    event: Omit<CatholicEvent, "id" | "status" | "verified" | "createdAt" | "updatedAt">,
    imageFile?: File | null
  ) => Promise<void>;
}

const CATEGORIES: EventCategory[] = [
  "Young Adult Social",
  "Rosary",
  "Dinner",
  "Dancing",
  "Hiking",
  "Men's Group",
  "Women's Group",
  "Class / Formation",
  "Latin Class",
  "Philosophy / Theology",
  "Feast Day",
  "Procession",
  "Conference",
  "Fundraiser",
  "Volunteer / Charity",
  "Family Friendly",
  "Other",
];

export function EventSubmissionForm({ onClose, onSubmit }: EventSubmissionFormProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<EventCategory>("Young Adult Social");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [hostName, setHostName] = useState("");
  const [hostType, setHostType] = useState<"parish" | "young_adult_group" | "organization" | "individual">("parish");
  const [contactEmail, setContactEmail] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Event Image States
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Link Scraper States
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  // Liturgical theme state & automatic mapping
  const [themeColor, setThemeColor] = useState<"burgundy" | "violet" | "emerald" | "amber" | "blue">("burgundy");
  const [vibes, setVibes] = useState<string[]>([]);

  useEffect(() => {
    switch (category) {
      case "Rosary":
      case "Feast Day":
      case "Procession":
        setThemeColor("burgundy");
        break;
      case "Philosophy / Theology":
      case "Class / Formation":
      case "Latin Class":
        setThemeColor("violet");
        break;
      case "Hiking":
      case "Volunteer / Charity":
      case "Family Friendly":
        setThemeColor("emerald");
        break;
      case "Other":
        setThemeColor("blue");
        break;
      case "Dinner":
      case "Dancing":
      case "Young Adult Social":
      case "Fundraiser":
      default:
        setThemeColor("amber");
        break;
    }
  }, [category]);

  const handleScrape = async () => {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    setScrapeError(null);
    try {
      // 1. Format URL (ensure protocols are prepended)
      let targetUrl = scrapeUrl.trim();
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = `https://${targetUrl}`;
      }

      // 2. Fetch HTML through a resilient multi-proxy chain (codetabs first to bypass Cloudflare, allorigins as fallback)
      let html = "";
      let fetchSuccess = false;
      
      try {
        const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          html = await res.text();
          if (html && html.trim().length > 0) {
            fetchSuccess = true;
          }
        }
      } catch (e) {
        console.warn("Codetabs proxy failed, trying AllOrigins...", e);
      }

      if (!fetchSuccess) {
        try {
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
          const res = await fetch(proxyUrl);
          if (res.ok) {
            html = await res.text();
            fetchSuccess = true;
          }
        } catch (e) {
          console.error("AllOrigins proxy failed:", e);
        }
      }

      if (!fetchSuccess || !html) {
        throw new Error("Failed to load content from the target website. The link may be protected or temporary down.");
      }

      // 3. Initialize metadata container
      const eventData: Record<string, any> = {};

      // Local helper to extract text recursively from ProseMirror documents (Luma format)
      const extractProseMirrorText = (node: any): string => {
        if (!node) return "";
        if (node.type === "text") return node.text || "";
        if (node.content && Array.isArray(node.content)) {
          const text = node.content.map(extractProseMirrorText).join("");
          return node.type === "paragraph" ? text + "\n" : text;
        }
        return "";
      };

      // 4. Try parsing Next.js __NEXT_DATA__ (specific for Luma and modern event platforms)
      if (html.includes('__NEXT_DATA__')) {
        try {
          const nextDataRegex = /<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/gi;
          const nextMatch = nextDataRegex.exec(html);
          if (nextMatch) {
            const nextData = JSON.parse(nextMatch[1].trim());
            const pageProps = nextData.props?.pageProps || {};
            
            // Luma stores event data inside initialData.data
            const initialData = pageProps.initialData || {};
            const lumaContainer = initialData.kind === "event" ? initialData.data : null;
            
            const eventObj = lumaContainer?.event || pageProps.event || pageProps.initialState?.event || pageProps.serverState?.event;
            
            if (eventObj) {
              if (eventObj.name) eventData.title = eventObj.name;
              
              // Recursive ProseMirror description parser
              if (lumaContainer?.description_mirror) {
                eventData.description = extractProseMirrorText(lumaContainer.description_mirror).trim();
              } else if (eventObj.description) {
                eventData.description = eventObj.description;
              }
              
              if (eventObj.cover_url) eventData.imageUrl = eventObj.cover_url;
              
              // Host / Organizer
              const hostObj = lumaContainer?.hosts?.[0] || eventObj.hosts?.[0] || eventObj.host || eventObj.organizer;
              if (hostObj) {
                eventData.hostName = hostObj.name || hostObj.display_name;
              }
              
              // Location / Venue / Address
              const geo = eventObj.geo_address_info;
              if (geo) {
                eventData.locationName = geo.address || geo.name || "";
                
                // Extract exact street address (everything before the first comma of short_address or full_address)
                if (geo.short_address) {
                  eventData.address = geo.short_address.split(',')[0].trim();
                } else if (geo.full_address) {
                  eventData.address = geo.full_address.split(',')[0].trim();
                } else {
                  eventData.address = geo.address || "";
                }
                
                eventData.city = geo.city || "";
                eventData.state = geo.region_short || geo.region || "";
              } else {
                const geoAddress = eventObj.geo_address_json || eventObj.location || eventObj.venue;
                if (geoAddress) {
                  let parsedGeo = geoAddress;
                  if (typeof geoAddress === 'string') {
                    try { parsedGeo = JSON.parse(geoAddress); } catch (e) {}
                  }
                  
                  if (parsedGeo) {
                    eventData.locationName = eventObj.geo_address_info?.name || parsedGeo.name || parsedGeo.place_name || eventObj.venue_name || "";
                    eventData.address = parsedGeo.full_address || parsedGeo.address || parsedGeo.street_address || eventObj.geo_address_info?.address || "";
                    eventData.city = parsedGeo.city || parsedGeo.addressLocality || eventObj.geo_address_info?.city || "";
                    eventData.state = parsedGeo.state || parsedGeo.addressRegion || eventObj.geo_address_info?.state || "";
                  }
                }
              }

              // Timezone-aware Date & Time formatting
              if (eventObj.start_at) {
                const startDateTimeStr = eventObj.start_at;
                const timezone = eventObj.timezone || "America/Los_Angeles";
                try {
                  const d = new Date(startDateTimeStr);
                  if (!isNaN(d.getTime())) {
                    // Format date: YYYY-MM-DD in event's local timezone
                    const formatterDate = new Intl.DateTimeFormat('en-CA', {
                      timeZone: timezone,
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    });
                    eventData.startDate = formatterDate.format(d);
                    
                    // Format time: HH:MM (24-hour) in event's local timezone
                    const formatterTime = new Intl.DateTimeFormat('en-US', {
                      timeZone: timezone,
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    });
                    eventData.startTime = formatterTime.format(d);
                  }
                } catch (e) {
                  console.error("Luma timezone-aware date parsing failed:", e);
                  eventData.startDateTime = eventObj.start_at; // fallback
                }
              }
            }
          }
        } catch (e) {
          console.warn("Failed to parse Luma __NEXT_DATA__ schema:", e);
        }
      }

      // 4.5. Try parsing Schema.org structured JSON-LD (Ticketing/Lumina standard)
      if (!eventData.title) {
        const jsonLdRegex = /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
        let match;
        while ((match = jsonLdRegex.exec(html)) !== null) {
          try {
            const json = JSON.parse(match[1].trim());
            const schemas = Array.isArray(json) ? json : [json];
            
            for (const schema of schemas) {
              const items = schema["@graph"] && Array.isArray(schema["@graph"]) 
                ? schema["@graph"] 
                : [schema];

              for (const item of items) {
                const type = item["@type"];
                if (type === "Event" || (typeof type === "string" && type.includes("Event"))) {
                  eventData.title = item.name;
                  eventData.description = item.description;
                  eventData.startDateTime = item.startDate;
                  eventData.endDateTime = item.endDate;
                  
                  if (item.location) {
                    eventData.locationName = item.location.name;
                    const addr = item.location.address;
                    if (addr) {
                      if (typeof addr === "string") {
                        eventData.address = addr;
                      } else if (typeof addr === "object") {
                        eventData.address = addr.streetAddress || addr.name || "";
                        eventData.city = addr.addressLocality || "";
                        eventData.state = addr.addressRegion || "";
                      }
                    }
                  }

                  if (item.image) {
                    if (Array.isArray(item.image)) {
                      eventData.imageUrl = item.image[0];
                    } else if (typeof item.image === "object") {
                      eventData.imageUrl = item.image.url || item.image.contentUrl;
                    } else {
                      eventData.imageUrl = item.image;
                    }
                  }

                  if (item.organizer) {
                    eventData.hostName = item.organizer.name;
                  }
                  break;
                }
              }
            }
          } catch (e) {
            // Skip invalid JSON-LD
          }
        }
      }

      // 5. Open Graph fallback
      const getMeta = (property: string) => {
        const regex = new RegExp(`<meta\\s+(?:property|name)="og:${property}"\\s+content="([^"]*)"`, "i");
        const m = html.match(regex);
        if (m) return m[1];
        
        const fallbackRegex = new RegExp(`<meta\\s+content="([^"]*)"\\s+(?:property|name)="og:${property}"`, "i");
        const fm = html.match(fallbackRegex);
        return fm ? fm[1] : "";
      };

      if (!eventData.title) {
        const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
        eventData.title = getMeta("title") || (titleMatch ? titleMatch[1].trim() : "");
      }
      
      if (!eventData.description) {
        eventData.description = getMeta("description");
      }

      if (!eventData.imageUrl) {
        eventData.imageUrl = getMeta("image");
      }

      if (!eventData.hostName) {
        eventData.hostName = getMeta("site_name");
      }

      // Sanitize dates (fallback logic if next_data parsing skipped or was standard Schema.org)
      if (eventData.startDateTime && !eventData.startDate) {
        try {
          const d = new Date(eventData.startDateTime);
          if (!isNaN(d.getTime())) {
            eventData.startDate = d.toISOString().split("T")[0];
            eventData.startTime = d.toTimeString().split(" ")[0].substring(0, 5); // HH:MM
          }
        } catch (e) {}
      }

      // 6. Auto-fill fields if extracted
      if (eventData.title) setTitle(eventData.title);
      if (eventData.description) setDescription(eventData.description);
      if (eventData.startDate) setStartDate(eventData.startDate);
      if (eventData.startTime) setStartTime(eventData.startTime);
      if (eventData.locationName) setLocationName(eventData.locationName);
      if (eventData.address) setAddress(eventData.address);
      if (eventData.city) setCity(eventData.city);
      if (eventData.state) setState(eventData.state);
      if (eventData.hostName) setHostName(eventData.hostName);
      if (eventData.imageUrl) {
        // Set remote URL preview immediately as initial fallback
        setImagePreview(eventData.imageUrl);
        
        // Proxy-download image in background to convert it to a local file for Supabase storage upload
        try {
          const imgProxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(eventData.imageUrl)}`;
          const imgRes = await fetch(imgProxyUrl);
          if (imgRes.ok) {
            const blob = await imgRes.blob();
            const file = new File([blob], "scraped_cover.jpg", { type: blob.type || "image/jpeg" });
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
          }
        } catch (e) {
          console.warn("Failed to convert scraped cover image to local file via proxy, falling back to direct URL:", e);
        }
      }
      setExternalUrl(scrapeUrl.trim());
      
      alert("Successfully auto-filled event details from pasted link!");
    } catch (err: any) {
      console.error("Link auto-fill scraper failed:", err);
      setScrapeError(err?.message || "Failed to load link details. Check the URL and try again.");
    } finally {
      setScraping(false);
    }
  };

  // Address Autocomplete states
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (address.length > 3 && isOpen) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5&countrycodes=us,ca,gb,au&addressdetails=1`);
          const data = await res.json();
          setSuggestions(data);
        } catch (e) {
          console.error("Nominatim autocomplete failed:", e);
        }
      } else {
        setSuggestions([]);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [address, isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = (s: any) => {
    const addr = s.address || {};
    const street = [addr.house_number, addr.road].filter(Boolean).join(" ");
    const finalAddress = street || s.display_name.split(",")[0];
    const finalCity = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || "";
    const finalState = addr.state || "";

    setAddress(finalAddress);
    setCity(finalCity);
    setState(finalState);
    setLatitude(parseFloat(s.lat));
    setLongitude(parseFloat(s.lon));
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startDate || !startTime || !address || !city || !contactEmail) {
      alert("Please fill in all required fields.");
      return;
    }

    const startISO = `${startDate}T${startTime}:00`;
    
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title,
        category,
        startDateTime: startISO,
        description: description || undefined,
        locationName: locationName || undefined,
        address,
        city: city || undefined,
        state: state || undefined,
        country: "USA",
        hostName: hostName || undefined,
        hostType,
        externalUrl: externalUrl || undefined,
        latitude,
        longitude,
        themeColor,
        vibes,
      }, imageFile);
      setSubmitted(true);
    } catch (err: any) {
      console.error("Failed to submit event:", err);
      setError(err?.message || "Failed to submit event to database. Please make sure database tables are fully configured.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center drawer-slide-up">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="font-bold text-xl text-stone-900 dark:text-white mb-2">Event Submitted Successfully!</h3>
          
          <div className="bg-stone-50 dark:bg-zinc-950/40 border border-stone-200 dark:border-white/5 rounded-xl p-4 text-xs text-stone-600 dark:text-zinc-350 leading-relaxed text-left flex flex-col gap-2.5 my-4">
            <p className="font-semibold text-stone-800 dark:text-zinc-200">ℹ️ Moderation Review Timing:</p>
            <p>Your event has been successfully saved to our database with a **pending** status.</p>
            <p>It has been routed to the **Master Admin Moderation Queue** for review. In order to ensure safety and accuracy, our team reviews all community submissions. **Your event will be either approved/confirmed or rejected within 24 to 48 hours.**</p>
            <p>Once approved, it will immediately display on the discovery maps, and you will receive an automatic confirmation email!</p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-rose-900 hover:bg-rose-800 text-white rounded-xl font-bold border border-rose-600/20 shadow-lg hover:shadow-xl transition-all"
          >
            Back to Events Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div 
        className="w-full max-w-xl bg-white dark:bg-zinc-950/95 border border-stone-200 dark:border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar drawer-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center pb-4 border-b border-stone-200 dark:border-white/5">
          <h3 className="font-bold text-lg text-stone-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-rose-650" /> Submit Community Event
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 bg-stone-100 dark:bg-zinc-900/80 text-stone-500 dark:text-zinc-400 border border-stone-200 dark:border-white/5 rounded-full hover:bg-stone-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-4 text-stone-900 dark:text-zinc-200 text-sm">
          {/* Link Auto-fill Panel */}
          <div className="bg-stone-50 dark:bg-zinc-900/40 border border-stone-200 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-2 shrink-0 shadow-sm relative">
            <span className="text-xs font-bold text-rose-800 dark:text-rose-455 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Auto-Fill Event Details
            </span>
            <p className="text-[11px] text-stone-500 dark:text-zinc-500 -mt-0.5 leading-normal">
              Paste an Eventbrite, Lumina, Cardi4 or Luma link to automatically extract event details!
            </p>
            <div className="flex gap-2 mt-1">
              <input 
                type="url" 
                placeholder="e.g. https://lumina.la/event/..."
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-white dark:bg-zinc-950 border border-stone-250 dark:border-white/5 rounded-xl text-xs focus:outline-none focus:border-rose-500/40 text-stone-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleScrape}
                disabled={scraping || !scrapeUrl.trim()}
                className="px-4 py-2 bg-rose-900 hover:bg-rose-850 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm border border-rose-800/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scraping ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching...
                  </>
                ) : (
                  "Auto-Fill"
                )}
              </button>
            </div>
            {scrapeError && (
              <span className="text-[10px] text-red-650 dark:text-red-400 font-semibold leading-normal mt-0.5">{scrapeError}</span>
            )}
          </div>
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-stone-700 dark:text-zinc-400">Event Title <span className="text-rose-500">*</span></label>
            <input 
              required
              type="text" 
              placeholder="e.g. Young Adult Bonfire & Rosary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-stone-50 dark:bg-zinc-900/60 border border-stone-200 dark:border-white/5 rounded-xl focus:outline-none focus:border-rose-500/40 focus:ring-1 focus:ring-rose-500/20"
            />
          </div>

          {/* Category & Host Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-stone-700 dark:text-zinc-400">Category <span className="text-rose-500">*</span></label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EventCategory)}
                className="w-full px-3 py-2.5 bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-xl focus:outline-none focus:border-rose-500/40"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-stone-700 dark:text-zinc-400">Host Type <span className="text-rose-500">*</span></label>
              <select
                value={hostType}
                onChange={(e) => setHostType(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-xl focus:outline-none focus:border-rose-500/40"
              >
                <option value="parish">Parish / Chapel</option>
                <option value="young_adult_group">Young Adult Group</option>
                <option value="organization">Organization</option>
                <option value="individual">Individual</option>
              </select>
            </div>
          </div>

          {/* Event Vibes Selector */}
          <div className="bg-stone-50 dark:bg-zinc-900/30 border border-stone-200 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1 text-left">
              <label className="font-bold text-stone-700 dark:text-zinc-400">Event Vibes <span className="text-stone-400 dark:text-zinc-555">(Customization)</span></label>
              <p className="text-[10px] text-stone-500 dark:text-zinc-500 leading-normal -mt-0.5">
                Select up to 3 tags that describe the mood or focus of your event.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {["Outdoors", "Social", "Study", "Food & Drink", "Devotional", "Music", "Family", "Formal", "Casual"].map((vibe) => (
                <button
                  key={vibe}
                  type="button"
                  onClick={() => {
                    if (vibes.includes(vibe)) {
                      setVibes(vibes.filter(v => v !== vibe));
                    } else if (vibes.length < 3) {
                      setVibes([...vibes, vibe]);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    vibes.includes(vibe) 
                      ? "bg-rose-900 text-white border-rose-900 shadow-sm" 
                      : "bg-white dark:bg-zinc-950 text-stone-600 dark:text-zinc-400 border-stone-200 dark:border-white/5 hover:border-rose-900/40"
                  }`}
                >
                  {vibe}
                </button>
              ))}
            </div>
          </div>

          {/* Liturgical Theme Selector & Real-Time Fallback Preview */}
          <div className="bg-stone-50 dark:bg-zinc-900/30 border border-stone-200 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1 text-left">
              <label className="font-bold text-stone-700 dark:text-zinc-400">Catholic Liturgical Theme <span className="text-stone-400 dark:text-zinc-555">(Customizable Accent)</span></label>
              <p className="text-[10px] text-stone-500 dark:text-zinc-500 leading-normal -mt-0.5">
                Pick a liturgical tone. The discovery cards, map popups, and details overlays will adopt this theme color's visual accents!
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {[
                { id: "burgundy", name: "Red (Sacred)", color: "bg-rose-700 ring-rose-500/20" },
                { id: "violet", name: "Violet (Academic)", color: "bg-purple-700 ring-purple-500/20" },
                { id: "emerald", name: "Teal (Creation)", color: "bg-teal-700 ring-teal-500/20" },
                { id: "amber", name: "Gold (Fellowship)", color: "bg-amber-600 ring-amber-500/20" },
                { id: "blue", name: "Blue (Devotion)", color: "bg-indigo-900 ring-indigo-500/20" }
              ].map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setThemeColor(theme.id as any)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${theme.color} relative ${
                    themeColor === theme.id 
                      ? "ring-4 scale-110 border-2 border-white dark:border-zinc-950" 
                      : "opacity-75 hover:opacity-100 border border-transparent"
                  }`}
                  title={theme.name}
                >
                  {themeColor === theme.id && (
                    <span className="text-white text-[10px] font-black">✓</span>
                  )}
                </button>
              ))}
            </div>

            {/* Miniature Fallback Banner Live Preview! */}
            {!imagePreview && (
              <div className="mt-1 flex flex-col gap-1.5 text-left">
                <span className="text-[9px] font-bold text-stone-400 dark:text-zinc-500 uppercase tracking-wider">Live Card Banner Preview</span>
                <div className="w-full h-20 overflow-hidden rounded-xl border border-stone-200 dark:border-white/5 relative">
                  <FallbackCover category={category} title={title || "Your Event Title Here"} themeColor={themeColor} isPopup={true} />
                </div>
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-stone-700 dark:text-zinc-400">Start Date <span className="text-rose-500">*</span></label>
              <div className="relative">
                <input 
                  required
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-stone-50 dark:bg-zinc-900/60 border border-stone-200 dark:border-white/5 rounded-xl focus:outline-none focus:border-rose-500/40"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-stone-700 dark:text-zinc-400">Start Time <span className="text-rose-500">*</span></label>
              <input 
                required
                type="time" 
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-50 dark:bg-zinc-900/60 border border-stone-200 dark:border-white/5 rounded-xl focus:outline-none focus:border-rose-500/40"
              />
            </div>
          </div>

          {/* Address details */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-stone-700 dark:text-zinc-400">Venue Name / Location <span className="text-stone-400 dark:text-zinc-550">(Optional)</span></label>
            <input 
              type="text" 
              placeholder="e.g. Star of the Sea School Hall"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="w-full px-4 py-2.5 bg-stone-50 dark:bg-zinc-900/60 border border-stone-200 dark:border-white/5 rounded-xl focus:outline-none focus:border-rose-500/40"
            />
          </div>

          <div className="flex flex-col gap-1.5 relative" ref={wrapperRef}>
            <label className="font-bold text-stone-700 dark:text-zinc-400">Street Address <span className="text-rose-500">*</span></label>
            <input 
              required
              type="text" 
              placeholder="e.g. 4420 Geary Blvd"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => {
                if (address.length > 3) setIsOpen(true);
              }}
              className="w-full px-4 py-2.5 bg-stone-50 dark:bg-zinc-900/60 border border-stone-200 dark:border-white/5 rounded-xl focus:outline-none focus:border-rose-500/40 text-stone-900 dark:text-white"
            />
            {isOpen && suggestions.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-xl shadow-xl overflow-hidden z-50 text-xs max-h-48 overflow-y-auto custom-scrollbar">
                {suggestions.map((s, idx) => (
                  <li 
                    key={idx}
                    onClick={() => handleSelectSuggestion(s)}
                    className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer border-b border-stone-100 dark:border-white/5 last:border-0 transition-colors flex items-start gap-2 group text-stone-700 dark:text-zinc-350"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span className="text-stone-700 dark:text-zinc-300 group-hover:text-rose-700 dark:group-hover:text-white transition-colors">{s.display_name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-stone-700 dark:text-zinc-400">City <span className="text-rose-500">*</span></label>
              <input 
                required
                type="text" 
                placeholder="e.g. San Francisco"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-50 dark:bg-zinc-900/60 border border-stone-200 dark:border-white/5 rounded-xl focus:outline-none focus:border-rose-500/40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-stone-700 dark:text-zinc-400">State <span className="text-stone-400 dark:text-zinc-550">(Optional)</span></label>
              <input 
                type="text" 
                placeholder="e.g. CA"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-50 dark:bg-zinc-900/60 border border-stone-200 dark:border-white/5 rounded-xl focus:outline-none focus:border-rose-500/40"
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-stone-700 dark:text-zinc-400">Description <span className="text-stone-400 dark:text-zinc-550">(Optional)</span></label>
            <textarea 
              rows={3}
              placeholder="Provide a detailed description of the event, itinerary, items to bring, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-stone-50 dark:bg-zinc-900/60 border border-stone-200 dark:border-white/5 rounded-xl focus:outline-none focus:border-rose-500/40 focus:ring-1 focus:ring-rose-500/20 resize-none"
            />
          </div>

          {/* Image Uploader */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-stone-700 dark:text-zinc-400">Event Cover Photo <span className="text-stone-400 dark:text-zinc-550">(Optional)</span></label>
            {imagePreview ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden border border-stone-200 dark:border-white/5 group">
                <img src={imagePreview} alt="Cover Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/85 text-white rounded-full transition-colors backdrop-blur-sm shadow"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="w-full h-28 border-2 border-dashed border-stone-300 dark:border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-rose-500/40 hover:bg-rose-50/5 dark:hover:bg-rose-950/5 transition-all text-stone-500 dark:text-zinc-500">
                <Upload className="w-6 h-6 text-stone-400 dark:text-zinc-650" />
                <span className="text-xs font-bold text-stone-750 dark:text-zinc-350">Upload cover image</span>
                <span className="text-[10px] text-stone-450 dark:text-zinc-500">JPG, PNG or WEBP (Max 5MB)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        alert("Image size must be less than 5MB");
                        return;
                      }
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Host & Email info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-stone-700 dark:text-zinc-400">Host / Organizer Name <span className="text-stone-400 dark:text-zinc-550">(Optional)</span></label>
              <input 
                type="text" 
                placeholder="e.g. St. Vitus Altar Society"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-50 dark:bg-zinc-900/60 border border-stone-200 dark:border-white/5 rounded-xl focus:outline-none focus:border-rose-500/40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-stone-700 dark:text-zinc-400">Contact Email <span className="text-rose-500">*</span></label>
              <input 
                required
                type="email" 
                placeholder="e.g. contact@parish.org"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-50 dark:bg-zinc-900/60 border border-stone-200 dark:border-white/5 rounded-xl focus:outline-none focus:border-rose-500/40"
              />
            </div>
          </div>

          {/* Link */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-stone-700 dark:text-zinc-400">External URL / RSVP Link <span className="text-stone-400 dark:text-zinc-550">(Optional)</span></label>
            <input 
              type="url" 
              placeholder="e.g. https://parish.org/event-details"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              className="w-full px-4 py-2.5 bg-stone-50 dark:bg-zinc-900/60 border border-stone-200 dark:border-white/5 rounded-xl focus:outline-none focus:border-rose-500/40"
            />
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-450 rounded-2xl text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span className="font-semibold leading-normal">{error}</span>
            </div>
          )}

          <div className="flex gap-3 mt-4 border-t border-stone-200 dark:border-white/5 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-stone-200 dark:border-white/5 text-stone-700 dark:text-zinc-200 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-rose-900 hover:bg-rose-800 text-white rounded-xl font-bold border border-rose-650/20 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                </>
              ) : (
                "Submit"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
