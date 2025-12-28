"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import { API_ENDPOINTS, getImageUrl } from "@/config/api";

export default function AdminPanel() {
  const [uploads, setUploads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("uploads"); // "uploads" or "photographers"
  const [photographers, setPhotographers] = useState([]);
  const [isLoadingPhotographers, setIsLoadingPhotographers] = useState(false);
  const [showPhotographerModal, setShowPhotographerModal] = useState(false);
  const [editingPhotographer, setEditingPhotographer] = useState(null);
  const [photographerForm, setPhotographerForm] = useState({
    username: "",
    password: "",
    isActive: true,
  });
  const intervalRef = useRef(null);
  const isFetchingRef = useRef(false);

  // Calculate counts for each filter
  const filterCounts = useMemo(() => {
    return {
      all: uploads.length,
      pending: uploads.filter((u) => u.status.toLowerCase() === "pending")
        .length,
      approved: uploads.filter((u) => u.status.toLowerCase() === "approved")
        .length,
      scheduled: uploads.filter((u) => u.status.toLowerCase() === "scheduled")
        .length,
      rejected: uploads.filter((u) => u.status.toLowerCase() === "rejected")
        .length,
    };
  }, [uploads]);

  // Fetch uploads - memoized to prevent unnecessary re-renders
  const fetchUploads = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    try {
      const response = await fetch(API_ENDPOINTS.UPLOADS);
      if (response.ok) {
        const data = await response.json();
        setUploads(data);
      }
    } catch (error) {
      console.error("Error fetching uploads:", error);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchUploads();
    // Poll for updates every 5 seconds
    intervalRef.current = setInterval(fetchUploads, 20000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchUploads]);

  // Fetch photographers
  const fetchPhotographers = useCallback(async () => {
    setIsLoadingPhotographers(true);
    try {
      const response = await fetch(API_ENDPOINTS.USERS);
      if (response.ok) {
        const data = await response.json();
        setPhotographers(data);
      }
    } catch (error) {
      console.error("Error fetching photographers:", error);
    } finally {
      setIsLoadingPhotographers(false);
    }
  }, []);

  useEffect(() => {
    if (view === "photographers") {
      fetchPhotographers();
    }
  }, [view, fetchPhotographers]);

  // Handle photographer form submission
  const handlePhotographerSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = editingPhotographer
        ? API_ENDPOINTS.USER_BY_ID(editingPhotographer.id)
        : API_ENDPOINTS.USERS;
      const method = editingPhotographer ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(photographerForm),
      });

      if (response.ok) {
        setShowPhotographerModal(false);
        setEditingPhotographer(null);
        setPhotographerForm({ username: "", password: "", isActive: true });
        fetchPhotographers();
      }
    } catch (error) {
      console.error("Error saving photographer:", error);
    }
  };

  // Delete photographer
  const handleDeletePhotographer = async (id) => {
    if (!confirm("Are you sure you want to delete this photographer?")) {
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.USER_BY_ID(id), {
        method: "DELETE",
      });

      if (response.ok) {
        fetchPhotographers();
      }
    } catch (error) {
      console.error("Error deleting photographer:", error);
    }
  };

  // Toggle photographer active status
  const handleToggleActive = async (photographer) => {
    try {
      const response = await fetch(API_ENDPOINTS.USER_BY_ID(photographer.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !photographer.isActive }),
      });

      if (response.ok) {
        fetchPhotographers();
      }
    } catch (error) {
      console.error("Error toggling active status:", error);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action) => {
    if (selectedItems.size === 0) return;

    try {
      const response = await fetch(API_ENDPOINTS.BULK_UPLOADS, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedItems),
          action: action,
        }),
      });

      if (response.ok) {
        setSelectedItems(new Set());
        fetchUploads();
      }
    } catch (error) {
      console.error("Bulk action error:", error);
    }
  };

  // Handle single item action
  const handleItemAction = async (id, action) => {
    try {
      const response = await fetch(API_ENDPOINTS.UPLOAD_BY_ID(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        fetchUploads();
      }
    } catch (error) {
      console.error("Action error:", error);
    }
  };

  // Filter uploads
  const filteredUploads =
    filter === "all"
      ? uploads
      : uploads.filter((upload) => upload.status.toLowerCase() === filter);

  // Status badge component
  const StatusBadge = ({ status }) => {
    const colors = {
      pending: "bg-amber-500/20 text-amber-300 border-amber-500/50",
      approved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50",
      scheduled: "bg-blue-500/20 text-blue-300 border-blue-500/50",
      rejected: "bg-rose-500/20 text-rose-300 border-rose-500/50",
    };

    return (
      <span
        className={`px-3 py-1 text-xs font-semibold rounded-full border ${
          colors[status.toLowerCase()] || colors.pending
        }`}
      >
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      {/* Header */}
      <div className="bg-black/40 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight truncate">
                Admin Panel
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-0.5 sm:mt-1">
                Manage content and approvals
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-white/60 text-xs sm:text-sm">Total Uploads</div>
              <div className="text-xl sm:text-2xl font-bold text-white">
                {uploads.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {/* View Toggle */}
        <div className="mb-4 sm:mb-6 flex gap-3">
          <button
            onClick={() => setView("uploads")}
            className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
              view === "uploads"
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
            }`}
          >
            Uploads
          </button>
          <button
            onClick={() => setView("photographers")}
            className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
              view === "photographers"
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
            }`}
          >
            Photographers
          </button>
        </div>

        {/* Uploads View */}
        {view === "uploads" && (
          <>
            {/* Filters and Bulk Actions */}
            <div className="bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 md:mb-8 border border-white/10 shadow-2xl">
              <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start lg:items-center justify-between">
                {/* Filter Tabs */}
                <div className="flex flex-wrap gap-2 sm:gap-3 w-full lg:w-auto">
              {[
                { key: "all", label: "All" },
                { key: "pending", label: "Pending" },
                { key: "approved", label: "Approved" },
                { key: "scheduled", label: "Scheduled" },
                { key: "rejected", label: "Rejected" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                    filter === key
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/50 scale-105"
                      : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10"
                  }`}
                >
                  {label}
                  <span
                    className={`ml-1.5 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full text-xs ${
                      filter === key ? "bg-white/20" : "bg-white/10"
                    }`}
                  >
                    {filterCounts[key]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Uploads Grid */}
        {isLoading ? (
          <div className="text-center py-12 sm:py-16 md:py-20">
            <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-white"></div>
            <p className="text-slate-400 mt-3 sm:mt-4 text-sm sm:text-base">Loading uploads...</p>
          </div>
        ) : filteredUploads.length === 0 ? (
          <div className="text-center py-12 sm:py-16 md:py-20 bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/10">
            <svg
              className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="text-slate-400 mt-3 sm:mt-4 text-base sm:text-lg">No uploads found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {filteredUploads.map((upload) => (
              <div
                key={upload.id}
                className="bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 group"
              >
                {/* Status and Date */}
                <div className="p-3 sm:p-4 border-b border-white/10 flex items-center justify-between gap-2">
                  <StatusBadge status={upload.status} />
                  <span className="text-slate-400 text-xs flex-shrink-0">
                    {new Date(upload.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Photo Preview */}
                {upload.photoUrl && (
                  <div className="relative aspect-video bg-black/20 overflow-hidden">
                    <img
                      src={getImageUrl(upload.photoUrl)}
                      alt="Upload"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        // Only log the URL, not the event object to avoid Next.js warnings
                        console.error("Image failed to load:", upload.photoUrl);
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                )}

                {/* Message */}
                {upload.message && (
                  <div className="p-3 sm:p-4 bg-black/20">
                    <p className="text-white text-xs sm:text-sm leading-relaxed line-clamp-3">
                      {upload.message}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="p-3 sm:p-4 border-t border-white/10">
                  {upload.status.toLowerCase() === "pending" && (
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                      <button
                        onClick={() => handleItemAction(upload.id, "approve")}
                        className="px-2 sm:px-3 py-1.5 sm:py-2 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-md sm:rounded-lg text-xs font-semibold transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
                      >
                        <span className="hidden sm:inline">✓ </span>Approve
                      </button>
                      <button
                        onClick={() => handleItemAction(upload.id, "reject")}
                        className="px-2 sm:px-3 py-1.5 sm:py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-md sm:rounded-lg text-xs font-semibold transition-all shadow-lg shadow-rose-500/20 hover:shadow-rose-500/40"
                      >
                        <span className="hidden sm:inline">✗ </span>Reject
                      </button>
                      <button
                        onClick={() => handleItemAction(upload.id, "schedule")}
                        className="px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-md sm:rounded-lg text-xs font-semibold transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
                      >
                        <span className="hidden sm:inline">⏰ </span>Schedule
                      </button>
                    </div>
                  )}
                  {upload.status.toLowerCase() === "scheduled" && (
                    <button
                      onClick={() => handleItemAction(upload.id, "approve")}
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50"
                    >
                      Activate Now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
          </>
        )}

        {/* Photographers View */}
        {view === "photographers" && (
          <div className="space-y-6">
            {/* Header with Add Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">
                Photographers ({photographers.length})
              </h2>
              <button
                onClick={() => {
                  setEditingPhotographer(null);
                  setPhotographerForm({ username: "", password: "", isActive: true });
                  setShowPhotographerModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-indigo-500/50 transition-all"
              >
                + Add Photographer
              </button>
            </div>

            {/* Photographers Grid */}
            {isLoadingPhotographers ? (
              <div className="text-center py-20">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            ) : photographers.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-slate-400">No photographers found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {photographers.map((photographer) => (
                  <div
                    key={photographer._id}
                    className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {photographer.username}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(photographer.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          photographer.isActive
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {photographer.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingPhotographer(photographer);
                          setPhotographerForm({
                            username: photographer.username,
                            password: "",
                            isActive: photographer.isActive,
                          });
                          setShowPhotographerModal(true);
                        }}
                        className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(photographer)}
                        className="flex-1 px-3 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg text-xs font-medium transition-all"
                      >
                        {photographer.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDeletePhotographer(photographer._id)}
                        className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-xs font-medium transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Photographer Modal */}
        {showPhotographerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <div className="bg-gradient-to-br from-slate-900 to-indigo-900 rounded-3xl p-8 max-w-md w-full border border-white/10 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingPhotographer ? "Edit Photographer" : "Add Photographer"}
              </h2>
              <form onSubmit={handlePhotographerSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={photographerForm.username}
                    onChange={(e) =>
                      setPhotographerForm({ ...photographerForm, username: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Password {editingPhotographer && "(leave blank to keep current)"}
                  </label>
                  <input
                    type="password"
                    value={photographerForm.password}
                    onChange={(e) =>
                      setPhotographerForm({ ...photographerForm, password: e.target.value })
                    }
                    required={!editingPhotographer}
                    minLength={8}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={photographerForm.isActive}
                    onChange={(e) =>
                      setPhotographerForm({ ...photographerForm, isActive: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-white/20 bg-white/5"
                  />
                  <label htmlFor="isActive" className="text-white text-sm font-medium">
                    Active
                  </label>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPhotographerModal(false);
                      setEditingPhotographer(null);
                      setPhotographerForm({ username: "", password: "", isActive: true });
                    }}
                    className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all shadow-lg"
                  >
                    {editingPhotographer ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
