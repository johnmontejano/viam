"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPendingEvents,
  moderateCatholicEvent,
  getDistricts,
  createDistrict,
  searchProfilesByEmail,
  promoteUserRole,
  getDistrictAssignments,
  assignAdminToDistrict,
  revokeAdminDistrictAssignment,
  getAllAdminEvents,
} from "@/lib/supabase/db";
import {
  ShieldCheck,
  Loader2,
  MapPin,
  Clock,
  Check,
  X,
  MessageSquare,
  AlertTriangle,
  Plus,
  Trash2,
  Search,
  Users,
  FolderPlus,
  Map,
  Activity,
  ArrowLeft,
  RefreshCw,
  Lock,
  LayoutDashboard,
  Calendar,
  ChevronRight,
  Eye
} from "lucide-react";

type AdminState = "checking" | "authorized" | "unauthorized" | "error";

export default function AdminDashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const { isLoggedIn, userProfile, firebaseUser, authLoading } = auth;

  const [adminState, setAdminState] = useState<AdminState>("checking");
  const [stateError, setStateError] = useState("");

  // Tab State
  const [activeTab, setActiveTab] = useState<"queue" | "events" | "districts" | "admins">("queue");

  // Moderation Queue
  const [pendingEvents, setPendingEvents] = useState<any[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [queueError, setQueueError] = useState("");
  const [modulatingEvent, setModulatingEvent] = useState<string | null>(null);
  const [moderationNote, setModerationNote] = useState("");
  const [selectedEventForNote, setSelectedEventForNote] = useState<string | null>(null);

  // Approved Events
  const [approvedEvents, setApprovedEvents] = useState<any[]>([]);
  const [loadingApproved, setLoadingApproved] = useState(false);

  // Districts
  const [districts, setDistricts] = useState<any[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [districtsError, setDistrictsError] = useState("");
  const [newDistrictName, setNewDistrictName] = useState("");
  const [newDistrictCity, setNewDistrictCity] = useState("");
  const [newDistrictState, setNewDistrictState] = useState("");
  const [districtFeedback, setDistrictFeedback] = useState({ type: "", msg: "" });
  const [creatingDistrict, setCreatingDistrict] = useState(false);

  // Local Admins
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assigningDistrictMap, setAssigningDistrictMap] = useState<Record<string, string>>({});
  const [adminFeedback, setAdminFeedback] = useState({ type: "", msg: "" });

  const isMaster = userProfile?.role === "master_admin";

  // Authorization check
  useEffect(() => {
    if (authLoading) {
      setAdminState("checking");
      return;
    }

    if (!isLoggedIn) {
      setAdminState("unauthorized");
      setStateError("You must be signed in to access this page.");
      return;
    }

    const role = userProfile?.role;
    if (role !== "master_admin" && role !== "local_admin") {
      setAdminState("unauthorized");
      setStateError("You do not have administrative permissions.");
      return;
    }

    setAdminState("authorized");
    setStateError("");
  }, [authLoading, isLoggedIn, userProfile]);

  // Load data when authorized
  const loadQueue = useCallback(async () => {
    if (!firebaseUser || !userProfile) return;
    setLoadingQueue(true);
    setQueueError("");
    try {
      const data = await getPendingEvents(firebaseUser.uid, userProfile.role);
      setPendingEvents(data);
    } catch (err: any) {
      console.error("[Admin] Queue load failed:", err);
      setQueueError(err?.message || "Failed to load moderation queue.");
    } finally {
      setLoadingQueue(false);
    }
  }, [firebaseUser, userProfile]);

  const loadApprovedEvents = useCallback(async () => {
    setLoadingApproved(true);
    try {
      const data = await getAllAdminEvents();
      setApprovedEvents(data);
    } catch (err) {
      console.error("[DEBUG - ALL EVENTS FETCH ERROR]", err);
    } finally {
      setLoadingApproved(false);
    }
  }, []);

  const loadDistricts = useCallback(async () => {
    setLoadingDistricts(true);
    setDistrictsError("");
    try {
      const data = await getDistricts();
      setDistricts(data);
    } catch (err: any) {
      setDistrictsError(err?.message || "Failed to load districts.");
    } finally {
      setLoadingDistricts(false);
    }
  }, []);

  const loadAssignments = useCallback(async () => {
    setLoadingAssignments(true);
    try {
      const data = await getDistrictAssignments();
      setAssignments(data);
    } catch {
      // Silent
    } finally {
      setLoadingAssignments(false);
    }
  }, []);

  useEffect(() => {
    if (adminState === "authorized") {
      loadQueue();
      loadApprovedEvents();
      if (isMaster) {
        loadDistricts();
        loadAssignments();
      }
    }
  }, [adminState, isMaster]);

  // Event Moderation
  const handleModerate = async (eventId: string, action: "approve" | "reject" | "changes_requested") => {
    if (!firebaseUser) return;
    setModulatingEvent(eventId);
    try {
      const note = selectedEventForNote === eventId ? moderationNote.trim() : undefined;
      await moderateCatholicEvent(eventId, action, firebaseUser.uid, note);
      setModerationNote("");
      setSelectedEventForNote(null);
      await loadQueue();
      await loadApprovedEvents();
    } catch (err: any) {
      alert("Moderation failed: " + (err?.message || "Unknown error"));
    } finally {
      setModulatingEvent(null);
    }
  };

  // Create District
  const handleCreateDistrict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDistrictName.trim()) return;
    setCreatingDistrict(true);
    setDistrictFeedback({ type: "", msg: "" });
    try {
      await createDistrict({
        name: newDistrictName.trim(),
        city: newDistrictCity.trim() || undefined,
        state: newDistrictState.trim().toUpperCase() || undefined,
      });
      setNewDistrictName("");
      setNewDistrictCity("");
      setNewDistrictState("");
      setDistrictFeedback({ type: "success", msg: "District created successfully." });
      await loadDistricts();
    } catch (err: any) {
      setDistrictFeedback({ type: "error", msg: err?.message || "Failed to create district." });
    } finally {
      setCreatingDistrict(false);
    }
  };

  // Search Users
  const handleSearchUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;
    setSearchingUsers(true);
    setAdminFeedback({ type: "", msg: "" });
    try {
      const data = await searchProfilesByEmail(searchEmail);
      setSearchResults(data);
    } catch {
      setAdminFeedback({ type: "error", msg: "Search failed." });
    } finally {
      setSearchingUsers(false);
    }
  };

  // Role change
  const handleRoleChange = async (userId: string, role: string) => {
    if (!firebaseUser) return;
    setAdminFeedback({ type: "", msg: "" });
    try {
      await promoteUserRole(userId, role as any, firebaseUser.uid);
      setAdminFeedback({ type: "success", msg: "Role updated successfully." });
      const data = await searchProfilesByEmail(searchEmail);
      setSearchResults(data);
    } catch (err: any) {
      setAdminFeedback({ type: "error", msg: err?.message || "Failed to update role." });
    }
  };

  // District assignment
  const handleAssignDistrict = async (userId: string) => {
    if (!firebaseUser) return;
    const districtId = assigningDistrictMap[userId];
    if (!districtId) return;
    setAdminFeedback({ type: "", msg: "" });
    try {
      await assignAdminToDistrict(userId, districtId, firebaseUser.uid);
      setAdminFeedback({ type: "success", msg: "Admin assigned to district." });
      await loadAssignments();
    } catch (err: any) {
      setAdminFeedback({ type: "error", msg: err?.message || "Assignment failed." });
    }
  };

  const handleRevokeAssignment = async (assignmentId: string) => {
    setAdminFeedback({ type: "", msg: "" });
    try {
      await revokeAdminDistrictAssignment(assignmentId);
      setAdminFeedback({ type: "success", msg: "Assignment revoked." });
      await loadAssignments();
    } catch (err: any) {
      setAdminFeedback({ type: "error", msg: err?.message || "Revocation failed." });
    }
  };

  // ─── RENDER STATES ───
  if (adminState === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] dark:bg-[#09090b] px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="p-4 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200/50 dark:border-rose-900/30">
            <Loader2 className="w-6 h-6 text-[#be123c] animate-spin" />
          </div>
          <p className="text-sm text-stone-500 dark:text-zinc-400 font-medium">Verifying credentials…</p>
        </div>
      </div>
    );
  }

  if (adminState === "unauthorized") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] dark:bg-[#09090b] px-4">
        <div className="max-w-sm w-full text-center flex flex-col items-center gap-5">
          <div className="p-5 bg-stone-100 dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-white/5">
            <Lock className="w-8 h-8 text-stone-400 dark:text-zinc-500" />
          </div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-white">Access Denied</h2>
          <p className="text-sm text-stone-500 dark:text-zinc-400">{stateError}</p>
          <div className="flex gap-3 w-full">
            <button onClick={() => router.push("/profile")} className="flex-1 py-2.5 px-4 text-sm font-semibold text-stone-700 dark:text-zinc-300 bg-stone-100 dark:bg-zinc-800 rounded-xl border border-stone-200 dark:border-white/5 hover:bg-stone-200 dark:hover:bg-zinc-700 transition-colors">
              Profile
            </button>
            <button onClick={() => router.push("/")} className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-[#be123c] rounded-xl hover:bg-rose-700 transition-colors">
              Finder
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (adminState === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] dark:bg-[#09090b] px-4">
        <div className="max-w-sm w-full text-center flex flex-col items-center gap-5">
          <div className="p-5 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-900/30">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-white">Something Went Wrong</h2>
          <p className="text-sm text-stone-500 dark:text-zinc-400">{stateError || "Could not load admin dashboard."}</p>
          <div className="flex gap-3 w-full">
            <button onClick={() => router.push("/profile")} className="flex-1 py-2.5 px-4 text-sm font-semibold text-stone-700 dark:text-zinc-300 bg-stone-100 dark:bg-zinc-800 rounded-xl border border-stone-200 dark:border-white/5 hover:bg-stone-200 dark:hover:bg-zinc-700 transition-colors">
              Profile
            </button>
            <button onClick={() => { setAdminState("checking"); window.location.reload(); }} className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-[#be123c] rounded-xl hover:bg-rose-700 transition-colors flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── AUTHORIZED DASHBOARD ───
  const tabs = isMaster
    ? [
        { id: "queue" as const, label: "Moderation Queue", icon: Activity, count: pendingEvents.length },
        { id: "events" as const, label: "Events", icon: Calendar, count: approvedEvents.length },
        { id: "districts" as const, label: "Districts", icon: Map, count: districts.length },
        { id: "admins" as const, label: "Local Admins", icon: Users, count: assignments.length },
      ]
    : [
        { id: "queue" as const, label: "Moderation Queue", icon: Activity, count: pendingEvents.length },
      ];

  const stats = [
    { label: "Pending Reviews", value: pendingEvents.length, icon: Activity, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
    { label: "Approved Events", value: approvedEvents.length, icon: Check, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    { label: "Districts", value: districts.length, icon: Map, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { label: "Local Admins", value: assignments.length, icon: Users, color: "text-[#be123c] dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30" },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#09090b] transition-colors">
      {/* Top Bar */}
      <div className="border-b border-stone-200 dark:border-white/5 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <button onClick={() => router.push("/profile")} className="flex items-center gap-1.5 text-sm text-stone-600 dark:text-zinc-400 hover:text-[#be123c] dark:hover:text-rose-400 transition-colors font-medium">
            <ArrowLeft className="w-4 h-4" /> Profile
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-200/50 dark:border-emerald-900/30 uppercase tracking-wider">
              Secure Session
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        {/* Dashboard Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-[#be123c] text-white rounded-xl shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-900 dark:text-white">
                {isMaster ? "Master Admin Dashboard" : "Admin Moderation Portal"}
              </h1>
              <p className="text-sm text-stone-500 dark:text-zinc-400">
                Event moderation and district management
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {isMaster && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-xl p-4 flex items-center gap-3 shadow-sm">
                <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-stone-900 dark:text-white leading-none">{stat.value}</p>
                  <p className="text-[11px] text-stone-500 dark:text-zinc-500 font-medium mt-0.5 truncate">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 border-b border-stone-200 dark:border-white/5 mb-6 overflow-x-auto custom-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-[#be123c] text-[#be123c]"
                  : "border-transparent text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-white"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.id 
                    ? "bg-[#be123c]/10 text-[#be123c]" 
                    : "bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* TAB: MODERATION QUEUE */}
        {activeTab === "queue" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-stone-800 dark:text-zinc-200">
                Pending Event Reviews
              </h2>
              <button onClick={loadQueue} disabled={loadingQueue} className="text-xs text-stone-500 dark:text-zinc-400 hover:text-[#be123c] flex items-center gap-1 font-medium transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingQueue ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>

            {loadingQueue ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 text-[#be123c] animate-spin" />
              </div>
            ) : queueError ? (
              <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-xl p-8 text-center">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                <p className="text-sm text-stone-600 dark:text-zinc-400 mb-3">{queueError}</p>
                <button onClick={loadQueue} className="text-sm font-semibold text-[#be123c] hover:underline">Try Again</button>
              </div>
            ) : pendingEvents.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-xl p-10 text-center">
                <Check className="w-10 h-10 text-emerald-500 mx-auto mb-3 opacity-70" />
                <h3 className="text-base font-bold text-stone-800 dark:text-white mb-1">No Events Awaiting Review</h3>
                <p className="text-sm text-stone-500 dark:text-zinc-400 max-w-xs mx-auto">
                  New Catholic Event submissions will appear here when review is needed.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {pendingEvents.map((event) => (
                  <div key={event.id} className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-xl p-4 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 uppercase border border-rose-200/50 dark:border-rose-900/30">
                            {event.category}
                          </span>
                          <span className="text-[10px] text-stone-400 dark:text-zinc-500">
                            by {event.submittedBy?.slice(0, 8)}…
                          </span>
                        </div>
                        <h3 className="font-bold text-stone-900 dark:text-white leading-snug mb-1">{event.title}</h3>
                        <p className="text-xs text-stone-500 dark:text-zinc-400 line-clamp-2 mb-3">{event.description || "No description."}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500 dark:text-zinc-400">
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {event.locationName || event.address}, {event.city}, {event.state}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(event.startDateTime).toLocaleDateString("en-US")} {new Date(event.startDateTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>

                      <div className="flex lg:flex-col gap-2 shrink-0">
                        <button onClick={() => handleModerate(event.id, "approve")} disabled={!!modulatingEvent} className="flex-1 lg:w-36 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button onClick={() => handleModerate(event.id, "reject")} disabled={!!modulatingEvent} className="flex-1 lg:w-36 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                        <button onClick={() => setSelectedEventForNote(selectedEventForNote === event.id ? null : event.id)} className="flex-1 lg:w-36 bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 font-semibold text-xs py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-stone-200 dark:border-white/5 hover:bg-stone-200 dark:hover:bg-zinc-700">
                          <MessageSquare className="w-3.5 h-3.5" /> Note
                        </button>
                      </div>
                    </div>

                    {selectedEventForNote === event.id && (
                      <div className="mt-3 bg-stone-50 dark:bg-zinc-950 rounded-lg p-3 border border-stone-100 dark:border-white/5">
                        <textarea
                          value={moderationNote}
                          onChange={(e) => setModerationNote(e.target.value)}
                          placeholder="Provide review remarks or revision instructions…"
                          rows={2}
                          className="w-full bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#be123c] text-stone-900 dark:text-white"
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button onClick={() => { setModerationNote(""); setSelectedEventForNote(null); }} className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-white px-3 py-1.5 font-medium transition-colors">
                            Cancel
                          </button>
                          <button onClick={() => handleModerate(event.id, "changes_requested")} disabled={!moderationNote.trim() || !!modulatingEvent} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs py-1.5 px-4 rounded-lg transition-colors disabled:opacity-50">
                            Request Changes
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: EVENTS (overview) */}
        {activeTab === "events" && isMaster && (
          <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-stone-800 dark:text-zinc-200 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#be123c]" />
                Event Directory
              </h2>
              <div className="text-xs font-medium text-stone-500">Total: {approvedEvents.length}</div>
            </div>

            {loadingApproved ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 text-[#be123c] animate-spin" />
              </div>
            ) : approvedEvents.length === 0 ? (
              <div className="bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-white/5 rounded-xl p-10 text-center">
                <Calendar className="w-10 h-10 text-stone-300 dark:text-zinc-700 mx-auto mb-3" />
                <h3 className="text-base font-bold text-stone-800 dark:text-white mb-1">No Events Found</h3>
                <p className="text-sm text-stone-500 dark:text-zinc-400">Events will appear here once submitted.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-white/5 bg-stone-50 dark:bg-zinc-950">
                      <th className="px-4 py-3 text-[10px] font-bold text-stone-500 dark:text-zinc-500 uppercase tracking-wider rounded-tl-xl">Event Title & Category</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-stone-500 dark:text-zinc-500 uppercase tracking-wider">Date & Time</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-stone-500 dark:text-zinc-500 uppercase tracking-wider">Location</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-stone-500 dark:text-zinc-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-stone-500 dark:text-zinc-500 uppercase tracking-wider text-right rounded-tr-xl">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-white/5 text-sm">
                    {approvedEvents.map((event) => (
                      <tr key={event.id} className="hover:bg-stone-50/50 dark:hover:bg-zinc-950/50 transition-colors group">
                        <td className="px-4 py-4 min-w-[200px]">
                          <div className="font-bold text-stone-900 dark:text-white mb-1 leading-snug group-hover:text-[#be123c] transition-colors">{event.title}</div>
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 uppercase border border-rose-200/50 dark:border-rose-900/30">
                            {event.category}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-stone-600 dark:text-zinc-400 text-xs font-medium whitespace-nowrap">
                          <div className="flex items-center gap-1.5 mb-1"><Calendar className="w-3.5 h-3.5 opacity-70" /> {new Date(event.startDateTime).toLocaleDateString("en-US")}</div>
                          <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 opacity-70" /> {new Date(event.startDateTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div>
                        </td>
                        <td className="px-4 py-4 text-stone-600 dark:text-zinc-400 text-xs font-medium">
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 opacity-70 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{event.locationName || event.address}, {event.city}, {event.state}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                            event.status === 'approved' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30'
                              : event.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/30'
                              : 'bg-stone-100 text-stone-600 border-stone-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-white/5'
                          }`}>
                            {event.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button 
                            className="p-1.5 bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 hover:text-[#be123c] dark:hover:text-rose-400 rounded-lg transition-colors border border-stone-200 dark:border-white/5"
                            title="View Details"
                            onClick={() => router.push(`/?event=${event.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: DISTRICTS */}
        {activeTab === "districts" && isMaster && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-xl p-5 shadow-sm">
                <h2 className="text-sm font-bold text-stone-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-[#be123c]" /> Create District
                </h2>
                <form onSubmit={handleCreateDistrict} className="space-y-3">
                  <input type="text" required value={newDistrictName} onChange={(e) => setNewDistrictName(e.target.value)} placeholder="District name" className="w-full bg-[#FAF9F6] dark:bg-zinc-950 border border-stone-200 dark:border-white/5 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#be123c] text-stone-900 dark:text-white" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={newDistrictCity} onChange={(e) => setNewDistrictCity(e.target.value)} placeholder="City" className="bg-[#FAF9F6] dark:bg-zinc-950 border border-stone-200 dark:border-white/5 rounded-lg px-3 py-2.5 text-sm focus:outline-none text-stone-900 dark:text-white" />
                    <input type="text" maxLength={2} value={newDistrictState} onChange={(e) => setNewDistrictState(e.target.value)} placeholder="State" className="bg-[#FAF9F6] dark:bg-zinc-950 border border-stone-200 dark:border-white/5 rounded-lg px-3 py-2.5 text-sm focus:outline-none text-stone-900 dark:text-white uppercase" />
                  </div>
                  {districtFeedback.msg && (
                    <p className={`text-xs font-medium flex items-center gap-1.5 ${districtFeedback.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
                      {districtFeedback.type === "success" ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      {districtFeedback.msg}
                    </p>
                  )}
                  <button type="submit" disabled={creatingDistrict} className="w-full bg-[#be123c] hover:bg-rose-700 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                    {creatingDistrict ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create District
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-xl p-5 shadow-sm">
                <h2 className="text-sm font-bold text-stone-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
                  <Map className="w-4 h-4 text-[#be123c]" /> Districts ({districts.length})
                </h2>
                {loadingDistricts ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-[#be123c] animate-spin" /></div>
                ) : districtsError ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-stone-500 dark:text-zinc-400 mb-2">{districtsError}</p>
                    <button onClick={loadDistricts} className="text-sm font-semibold text-[#be123c]">Retry</button>
                  </div>
                ) : districts.length === 0 ? (
                  <p className="text-sm text-stone-400 dark:text-zinc-500 py-6 text-center">No districts created yet.</p>
                ) : (
                  <div className="space-y-2">
                    {districts.map((d) => (
                      <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-stone-50 dark:bg-zinc-950 border border-stone-100 dark:border-white/5">
                        <div>
                          <p className="text-sm font-bold text-stone-900 dark:text-white">{d.name}</p>
                          <p className="text-xs text-stone-500 dark:text-zinc-400">{[d.city, d.state].filter(Boolean).join(", ") || "No location set"}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 uppercase">Active</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: LOCAL ADMINS */}
        {activeTab === "admins" && isMaster && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-stone-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
                <Search className="w-4 h-4 text-[#be123c]" /> Search Users by Email
              </h2>
              <form onSubmit={handleSearchUsers} className="flex gap-2 max-w-lg mb-4">
                <input type="text" required value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} placeholder="Enter user email…" className="flex-1 bg-[#FAF9F6] dark:bg-zinc-950 border border-stone-200 dark:border-white/5 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#be123c] text-stone-900 dark:text-white" />
                <button type="submit" disabled={searchingUsers} className="bg-[#be123c] hover:bg-rose-700 text-white font-semibold text-sm py-2.5 px-5 rounded-lg transition-colors shrink-0 flex items-center gap-1.5">
                  {searchingUsers ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Search
                </button>
              </form>

              {adminFeedback.msg && (
                <p className={`text-xs font-medium flex items-center gap-1.5 mb-4 ${adminFeedback.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
                  {adminFeedback.type === "success" ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  {adminFeedback.msg}
                </p>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2 border-t border-stone-100 dark:border-white/5 pt-4">
                  {searchResults.map((user) => (
                    <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-stone-50 dark:bg-zinc-950 border border-stone-100 dark:border-white/5">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-stone-900 dark:text-white truncate">{user.display_name}</p>
                        <p className="text-xs text-stone-500 dark:text-zinc-400 truncate">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        <select value={user.role} onChange={(e) => handleRoleChange(user.id, e.target.value)} className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-lg px-2 py-1.5 text-xs font-semibold text-stone-700 dark:text-zinc-300 focus:outline-none capitalize">
                          <option value="user">User</option>
                          <option value="local_admin">Local Admin</option>
                          <option value="master_admin">Master Admin</option>
                        </select>
                        {user.role === "local_admin" && (
                          <>
                            <select value={assigningDistrictMap[user.id] || ""} onChange={(e) => setAssigningDistrictMap((prev) => ({ ...prev, [user.id]: e.target.value }))} className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-lg px-2 py-1.5 text-xs text-stone-700 dark:text-zinc-300 focus:outline-none font-semibold">
                              <option value="">Assign district…</option>
                              {districts.map((dist) => (
                                <option key={dist.id} value={dist.id}>{dist.name}</option>
                              ))}
                            </select>
                            <button onClick={() => handleAssignDistrict(user.id)} disabled={!assigningDistrictMap[user.id]} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] py-1.5 px-3 rounded-lg uppercase transition-colors disabled:opacity-50">
                              Assign
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Existing Assignments */}
            <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-stone-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#be123c]" /> District Assignments ({assignments.length})
              </h2>
              {loadingAssignments ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-[#be123c] animate-spin" /></div>
              ) : assignments.length === 0 ? (
                <p className="text-sm text-stone-400 dark:text-zinc-500 py-6 text-center">No district assignments yet.</p>
              ) : (
                <div className="space-y-2">
                  {assignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-stone-50 dark:bg-zinc-950 border border-stone-100 dark:border-white/5">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-stone-900 dark:text-white truncate">{a.profiles?.email || "Unknown"}</p>
                        <p className="text-xs text-stone-500 dark:text-zinc-400">{a.profiles?.display_name} → <span className="font-semibold text-[#be123c]">{a.districts?.name}</span></p>
                      </div>
                      <button onClick={() => handleRevokeAssignment(a.id)} className="text-stone-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20" title="Revoke">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
