import { ParsedSearchIntent, ChurchCategory, DayOfWeek } from "@/types/searchIntent";

export function parseNaturalLanguageSearch(query: string): ParsedSearchIntent {
  const lowerQuery = query.toLowerCase();
  
  const isEventQuery = /(?:event|social|rosary|dinner|danc|hike|hiking|group|class|formation|philosoph|theolog|feast|procession|conference|fundraiser|volunteer|charity|gathering|meetup|fellowship)/i.test(lowerQuery);

  const result: ParsedSearchIntent = {
    intent: "unknown",
    confidence: 0,
    displaySummary: "",
    discoveryLayer: isEventQuery ? "events" : "masses",
  };

  // 1. Detect Categories
  const categories: ChurchCategory[] = [];
  if (lowerQuery.includes("fssp")) categories.push("FSSP");
  if (lowerQuery.includes("icksp") || lowerQuery.includes("institute of christ the king")) categories.push("ICKSP");
  if (lowerQuery.includes("sspx")) categories.push("SSPX");
  if (lowerQuery.includes("diocesan")) categories.push("Diocesan");
  if (lowerQuery.includes("independent")) categories.push("Independent");
  if (categories.length > 0) result.categories = categories;

  // 2. Detect Distance/Radius
  const milesMatch = lowerQuery.match(/within (\d+) miles/);
  if (milesMatch) {
    result.radiusMiles = parseInt(milesMatch[1], 10);
  }

  // 3. Detect Route Intent
  const routeMatch = lowerQuery.match(/(?:from\s+)(.+?)\s+(?:going to|heading to|to)\s+(.+?)(?:\s+this|\s+on|\s+with|\s+find|\s+show|\s+for|\s+near|\s*$)/i) ||
                     lowerQuery.match(/^(.+?)\s+to\s+(.+?)(?:\s+this|\s+on|\s+with|\s+find|\s+show|\s+for|\s+near|\s*$)/i);

  if (routeMatch) {
    const originCandidate = routeMatch[1].trim().toLowerCase();
    
    // List of conversational noise prefixes that indicate a single-destination search, NOT a route
    const originNoisePrefixes = [
      "i'm going", "i am going", "going",
      "i'm heading", "i am heading", "heading",
      "i'm driving", "i am driving", "driving",
      "i'm walking", "i am walking", "walking",
      "i'm traveling", "i am traveling", "traveling", "travelling",
      "i want to go", "want to go", "need to go",
      "i'm planning to go", "planning to go", "go",
      "i'm flying", "flying",
      "i'm visiting", "visiting",
      "i'm coming", "coming",
      "i want", "i need", "want", "need",
      "how to get", "how to go",
      "i'm heading out", "heading out",
      "i'm taking a trip", "taking a trip"
    ];

    const isNoiseOrigin = originNoisePrefixes.some(prefix => 
      originCandidate === prefix || 
      originCandidate.startsWith(prefix + " ") || 
      originCandidate.endsWith(" " + prefix)
    );

    if (isNoiseOrigin) {
      // Treat as a single-location search (city_search)
      result.intent = "city_search";
      result.confidence = 0.85;

      let rawLoc = routeMatch[2].trim();
      // Strip trailing punctuation
      rawLoc = rawLoc.replace(/[\.,!?]+/g, " ");

      // Remove conversational requests/questions and date parameters
      const noisePhrases = [
        "can you find mass times",
        "can you find masses",
        "can you find mass",
        "can you find",
        "find mass times",
        "find masses",
        "find mass",
        "mass times",
        "latin mass",
        "can you",
        "next sunday",
        "this sunday",
        "next weekend",
        "this weekend",
        "next week",
        "next sunday's",
        "next sunday s",
        "please find",
        "please show",
        "please",
        "find me",
        "show me",
        "give me",
        "find",
        "show",
        "give"
      ];

      let cleanedLoc = rawLoc.toLowerCase();
      for (const phrase of noisePhrases) {
        cleanedLoc = cleanedLoc.replace(phrase, " ");
      }

      // Remove individual noise words
      const noiseWords = [
        "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
        "today", "tomorrow", "tonight", "morning", "afternoon", "evening",
        "mass", "masses", "mess", "tlm", "church", "churches", "chapel", "chapels",
        "the", "best", "on", "route", "way", "to", "for", "in", "at", "near", "next", "this", "a", "an"
      ];

      const words = cleanedLoc.split(/\s+/);
      const filteredWords = words.filter(w => w && !noiseWords.includes(w));

      let finalLoc = filteredWords
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      if (finalLoc.length > 2) {
        result.location = finalLoc;
        result.displaySummary = `City search: ${result.location}`;
      } else {
        result.intent = "unknown";
      }
    } else {
      // True route search
      result.intent = "route_search";
      result.confidence = 0.9;
      result.origin = routeMatch[1].trim().replace(/^i'm coming /i, '').replace(/^coming /i, '');
      let dest = routeMatch[2].trim();
      
      // Clean up destination noise (including typos like 'mess', punctuation, and conversational filler)
      dest = dest.replace(/[\.,!?]+$/g, "");
      dest = dest.replace(/\b(find|show|give|me|masses|mass|mess|tlm|churches|chapels|the|best|on|route)\b.*/ig, "").trim();
      dest = dest.replace(/[\.,!?]+$/g, ""); // Strip trailing punctuation again just in case
      
      const noiseWords = ["this", "today", "tomorrow", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      for (const w of noiseWords) {
        if (dest.toLowerCase().endsWith(w)) dest = dest.slice(0, -(w.length)).trim();
      }
      
      // Final punctuation strip
      dest = dest.replace(/[\.,!?]+$/g, "");
      result.destination = dest;
      result.displaySummary = `Route search: ${result.origin} → ${result.destination}`;
    }
  } 
  else if (lowerQuery.match(/on my route|on the way|along the route/)) {
    result.intent = "route_search";
    result.confidence = 0.5;
    result.clarificationNeeded = true;
    result.clarificationQuestion = "Where are you starting and where are you going?";
    result.displaySummary = `Route search`;
  }
  // 4. Detect Nearby Intent
  else if (lowerQuery.match(/near me|around me|where i live|nearby|closest|nearest/)) {
    result.intent = "nearby_search";
    result.confidence = 0.9;
    result.useCurrentLocation = true;
    result.displaySummary = `Nearby search (Current Location)`;
  }
  // 5. Detect City Intent
  else {
    const cityMatch = lowerQuery.match(/(?:near|in|around|within \d+ miles of)\s+([a-z\s,]+)/i);
    if (cityMatch) {
       result.intent = "city_search";
       result.confidence = 0.8;
       let loc = cityMatch[1].trim();
       // Strip trailing words and generic terms
       loc = loc.replace(/\b(this|today|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday|morning|afternoon|evening|mass|tlm|church|churches|chapel)\b.*/ig, "").trim();
       
       if (loc.length > 2) {
         result.location = loc;
         result.displaySummary = `City search: ${result.location}`;
       } else {
         result.intent = "unknown";
       }
    }
  }

  // Fallback if we only found categories
  if (result.intent === "unknown" && categories.length > 0) {
    result.intent = "category_search";
    result.confidence = 0.6;
    result.displaySummary = `Search by category: ${categories.join(", ")}`;
  }

  // Append filters to summary
  if (categories.length > 0 && result.intent !== "category_search") {
    result.displaySummary += ` · ${categories.join(", ")}`;
  }

  if (result.intent === "unknown") {
    result.clarificationNeeded = true;
    result.clarificationQuestion = "Where should I search?";
  }

  return result;
}
