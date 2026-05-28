"use client";

import React, { useState } from "react";
import { Sparkles, ArrowRight, Search } from "lucide-react";

interface PrimarySearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  loadingMessage?: string;
  placeholder?: string;
  className?: string;
  showSuggestions?: boolean;
  discoveryLayer?: "masses" | "events";
}

const MASS_SUGGESTIONS = [
  "TLM near me",
  "Nearest FSSP parish",
  "Latin Masses from San Francisco to Los Angeles",
  "SSPX chapel nearby",
];

const EVENT_SUGGESTIONS = [
  "Catholic events near me",
  "Young adult events this weekend",
  "Rosary nights nearby",
  "Formation talks in San Francisco",
];

export function PrimarySearchBar({
  onSearch,
  isLoading = false,
  loadingMessage = "Searching...",
  placeholder,
  className = "",
  showSuggestions = true,
  discoveryLayer = "events",
}: PrimarySearchBarProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    onSearch(query.trim());
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    onSearch(suggestion);
  };

  const isEvents = discoveryLayer === "events";
  const suggestions = isEvents ? EVENT_SUGGESTIONS : MASS_SUGGESTIONS;
  const defaultPlaceholder = isEvents
    ? 'Ask Viam: "Young adult events near me" or "Rosary nights this weekend"'
    : 'Ask Viam: "Latin Masses near me" or "TLM from San Francisco to Los Angeles"';

  return (
    <div className={`w-full ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`relative flex items-center bg-card border rounded-2xl overflow-hidden transition-all duration-300 ${
            isFocused
              ? "border-primary shadow-lg shadow-primary/5 ring-4 ring-primary/5"
              : "border-border hover:border-primary/30 shadow-card hover:shadow-card-hover"
          } ${isLoading ? "border-primary/40 bg-primary/5" : ""}`}
        >
          {/* AI Icon */}
          <div className="pl-5 pr-2 py-4">
            <Sparkles
              className={`w-5 h-5 transition-all duration-300 ${
                isFocused || isLoading
                  ? "text-primary scale-110"
                  : "text-muted-foreground"
              } ${isLoading ? "animate-pulse-subtle" : ""}`}
            />
          </div>

          {/* Input */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={isLoading ? loadingMessage : placeholder || defaultPlaceholder}
            disabled={isLoading}
            className="flex-1 py-4 pr-4 text-base md:text-lg font-medium bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="shrink-0 m-2 p-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
          >
            {isLoading ? (
              <div className="w-5 h-5 flex items-center justify-center gap-0.5">
                <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            ) : (
              <ArrowRight className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>

      {/* Suggestions */}
      {showSuggestions && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={isLoading}
              onClick={() => handleSuggestionClick(suggestion)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-card border border-border text-muted-foreground rounded-full hover:bg-primary/5 hover:text-primary hover:border-primary/20 active:scale-95 disabled:opacity-40 transition-all duration-200"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
