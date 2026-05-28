"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserProfile, unsaveMassLocation, unsaveEvent, getUserSubmissions, getEventsByIds, uploadAvatar, deleteAvatar } from "@/lib/supabase/db";
import {
  User,
  Settings,
  Heart,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  ShieldCheck,
  LogOut,
  Loader2,
  Trash2,
  Globe,
  Check,
  AlertTriangle,
  MessageSquare,
  ArrowLeft,
  BookOpen,
  ChevronRight,
  RefreshCw,
  Mail,
  Lock,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const auth = useAuth();
  const {
    isLoggedIn,
    userProfile,
    firebaseUser,
    authLoading,
    savedMasses,
    savedEvents,
    setSavedMasses,
    setSavedEvents,
    signOut,
    refreshProfile,
  } = auth;

  const [activeTab, setActiveTab] = useState<"masses" | "events" | "submissions" | "settings">("masses");

  // Data states with independent loading/error
  const [churches, setChurches] = useState<any[]>([]);
  const [loadingChurches, setLoadingChurches] = useState(false);
  const [churchesError, setChurchesError] = useState("");

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionsError, setSubmissionsError] = useState("");

  const [savedEventsData, setSavedEventsData] = useState<any[]>([]);
  const [loadingSavedEvents, setLoadingSavedEvents] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Settings
  const [displayName, setDisplayName] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [homeState, setHomeState] = useState("");
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState({ type: "", msg: "" });

  // Redirect guests
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/");
    }
  }, [authLoading, isLoggedIn, router]);

  // Load church directory
  const loadChurches = useCallback(async () => {
    setLoadingChurches(true);
    setChurchesError("");
    try {
      const res = await fetch("/data/latinmass_locations.json");
      const data = await res.json();
      setChurches(data);
    } catch (err) {
      setChurchesError("Failed to load Mass directory.");
    } finally {
      setLoadingChurches(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) loadChurches();
  }, [isLoggedIn, loadChurches]);

  // Load submissions
  const loadSubmissions = useCallback(async () => {
    if (!firebaseUser) return;
    setLoadingSubmissions(true);
    setSubmissionsError("");
    try {
      const data = await getUserSubmissions(firebaseUser.uid);
      setSubmissions(data);
    } catch (err) {
      setSubmissionsError("Failed to load your submissions.");
    } finally {
      setLoadingSubmissions(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (isLoggedIn && activeTab === "submissions") loadSubmissions();
  }, [isLoggedIn, activeTab, loadSubmissions]);

  const loadSavedEventsData = useCallback(async () => {
    if (!isLoggedIn || savedEvents.length === 0) {
      setSavedEventsData([]);
      return;
    }
    setLoadingSavedEvents(true);
    try {
      const data = await getEventsByIds(savedEvents);
      setSavedEventsData(data);
    } catch (err) {
      console.error("Failed to load saved events details:", err);
    } finally {
      setLoadingSavedEvents(false);
    }
  }, [isLoggedIn, savedEvents]);

  useEffect(() => {
    if (isLoggedIn && activeTab === "events") loadSavedEventsData();
  }, [isLoggedIn, activeTab, loadSavedEventsData]);

  // Init settings
  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || "");
      setHomeCity((userProfile as any).homeCity || "");
      setHomeState((userProfile as any).homeState || "");
    }
  }, [userProfile]);

  // Still loading auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] dark:bg-[#09090b]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-[#be123c] animate-spin" />
          <p className="text-sm text-stone-500 dark:text-zinc-400">Loading profile…</p>
        </div>
      </div>
    );
  }

  // Not logged in — redirect is happening
  if (!isLoggedIn) return null;

  // Resolve saved masses against real data
  const resolvedSavedMasses = savedMasses.map((stableId) => {
    const match = churches.find((c) => {
      const id = encodeURIComponent(c.church_name + "|" + c.address);
      return id === stableId;
    });
    return { stableId, data: match };
  });

  const handleRemoveMass = async (stableId: string) => {
    if (!firebaseUser) return;
    try {
      await unsaveMassLocation(firebaseUser.uid, stableId);
      setSavedMasses((prev) => prev.filter((id) => id !== stableId));
    } catch (err) {
      console.error("Error removing saved mass:", err);
    }
  };

  const handleRemoveEvent = async (eventId: string) => {
    if (!firebaseUser) return;
    try {
      await unsaveEvent(firebaseUser.uid, eventId);
      setSavedEvents((prev) => prev.filter((id) => id !== eventId));
    } catch (err) {
      console.error("Error removing saved event:", err);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;

    if (file.size > 4 * 1024 * 1024) {
      alert("Image is too large. Maximum size is 4MB.");
      return;
    }

    setUploadingAvatar(true);
    try {
      await uploadAvatar(firebaseUser.uid, file);
      await refreshProfile();
      setSettingsFeedback({ type: "success", msg: "Profile photo uploaded successfully." });
    } catch (err: any) {
      console.error("Avatar upload failed:", err);
      setSettingsFeedback({ type: "error", msg: err?.message || "Failed to upload photo." });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (!firebaseUser || !userProfile?.avatarUrl) return;

    if (!confirm("Are you sure you want to remove your profile photo?")) return;

    setUploadingAvatar(true);
    try {
      await deleteAvatar(firebaseUser.uid, userProfile.avatarUrl);
      await refreshProfile();
      setSettingsFeedback({ type: "success", msg: "Profile photo removed." });
    } catch (err: any) {
      console.error("Avatar removal failed:", err);
      setSettingsFeedback({ type: "error", msg: err?.message || "Failed to remove photo." });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setUpdatingSettings(true);
    setSettingsFeedback({ type: "", msg: "" });
    try {
      await updateUserProfile(firebaseUser.uid, { displayName, homeCity, homeState });
      await refreshProfile();
      setSettingsFeedback({ type: "success", msg: "Profile updated successfully." });
    } catch (err: any) {
      setSettingsFeedback({ type: "error", msg: err?.message || "Failed to update profile." });
    } finally {
      setUpdatingSettings(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-stone-100 text-stone-600 border-stone-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
      pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
      approved: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
      changes_requested: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30",
      rejected: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30",
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${styles[status] || styles.draft}`}>
        {status === "pending" ? "Pending Review" : status.replace("_", " ")}
      </span>
    );
  };

  const getRoleBadge = () => {
    const role = userProfile?.role || "user";
    if (role === "master_admin") {
      return (
        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-[#be123c] to-rose-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">
          <ShieldCheck className="w-3 h-3" /> Master Admin
        </span>
      );
    }
    if (role === "local_admin") {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
          <ShieldCheck className="w-3 h-3" /> Local Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-stone-200 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
        <User className="w-3 h-3" /> User
      </span>
    );
  };

  const tabItems = [
    { id: "masses" as const, label: "Saved Masses", icon: BookOpen, count: savedMasses.length },
    { id: "events" as const, label: "Saved Events", icon: Heart, count: savedEvents.length },
    { id: "submissions" as const, label: "Submissions", icon: Calendar, count: null },
    { id: "settings" as const, label: "Settings", icon: Settings, count: null },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#09090b] transition-colors">
      {/* Top Bar */}
      <div className="border-b border-stone-200 dark:border-white/5 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.push("/")} className="flex items-center gap-1.5 text-sm text-stone-600 dark:text-zinc-400 hover:text-[#be123c] dark:hover:text-rose-400 transition-colors font-medium">
            <ArrowLeft className="w-4 h-4" /> Finder
          </button>
          <button onClick={signOut} className="flex items-center gap-1.5 text-sm text-stone-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors font-medium">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-2xl p-5 shadow-sm mb-5">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            {userProfile?.avatarUrl ? (
              <img 
                src={userProfile.avatarUrl} 
                alt="Avatar" 
                className="w-12 h-12 rounded-xl object-cover border border-rose-200/50 dark:border-rose-900/30 shadow-sm shrink-0" 
              />
            ) : (
              <div className="p-3 bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-950/40 dark:to-rose-950/20 text-[#be123c] rounded-xl border border-rose-200/50 dark:border-rose-900/30 shrink-0">
                <User className="w-6 h-6" />
              </div>
            )}
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-lg font-bold text-stone-900 dark:text-white truncate">
                  {userProfile?.displayName || userProfile?.email?.split("@")[0] || "User"}
                </h1>
                {getRoleBadge()}
              </div>
              <p className="text-sm text-stone-500 dark:text-zinc-400 truncate">{userProfile?.email}</p>
              <p className="text-xs text-stone-400 dark:text-zinc-500 mt-1">
                Member since {userProfile?.createdAt
                  ? new Date(userProfile.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long" })
                  : "Recently"}
              </p>
            </div>
          </div>

          {/* Admin button */}
          {userProfile && (userProfile.role === "master_admin" || userProfile.role === "local_admin") && (
            <button
              onClick={() => router.push("/admin")}
              className="mt-4 w-full sm:w-auto bg-[#be123c] hover:bg-rose-700 text-white font-semibold text-sm py-2.5 px-5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <ShieldCheck className="w-4 h-4" />
              {userProfile.role === "master_admin" ? "Master Admin Dashboard" : "Admin Moderation Portal"}
              <ChevronRight className="w-4 h-4 opacity-60" />
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 border-b border-stone-200 dark:border-white/5 mb-5 overflow-x-auto custom-scrollbar">
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-[#be123c] text-[#be123c]"
                  : "border-transparent text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-white"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(" ").pop()}</span>
              {tab.count !== null && tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.id ? "bg-[#be123c]/10 text-[#be123c]" : "bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400"
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* TAB: SAVED MASSES */}
        {activeTab === "masses" && (
          <div>
            {loadingChurches ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-[#be123c] animate-spin" /></div>
            ) : churchesError ? (
              <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-xl p-8 text-center">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                <p className="text-sm text-stone-500 dark:text-zinc-400 mb-3">{churchesError}</p>
                <button onClick={loadChurches} className="text-sm font-semibold text-[#be123c]">Retry</button>
              </div>
            ) : resolvedSavedMasses.filter((m) => m.data).length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-xl p-8 text-center">
                <BookOpen className="w-10 h-10 text-stone-300 dark:text-zinc-700 mx-auto mb-3" />
                <h3 className="text-base font-bold text-stone-800 dark:text-white mb-1">No Saved Mass Locations</h3>
                <p className="text-sm text-stone-500 dark:text-zinc-400 max-w-xs mx-auto mb-4">
                  Save Latin Mass locations for quick access to Mass times and directions.
                </p>
                <button onClick={() => router.push("/")} className="bg-[#be123c] hover:bg-rose-700 text-white font-semibold text-sm py-2.5 px-5 rounded-xl transition-colors">
                  Browse Latin Masses
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {resolvedSavedMasses.map((match) => {
                  if (!match.data) return null;
                  const church = match.data;
                  return (
                    <div key={match.stableId} className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-xl p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 uppercase border border-rose-200/50 dark:border-rose-900/30">
                            {church.category_normalized || "Latin Mass"}
                          </span>
                          <h3 className="font-bold text-stone-900 dark:text-white mt-2 leading-snug">{church.church_name}</h3>
                        </div>
                        <button onClick={() => handleRemoveMass(match.stableId)} className="text-stone-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 shrink-0" title="Remove">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-zinc-400 mb-2">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{church.address}, {church.city}, {church.state}</span>
                      </div>
                      <div className="flex items-start gap-1.5 text-xs text-stone-500 dark:text-zinc-400 border-t border-stone-100 dark:border-white/5 pt-2 mt-2">
                        <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <p className="text-[11px] whitespace-pre-line leading-relaxed line-clamp-3">
                          {church.hours ? church.hours.replace(/<[^>]+>/g, "").trim().slice(0, 200) : "Contact parish for Mass times."}
                        </p>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(church.church_name + " " + church.address)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex-1 bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 font-semibold text-xs py-2 rounded-lg text-center hover:bg-stone-200 dark:hover:bg-zinc-700 transition-colors border border-stone-200 dark:border-white/5 flex items-center justify-center gap-1.5"
                        >
                          <ExternalLink className="w-3 h-3" /> Directions
                        </a>
                        {church.website && (
                          <a href={church.website} target="_blank" rel="noopener noreferrer" className="flex-1 bg-rose-50 dark:bg-rose-950/20 text-[#be123c] font-semibold text-xs py-2 rounded-lg text-center hover:bg-[#be123c] hover:text-white transition-colors border border-rose-200/30 dark:border-rose-900/30 flex items-center justify-center gap-1.5">
                            <Globe className="w-3 h-3" /> Website
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: SAVED EVENTS */}
        {activeTab === "events" && (
          <div>
            {loadingSavedEvents ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-5 h-5 text-[#be123c] animate-spin" />
              </div>
            ) : savedEventsData.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-xl p-8 text-center">
                <Heart className="w-10 h-10 text-stone-300 dark:text-zinc-700 mx-auto mb-3" />
                <h3 className="text-base font-bold text-stone-800 dark:text-white mb-1">No Saved Events</h3>
                <p className="text-sm text-stone-500 dark:text-zinc-400 max-w-xs mx-auto mb-4">
                  Save Catholic events you may want to attend.
                </p>
                <button onClick={() => router.push("/")} className="bg-[#be123c] hover:bg-rose-700 text-white font-semibold text-sm py-2.5 px-5 rounded-xl transition-colors">
                  Browse Catholic Events
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {savedEventsData.map((event) => (
                  <div key={event.id} className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 uppercase border border-rose-200/50 dark:border-rose-900/30">
                          {event.category}
                        </span>
                        <h3 className="font-bold text-stone-900 dark:text-white mt-2 leading-snug">{event.title}</h3>
                      </div>
                      <button onClick={() => handleRemoveEvent(event.id)} className="text-stone-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 shrink-0" title="Remove">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-zinc-400 mb-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{event.locationName || event.address}, {event.city}, {event.state}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-zinc-400 border-t border-stone-100 dark:border-white/5 pt-2 mt-2">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{new Date(event.startDateTime).toLocaleDateString("en-US")} at {new Date(event.startDateTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    {event.externalUrl && (
                      <div className="mt-3">
                        <a
                          href={event.externalUrl}
                          target="_blank" rel="noopener noreferrer"
                          className="w-full bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 font-semibold text-xs py-2 rounded-lg text-center hover:bg-stone-200 dark:hover:bg-zinc-700 transition-colors border border-stone-200 dark:border-white/5 flex items-center justify-center gap-1.5"
                        >
                          <ExternalLink className="w-3 h-3" /> Event Details & RSVP
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: SUBMISSIONS */}
        {activeTab === "submissions" && (
          <div>
            {loadingSubmissions ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-[#be123c] animate-spin" /></div>
            ) : submissionsError ? (
              <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-xl p-8 text-center">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                <p className="text-sm text-stone-500 dark:text-zinc-400 mb-3">{submissionsError}</p>
                <button onClick={loadSubmissions} className="text-sm font-semibold text-[#be123c]">Retry</button>
              </div>
            ) : submissions.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-xl p-8 text-center">
                <Calendar className="w-10 h-10 text-stone-300 dark:text-zinc-700 mx-auto mb-3" />
                <h3 className="text-base font-bold text-stone-800 dark:text-white mb-1">No Event Submissions Yet</h3>
                <p className="text-sm text-stone-500 dark:text-zinc-400 max-w-xs mx-auto mb-4">
                  Submit a Catholic event for review and help your local community discover it.
                </p>
                <button onClick={() => router.push("/")} className="bg-[#be123c] hover:bg-rose-700 text-white font-semibold text-sm py-2.5 px-5 rounded-xl transition-colors">
                  Submit Catholic Event
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map((event) => (
                  <div key={event.id} className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 uppercase border border-rose-200/50 dark:border-rose-900/30">
                        {event.category}
                      </span>
                      {getStatusBadge(event.status)}
                      <span className="text-[10px] text-stone-400 dark:text-zinc-500">
                        {new Date(event.createdAt).toLocaleDateString("en-US")}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-stone-900 dark:text-white leading-snug mb-1">{event.title}</h3>
                    <p className="text-xs text-stone-500 dark:text-zinc-400 line-clamp-2 mb-2">{event.description || "No description."}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500 dark:text-zinc-400 border-t border-stone-100 dark:border-white/5 pt-2">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.locationName || event.address}, {event.city}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(event.startDateTime).toLocaleDateString("en-US")} {new Date(event.startDateTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    {event.reviewNotes && (
                      <div className="mt-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-xs">
                        <p className="font-bold text-[10px] text-[#be123c] uppercase tracking-wider mb-0.5">Reviewer Feedback</p>
                        <p className="text-stone-600 dark:text-zinc-400">{event.reviewNotes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: ACCOUNT SETTINGS */}
        {activeTab === "settings" && (
          <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/5 rounded-xl p-5 shadow-sm max-w-lg">
            <h2 className="text-sm font-bold text-stone-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#be123c]" /> Account Settings
            </h2>
            <p className="text-xs text-stone-500 dark:text-zinc-400 mb-5">Manage your Viam profile.</p>

            <form onSubmit={handleUpdateSettings} className="space-y-4">
              {/* Profile Picture Upload */}
              <div className="border-b border-stone-100 dark:border-white/5 pb-5 mb-4">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-zinc-500 mb-2">Profile Photo</label>
                <div className="flex items-center gap-4">
                  {userProfile?.avatarUrl ? (
                    <img 
                      src={userProfile.avatarUrl} 
                      alt="Avatar Preview" 
                      className="w-16 h-16 rounded-xl object-cover border border-stone-200 dark:border-white/5 shadow-sm" 
                    />
                  ) : (
                    <div className="w-16 h-16 bg-[#FAF9F6] dark:bg-zinc-950 border border-stone-200 dark:border-white/5 rounded-xl flex items-center justify-center text-stone-450 dark:text-zinc-500">
                      <User className="w-8 h-8" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <label className="bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 text-stone-800 dark:text-zinc-200 border border-stone-200 dark:border-white/5 font-semibold text-xs py-2 px-4 rounded-xl cursor-pointer transition-colors shadow-sm">
                        Choose Photo
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleAvatarUpload} 
                          disabled={uploadingAvatar}
                        />
                      </label>
                      {userProfile?.avatarUrl && (
                        <button 
                          type="button" 
                          onClick={handleAvatarDelete}
                          disabled={uploadingAvatar}
                          className="bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 text-red-650 dark:text-red-400 border border-red-200/50 dark:border-red-900/30 font-semibold text-xs py-2 px-4 rounded-xl transition-colors shadow-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {uploadingAvatar && (
                      <p className="text-[10px] text-stone-500 dark:text-zinc-500 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 text-[#be123c] animate-spin" /> Uploading image…
                      </p>
                    )}
                    <p className="text-[10px] text-stone-400 dark:text-zinc-550 leading-relaxed">
                      JPEG, PNG, or WEBP up to 4MB.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-zinc-500 mb-1.5">Display Name</label>
                <input type="text" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your display name" className="w-full bg-[#FAF9F6] dark:bg-zinc-950 border border-stone-200 dark:border-white/5 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#be123c] text-stone-900 dark:text-white" />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-zinc-500 mb-1.5">Email</label>
                <div className="flex items-center gap-2 bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-white/5 rounded-lg px-3 py-2.5 text-sm text-stone-500 dark:text-zinc-400">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span className="truncate">{userProfile?.email || "—"}</span>
                  <Lock className="w-3 h-3 shrink-0 opacity-50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-zinc-500 mb-1.5">Home City</label>
                  <input type="text" value={homeCity} onChange={(e) => setHomeCity(e.target.value)} placeholder="e.g. San Francisco" className="w-full bg-[#FAF9F6] dark:bg-zinc-950 border border-stone-200 dark:border-white/5 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#be123c] text-stone-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-zinc-500 mb-1.5">Home State</label>
                  <input type="text" maxLength={2} value={homeState} onChange={(e) => setHomeState(e.target.value)} placeholder="e.g. CA" className="w-full bg-[#FAF9F6] dark:bg-zinc-950 border border-stone-200 dark:border-white/5 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#be123c] text-stone-900 dark:text-white uppercase" />
                </div>
              </div>

              {/* Read-only info */}
              <div className="grid grid-cols-2 gap-3 border-t border-stone-100 dark:border-white/5 pt-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-zinc-500 mb-1.5">Role</label>
                  <p className="text-sm font-semibold text-stone-700 dark:text-zinc-300 capitalize">{userProfile?.role?.replace("_", " ") || "User"}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-zinc-500 mb-1.5">Auth Method</label>
                  <p className="text-sm text-stone-500 dark:text-zinc-400">Magic Link</p>
                </div>
              </div>

              {settingsFeedback.msg && (
                <p className={`text-xs font-medium flex items-center gap-1.5 ${settingsFeedback.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
                  {settingsFeedback.type === "success" ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  {settingsFeedback.msg}
                </p>
              )}

              <button type="submit" disabled={updatingSettings} className="w-full bg-[#be123c] hover:bg-rose-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                {updatingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Profile"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
