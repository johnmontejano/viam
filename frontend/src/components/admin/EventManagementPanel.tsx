"use client";

import React, { useEffect, useState } from "react";
import { CatholicEvent } from "@/types/event";
import { getApprovedEvents, getPendingEvents, moderateEvent } from "@/lib/firestore/events";
import { X, Search, Calendar, MapPin, Loader2, Check, User, Clock, Filter, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface EventManagementPanelProps {
  onClose: () => void;
}

export function EventManagementPanel({ onClose }: EventManagementPanelProps) {
  const currentUser = useAuth().userProfile as any;
  const [events, setEvents] = useState<CatholicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "pending" | "approved">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedEventDetails, setSelectedEventDetails] = useState<CatholicEvent | null>(null);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const [approved, pending] = await Promise.all([
        getApprovedEvents(),
        currentUser ? getPendingEvents(currentUser.state, currentUser.uid, currentUser.role) : Promise.resolve([])
      ]);
      
      // Combine them and mark status client-side based on whether they came from approved or pending array
      // Some properties might already have status='approved' or 'pending' but we ensure it here just for local UI.
      const mappedApproved = approved.map(e => ({ ...e, status: e.status || "approved" as const }));
      const mappedPending = pending.map(e => ({ ...e, status: e.status || "pending" as const }));
      
      setEvents([...mappedPending, ...mappedApproved].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [currentUser]);

  const handleAction = async (eventId: string, action: "approve" | "reject") => {
    if (!currentUser) return;
    setUpdatingId(eventId);
    try {
      await moderateEvent(eventId, action, currentUser.uid, action === "reject" ? "Rejected by admin from portal" : "");
      setSuccessMsg(`Event ${action === "approve" ? "approved" : "rejected"} successfully.`);
      setTimeout(() => setSuccessMsg(""), 3000);
      await loadEvents();
      if (selectedEventDetails?.id === eventId) setSelectedEventDetails(null);
    } catch (error) {
      console.error("Failed to moderate:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredEvents = events.filter((e) => {
    if (filterMode === "pending" && e.status !== "pending") return false;
    if (filterMode === "approved" && e.status !== "approved") return false;
    
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      e.title.toLowerCase().includes(q) ||
      (e.locationName && e.locationName.toLowerCase().includes(q)) ||
      e.address.toLowerCase().includes(q) ||
      (e.city && e.city.toLowerCase().includes(q)) ||
      e.category.toLowerCase().includes(q) ||
      (e.hostName && e.hostName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 dark:bg-zinc-950/70 backdrop-blur-md">
      <div className="relative w-full max-w-5xl h-[90vh] overflow-hidden rounded-3xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl backdrop-blur-2xl p-6 md:p-8 flex flex-col gap-6 animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-455 border border-rose-100 dark:border-rose-900/35">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-stone-950 dark:text-white">Event Moderation Portal</h2>
              <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
                Review and moderate Catholic events across the network.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-stone-400 dark:text-zinc-550 hover:text-stone-750 dark:hover:text-zinc-350 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters / Status */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <Search className="w-4 h-4 text-stone-400 dark:text-zinc-550" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-250 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/30 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-zinc-650 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-sm"
              />
            </div>

            <div className="flex bg-stone-100 dark:bg-zinc-950 p-1 rounded-xl border border-stone-200 dark:border-white/5">
              {(["all", "pending", "approved"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${
                    filterMode === mode
                      ? "bg-white dark:bg-zinc-800 shadow-sm text-stone-900 dark:text-white"
                      : "text-stone-500 hover:text-stone-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {successMsg && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/35 text-xs font-bold animate-pulse">
              <Check className="w-3.5 h-3.5" />
              {successMsg}
            </div>
          )}
        </div>

        {/* Event List Table */}
        <div className="flex-1 overflow-y-auto border border-stone-200 dark:border-white/5 rounded-2xl bg-stone-50/50 dark:bg-zinc-950/20 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-stone-400 dark:text-zinc-555 gap-3">
              <Loader2 className="w-8 h-8 text-rose-600 dark:text-rose-455 animate-spin" />
              <span className="text-xs font-semibold uppercase tracking-wider">Loading events...</span>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-stone-400 dark:text-zinc-555 gap-2">
              <Calendar className="w-10 h-10 opacity-40" />
              <span className="text-xs font-semibold">No events found matching criteria.</span>
            </div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-stone-200 dark:border-white/5 bg-stone-100/50 dark:bg-zinc-900/50 text-[10px] font-bold text-stone-500 dark:text-zinc-500 uppercase tracking-wider sticky top-0 backdrop-blur-md">
                  <th className="px-5 py-3">Event Overview</th>
                  <th className="px-5 py-3">Date & Location</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-150 dark:divide-white/5 text-xs font-medium text-stone-850 dark:text-zinc-300">
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-stone-100/30 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-5 py-4 max-w-[250px]">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-sm text-stone-950 dark:text-white leading-tight truncate">
                          {event.title}
                        </span>
                        <div className="flex flex-wrap gap-x-2 gap-y-1 text-[10px] uppercase font-bold tracking-wider mt-1">
                          <span className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/30 px-1.5 py-0.5 rounded">
                            {event.category}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1 text-[11px] text-stone-600 dark:text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {new Date(event.startDateTime).toLocaleDateString()} at {new Date(event.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[180px]">
                            {event.locationName ? `${event.locationName}, ` : ""}{event.city || event.address}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          event.status === "approved"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30"
                            : event.status === "pending"
                            ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/30"
                            : "bg-stone-100 text-stone-600 border-stone-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-white/5"
                        }`}
                      >
                        {event.status || "Unknown"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {updatingId === event.id ? (
                        <div className="inline-flex items-center gap-1.5 text-stone-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> ...
                        </div>
                      ) : (
                        <div className="inline-flex gap-1.5 justify-end w-full">
                          <button
                            onClick={() => setSelectedEventDetails(selectedEventDetails?.id === event.id ? null : event)}
                            className="p-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-600 dark:text-zinc-300 rounded-lg transition-all border border-stone-200 dark:border-white/5"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {event.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleAction(event.id, "approve")}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition-all shadow-sm"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleAction(event.id, "reject")}
                                className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-lg transition-all shadow-sm"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Selected Event Details Panel (Slide-up or overlay) */}
        {selectedEventDetails && (
          <div className="absolute inset-x-0 bottom-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-stone-200 dark:border-white/5 p-6 rounded-b-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-10 animate-in slide-in-from-bottom-8 duration-300">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-stone-900 dark:text-white">{selectedEventDetails.title}</h3>
              <button 
                onClick={() => setSelectedEventDetails(null)}
                className="p-1 bg-stone-100 dark:bg-zinc-800 rounded-full hover:bg-stone-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <X className="w-4 h-4 text-stone-500" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-stone-700 dark:text-zinc-300 overflow-y-auto max-h-[30vh] custom-scrollbar pr-2">
              <div>
                <p className="font-bold text-stone-900 dark:text-white mb-1">Description</p>
                <p className="text-xs whitespace-pre-wrap leading-relaxed">{selectedEventDetails.description || "No description provided."}</p>
                <div className="mt-4 flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between border-b border-stone-100 dark:border-white/5 pb-1">
                    <span className="text-stone-500 font-bold">Category</span>
                    <span className="font-medium">{selectedEventDetails.category}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-stone-100 dark:border-white/5 pb-1">
                    <span className="text-stone-500 font-bold">Host</span>
                    <span className="font-medium">{selectedEventDetails.hostName || "N/A"} ({selectedEventDetails.hostType || "unknown"})</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-stone-100 dark:border-white/5 pb-1">
                    <span className="text-stone-500 font-bold">Submitted By</span>
                    <span className="font-medium">{selectedEventDetails.submitterDisplayName || selectedEventDetails.submittedBy || "Unknown"}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="bg-stone-50 dark:bg-zinc-900 p-3 rounded-xl border border-stone-200 dark:border-white/5">
                  <p className="font-bold text-[10px] uppercase text-stone-500 mb-1 tracking-wider">Date & Time</p>
                  <p className="text-xs font-medium">Starts: {new Date(selectedEventDetails.startDateTime).toLocaleString()}</p>
                  {selectedEventDetails.endDateTime && (
                    <p className="text-xs font-medium">Ends: {new Date(selectedEventDetails.endDateTime).toLocaleString()}</p>
                  )}
                </div>
                <div className="bg-stone-50 dark:bg-zinc-900 p-3 rounded-xl border border-stone-200 dark:border-white/5">
                  <p className="font-bold text-[10px] uppercase text-stone-500 mb-1 tracking-wider">Location</p>
                  <p className="text-xs font-medium">{selectedEventDetails.locationName}</p>
                  <p className="text-xs text-stone-500">{selectedEventDetails.address}, {selectedEventDetails.city}, {selectedEventDetails.state}</p>
                </div>
                {selectedEventDetails.status === "pending" && (
                   <div className="flex gap-2 mt-auto pt-2">
                    <button
                      onClick={() => handleAction(selectedEventDetails.id, "approve")}
                      disabled={updatingId === selectedEventDetails.id}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow disabled:opacity-50"
                    >
                      Approve Event
                    </button>
                    <button
                      onClick={() => handleAction(selectedEventDetails.id, "reject")}
                      disabled={updatingId === selectedEventDetails.id}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow disabled:opacity-50"
                    >
                      Reject Event
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
