"use client";

import React, { useEffect, useState } from "react";
import { UserProfile, UserRole } from "@/types/user";
import { getAllUsers, updateUserRole } from "@/lib/firestore/users";
import { X, Search, Shield, User, ShieldCheck, Mail, Phone, MapPin, Loader2, Check } from "lucide-react";

interface UserManagementPanelProps {
  onClose: () => void;
}

export function UserManagementPanel({ onClose }: UserManagementPanelProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (uid: string, newRole: UserRole, region?: string) => {
    setUpdatingUid(uid);
    try {
      await updateUserRole(uid, newRole, region || "");
      setSuccessMsg("User role updated successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
      await loadUsers(); // Refresh list
    } catch (error) {
      console.error("Failed to update role:", error);
    } finally {
      setUpdatingUid(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-zinc-950/70 backdrop-blur-md">
      <div className="relative w-full max-w-4xl h-[85vh] overflow-hidden rounded-3xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl backdrop-blur-2xl p-6 md:p-8 flex flex-col gap-6 animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-455 border border-rose-100 dark:border-rose-900/35">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-stone-950 dark:text-white">User Management Portal</h2>
              <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
                Manage user access, promote regional administrators, and assign jurisdiction scopes.
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
          <div className="relative w-full sm:max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Search className="w-4 h-4 text-stone-400 dark:text-zinc-550" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-250 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/30 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-zinc-650 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-sm"
            />
          </div>

          {successMsg && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/35 text-xs font-bold animate-pulse">
              <Check className="w-3.5 h-3.5" />
              {successMsg}
            </div>
          )}
        </div>

        {/* User List Table */}
        <div className="flex-1 overflow-y-auto border border-stone-200 dark:border-white/5 rounded-2xl bg-stone-50/50 dark:bg-zinc-950/20 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-stone-400 dark:text-zinc-555 gap-3">
              <Loader2 className="w-8 h-8 text-rose-600 dark:text-rose-455 animate-spin" />
              <span className="text-xs font-semibold uppercase tracking-wider">Loading user database...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-stone-400 dark:text-zinc-555 gap-2">
              <User className="w-10 h-10 opacity-40" />
              <span className="text-xs font-semibold">No profiles found matching search criteria.</span>
            </div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-stone-200 dark:border-white/5 bg-stone-100/50 dark:bg-zinc-900/50 text-[10px] font-bold text-stone-500 dark:text-zinc-500 uppercase tracking-wider">
                  <th className="px-5 py-3">User Details</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Jurisdiction Scope</th>
                  <th className="px-5 py-3 text-right">Access Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-150 dark:divide-white/5 text-xs font-semibold text-stone-850 dark:text-zinc-300">
                {filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-stone-100/30 dark:hover:bg-zinc-900/30 transition-colors">
                    {/* Details */}
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-sm text-stone-950 dark:text-white leading-tight">
                          {user.displayName || "Anonymous User"}
                        </span>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-stone-500 dark:text-zinc-500 font-medium">
                          {user.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5 shrink-0" /> {user.email}
                            </span>
                          )}
                          {user.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 shrink-0" /> {user.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          user.role === "master_admin"
                            ? "bg-rose-50 dark:bg-rose-950/45 text-rose-800 dark:text-rose-350 border-rose-200 dark:border-rose-900/25 shadow-sm"
                            : user.role === "local_admin"
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-350 border-amber-250 dark:border-amber-900/30 shadow-sm"
                            : "bg-stone-100 dark:bg-zinc-800/80 text-stone-650 dark:text-zinc-400 border-stone-200 dark:border-white/5"
                        }`}
                      >
                        {user.role === "master_admin"
                          ? "Master Admin"
                          : user.role === "local_admin"
                          ? "Local Admin"
                          : "Regular User"}
                      </span>
                    </td>

                    {/* Region */}
                    <td className="px-5 py-4 text-stone-600 dark:text-zinc-450 font-medium">
                      {user.role === "local_admin" ? (
                        <span className="flex items-center gap-1 text-amber-700 dark:text-amber-350">
                          <MapPin className="w-3.5 h-3.5 shrink-0" /> State: {user.region || "CA"}
                        </span>
                      ) : user.role === "master_admin" ? (
                        <span className="flex items-center gap-1 text-rose-750 dark:text-rose-400">
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Global Scope
                        </span>
                      ) : (
                        <span className="text-stone-400 dark:text-zinc-600">None</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      {updatingUid === user.uid ? (
                        <div className="inline-flex items-center gap-1.5 py-1.5 px-3 text-stone-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating...
                        </div>
                      ) : user.role === "master_admin" ? (
                        <span className="text-[10px] text-stone-400 dark:text-zinc-650 uppercase font-bold tracking-wider">
                          Locked (Owner)
                        </span>
                      ) : (
                        <div className="inline-flex gap-2">
                          {user.role === "user" ? (
                            <button
                              onClick={() => {
                                const state = prompt("Enter state code for this Local Admin (e.g. CA, NY, TX):", "CA");
                                if (state) {
                                  handleRoleChange(user.uid, "local_admin", state.toUpperCase());
                                }
                              }}
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-900/20 text-[10px] font-bold rounded-lg transition-all"
                            >
                              Promote to Admin
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (confirm(`Demote ${user.displayName || "this user"} to a regular user?`)) {
                                  handleRoleChange(user.uid, "user");
                                }
                              }}
                              className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-stone-750 dark:text-zinc-350 border border-stone-200 dark:border-white/5 text-[10px] font-bold rounded-lg transition-all"
                            >
                              Demote to User
                            </button>
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
      </div>
    </div>
  );
}
