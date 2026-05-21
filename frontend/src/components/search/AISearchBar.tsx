import React, { useState } from 'react';
import { Sparkles, ArrowRight, Search } from 'lucide-react';

interface AISearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  loadingMessage?: string;
  className?: string;
  compact?: boolean;
}

const DEFAULT_SUGGESTIONS = [
  "TLM near me",
  "FSSP churches near San Francisco",
  "San Francisco to Los Angeles this Sunday",
  "Nearest SSPX chapel",
];

const EXPANDED_SUGGESTIONS = [
  "ICKSP near me",
  "Sunday Mass nearby",
  "Latin Mass near Los Angeles",
  "Route from Sacramento to San Diego",
  "Diocesan Latin Mass near me",
  "Latin Mass within 50 miles",
];

export function AISearchBar({ onSearch, isLoading = false, loadingMessage = "Thinking...", className = "", compact = false }: AISearchBarProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onSearch(query.trim());
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onSearch(suggestion);
  };

  const suggestions = showMore ? [...DEFAULT_SUGGESTIONS, ...EXPANDED_SUGGESTIONS] : DEFAULT_SUGGESTIONS;

  return (
    <div className={`w-full mx-auto ${compact ? '' : 'max-w-3xl'} ${className}`}>
      <form 
        onSubmit={handleSubmit}
        className={`relative flex items-center bg-white dark:bg-zinc-900/40 backdrop-blur-xl border-2 rounded-full overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isFocused 
            ? 'border-[#be123c] bg-white dark:bg-zinc-900/60 shadow-lg dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] ring-4 ring-rose-100 dark:ring-rose-950/20' 
            : 'border-stone-200 hover:border-stone-300 dark:border-white/5 dark:hover:border-white/10 shadow-sm'
        } ${compact ? 'py-0' : 'py-0.5'} ${
          isLoading ? 'border-rose-600/40 bg-rose-50 dark:bg-rose-950/10 search-loading-ring shadow-[0_0_20px_rgba(190,18,60,0.08)] dark:shadow-[0_0_20px_rgba(190,18,60,0.12)]' : ''
        }`}
      >
        <div className={`pl-4 pr-1 shrink-0 z-10 ${compact ? 'py-1.5' : 'py-2.5'}`}>
          <Sparkles 
            className={`transition-all duration-500 ${
              isFocused || isLoading ? 'text-rose-600 dark:text-rose-500 scale-110' : 'text-stone-400 dark:text-zinc-500'
            } ${compact ? 'w-4 h-4' : 'w-5.5 h-5.5'} ${isLoading ? 'animate-pulse' : 'sparkle-float'}`} 
          />
        </div>
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={isLoading ? loadingMessage : compact ? "Search location..." : "Ask anything: 'TLM near me' or 'Nashville to San Francisco'..."}
          className={`flex-1 px-2.5 focus:outline-none bg-transparent placeholder-stone-400 dark:placeholder-zinc-500 text-stone-900 dark:text-white font-medium z-10 relative ${
            compact ? 'py-1.5 text-sm' : 'py-3.5 text-base md:text-lg'
          } ${isLoading ? 'opacity-40 pointer-events-none' : ''}`}
          disabled={isLoading}
        />
        
        <button 
          type="submit"
          disabled={isLoading || !query.trim()}
          className={`shrink-0 bg-[#be123c] hover:bg-rose-600 hover:scale-[1.05] active:scale-95 text-white rounded-full transition-all duration-500 flex items-center justify-center z-10 relative disabled:bg-stone-100 disabled:text-stone-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600 disabled:scale-100 disabled:cursor-not-allowed ${
            compact ? 'p-1.5 m-1 w-7.5 h-7.5' : 'p-2.5 m-1.5 w-10 h-10'
          } ${isLoading ? 'shadow-[0_0_12px_rgba(190,18,60,0.3)]' : 'shadow-[0_4px_12px_rgba(190,18,60,0.2)]'}`}
        >
          {isLoading ? (
            <div className="flex gap-0.5 justify-center items-center h-full">
              <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
              <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
            </div>
          ) : (
            <ArrowRight className={compact ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5'} />
          )}
        </button>
      </form>

      {!compact && (
        <div className="mt-6 flex flex-col items-center">
          <h3 className="text-[10px] font-bold text-stone-400 dark:text-zinc-500 uppercase tracking-widest mb-3.5 font-mono">Suggested Searches</h3>
          <div className="flex flex-wrap gap-2 justify-center max-w-2xl px-4">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                disabled={isLoading}
                onClick={() => handleSuggestionClick(s)}
                className="text-xs md:text-sm bg-white border border-stone-200 text-stone-600 hover:bg-rose-50/70 hover:text-rose-600 hover:border-rose-200 dark:bg-zinc-900/40 dark:backdrop-blur-sm dark:hover:bg-rose-950/10 dark:hover:text-rose-400 dark:hover:border-rose-900/30 hover:scale-[1.03] active:scale-95 border px-4 py-2 rounded-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] font-semibold flex items-center gap-1.5 shadow-sm hover:shadow-[0_0_15px_rgba(190,18,60,0.08)] disabled:opacity-40 disabled:translate-y-0 disabled:shadow-none"
              >
                <Search className="w-3.5 h-3.5 text-rose-500/80 shrink-0" />
                <span>{s}</span>
              </button>
            ))}
            <button
               type="button"
               disabled={isLoading}
               onClick={() => setShowMore(!showMore)}
               className="text-xs md:text-sm bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200 dark:bg-zinc-800/40 dark:border-white/5 dark:hover:bg-zinc-800/85 hover:scale-[1.03] active:scale-95 px-4 py-2 rounded-full transition-all duration-300 font-semibold shadow-sm hover:shadow-md disabled:opacity-40"
            >
               {showMore ? "Show Less" : "More Options..."}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
