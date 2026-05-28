"use client";

import React, { useState } from "react";
import { CatholicEvent } from "@/types/event";
import { Calendar, MapPin, Users, Heart, ExternalLink } from "lucide-react";
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

export function EventCard({
  event,
  isSaved,
  onToggleSave,
  isRsvpd,
  onToggleRsvp,
  onClick,
  onShowDetails,
  isSelected,
  index,
}: EventCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const delay = Math.min(index * 0.05, 0.5);

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

  return (
    <article
      id={`event-card-${event.id}`}
      className={`group relative flex flex-col bg-card rounded-2xl border overflow-hidden cursor-pointer transition-all duration-300 hover-lift ${
        isSelected
          ? "border-primary/40 shadow-glow ring-2 ring-primary/10"
          : "border-border hover:border-primary/20"
      }`}
      style={{ animationDelay: `${delay}s` }}
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {event.imageUrl && !imageFailed ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              if (img.src && !img.src.includes("api.codetabs.com")) {
                img.src = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(
                  event.imageUrl!
                )}`;
              } else {
                setImageFailed(true);
              }
            }}
          />
        ) : (
          <FallbackCover
            category={event.category}
            title={event.title}
            themeColor={event.themeColor}
          />
        )}

        {/* Save Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(e);
          }}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all duration-200 ${
            isSaved
              ? "bg-primary text-primary-foreground"
              : "bg-black/30 text-white hover:bg-black/50"
          }`}
          title={isSaved ? "Saved" : "Save Event"}
        >
          <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
        </button>

        {/* Category Badge */}
        <div className="absolute bottom-3 left-3 flex gap-1.5">
          <span className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide bg-black/60 text-white rounded-md backdrop-blur-sm">
            {event.category}
          </span>
          {event.verified && (
            <span className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide bg-success/90 text-success-foreground rounded-md">
              Verified
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4">
        {/* Title & Host */}
        <h3 className="font-display text-xl font-semibold text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {event.title}
        </h3>

        {event.hostName && (
          <p className="mt-1 text-sm text-muted-foreground">
            Hosted by {event.hostName}
          </p>
        )}

        {/* Details */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <span className="font-medium">
              {formatDate(event.startDateTime)} at {formatTime(event.startDateTime)}
            </span>
          </div>

          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <span className="line-clamp-1">
              {event.locationName || event.address}
              {event.city && `, ${event.city}`}
            </span>
          </div>

          {event.rsvpCount !== undefined && event.rsvpCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>{event.rsvpCount} attending</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-auto pt-4 flex gap-2">
          {event.externalUrl ? (
            <a
              href={event.externalUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all"
            >
              <span>RSVP</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleRsvp(e);
              }}
              className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-xl transition-all active:scale-[0.98] ${
                isRsvpd
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {isRsvpd ? "Going" : "RSVP"}
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onShowDetails) {
                onShowDetails();
              } else {
                onClick();
              }
            }}
            className="py-2.5 px-4 text-sm font-semibold bg-secondary text-secondary-foreground border border-border rounded-xl hover:bg-muted active:scale-[0.98] transition-all"
          >
            Details
          </button>
        </div>
      </div>
    </article>
  );
}
