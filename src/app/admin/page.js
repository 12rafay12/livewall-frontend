"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { API_ENDPOINTS, getImageUrl } from "@/config/api";

export default function AdminPanel() {
  const router = useRouter();
  const [uploads, setUploads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [filter, setFilter] = useState("all");
  const [displayedFilter, setDisplayedFilter] = useState("all"); // "all", "displayed", "not-displayed"
  const [view, setView] = useState("uploads"); // "uploads" or "photographers"
  const [viewMode, setViewMode] = useState("card"); // "card" or "table"
  const [photographers, setPhotographers] = useState([]);
  const [isLoadingPhotographers, setIsLoadingPhotographers] = useState(false);
  const [showPhotographerModal, setShowPhotographerModal] = useState(false);
  const [editingPhotographer, setEditingPhotographer] = useState(null);
  const [photographerForm, setPhotographerForm] = useState({
    username: "",
    password: "",
    isActive: true,
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulingUploadId, setSchedulingUploadId] = useState(null);
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const intervalRef = useRef(null);
  const isFetchingRef = useRef(false);

  // Check authentication
  useEffect(() => {
    const adminData = sessionStorage.getItem("admin");
    if (!adminData) {
      router.push("/admin/login");
    }
  }, [router]);

  // Logout function
  const handleLogout = () => {
    sessionStorage.removeItem("admin");
    router.push("/admin/login");
  };

  // Fetch uploads - memoized to prevent unnecessary re-renders
  const fetchUploads = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filter !== "all") {
        params.append("status", filter);
      }

      if (displayedFilter !== "all") {
        params.append("displayed", displayedFilter);
      }

      const response = await fetch(
        `${API_ENDPOINTS.UPLOADS}?${params.toString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setUploads(data.uploads || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 0);
      }
    } catch (error) {
      console.error("Error fetching uploads:", error);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [page, limit, filter, displayedFilter]);

  useEffect(() => {
    fetchUploads();
    // Poll for updates every 20 seconds
    intervalRef.current = setInterval(fetchUploads, 20000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchUploads]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filter, displayedFilter]);

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
        ? API_ENDPOINTS.USER_BY_ID(editingPhotographer._id)
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
      const response = await fetch(API_ENDPOINTS.USER_BY_ID(photographer._id), {
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

  // Handle delete upload
  const handleDeleteUpload = async (id) => {
    if (!confirm("Are you sure you want to delete this upload? This will permanently remove the image from S3 storage.")) {
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.UPLOAD_BY_ID(id), {
        method: "DELETE",
      });

      if (response.ok) {
        fetchUploads();
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  // Open schedule modal
  const handleOpenScheduleModal = (id) => {
    setSchedulingUploadId(id);
    // Set default to current date/time
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setScheduledDateTime(now.toISOString().slice(0, 16));
    setShowScheduleModal(true);
  };

  // Handle schedule submission
  const handleScheduleSubmit = async () => {
    if (!scheduledDateTime) {
      alert("Please select a date and time");
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.UPLOAD_BY_ID(schedulingUploadId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule",
          scheduledFor: new Date(scheduledDateTime).toISOString()
        }),
      });

      if (response.ok) {
        setShowScheduleModal(false);
        setSchedulingUploadId(null);
        setScheduledDateTime("");
        fetchUploads();
      }
    } catch (error) {
      console.error("Schedule error:", error);
    }
  };

  // Handle image click to open modal
  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  // Close image modal
  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

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
            <div className="flex items-center gap-4 sm:gap-6 flex-1">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
                  Admin Panel
                </h1>
              </div>
              {/* View Toggle in Navbar */}
              <div className="flex gap-2">
                <button
                  onClick={() => setView("uploads")}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    view === "uploads"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                      : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
                  }`}
                >
                  Uploads
                </button>
                <button
                  onClick={() => setView("photographers")}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    view === "photographers"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                      : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
                  }`}
                >
                  Photographers
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right flex-shrink-0">
                <div className="text-white/60 text-xs sm:text-sm">Total</div>
                <div className="text-xl sm:text-2xl font-bold text-white">
                  {total}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-sm font-semibold transition-all shadow-lg"
                title="Logout"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">

        {/* Uploads View */}
        {view === "uploads" && (
          <>
            {/* Compact Filters */}
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 border border-white/10 flex flex-wrap items-center gap-3">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <label className="text-white text-sm font-medium whitespace-nowrap">Status:</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-indigo-500/50 rounded-lg text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:bg-slate-800 transition-all cursor-pointer"
                  style={{
                    colorScheme: 'dark'
                  }}
                >
                  <option value="all" className="bg-slate-800 text-white py-2 hover:bg-indigo-600">All</option>
                  <option value="pending" className="bg-slate-800 text-white py-2 hover:bg-indigo-600">Pending</option>
                  <option value="approved" className="bg-slate-800 text-white py-2 hover:bg-indigo-600">Approved</option>
                  <option value="scheduled" className="bg-slate-800 text-white py-2 hover:bg-indigo-600">Scheduled</option>
                  <option value="rejected" className="bg-slate-800 text-white py-2 hover:bg-indigo-600">Rejected</option>
                </select>
              </div>

              {/* Displayed Filter */}
              <div className="flex items-center gap-2">
                <label className="text-white text-sm font-medium whitespace-nowrap">Displayed:</label>
                <select
                  value={displayedFilter}
                  onChange={(e) => setDisplayedFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-emerald-500/50 rounded-lg text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 hover:bg-slate-800 transition-all cursor-pointer"
                  style={{
                    colorScheme: 'dark'
                  }}
                >
                  <option value="all" className="bg-slate-800 text-white py-2 hover:bg-emerald-600">All</option>
                  <option value="displayed" className="bg-slate-800 text-white py-2 hover:bg-emerald-600">Displayed</option>
                  <option value="not-displayed" className="bg-slate-800 text-white py-2 hover:bg-emerald-600">Not Displayed</option>
                </select>
              </div>

              {/* Spacer */}
              <div className="flex-1"></div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-medium whitespace-nowrap">View:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setViewMode("card")}
                    className={`p-2 rounded-lg transition-all ${
                      viewMode === "card"
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                        : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
                    }`}
                    title="Card View"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`p-2 rounded-lg transition-all ${
                      viewMode === "table"
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                        : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
                    }`}
                    title="Table View"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Uploads Grid */}
            {isLoading ? (
              <div className="text-center py-12 sm:py-16 md:py-20">
                <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-white"></div>
                <p className="text-slate-400 mt-3 sm:mt-4 text-sm sm:text-base">
                  Loading uploads...
                </p>
              </div>
            ) : uploads.length === 0 ? (
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
                <p className="text-slate-400 mt-3 sm:mt-4 text-base sm:text-lg">
                  No uploads found
                </p>
              </div>
            ) : viewMode === "card" ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                  {uploads.map((upload) => (
                    <div
                      key={upload.id}
                      className="bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 group"
                    >
                      {/* Status and Date */}
                      <div className="p-3 sm:p-4 border-b border-white/10 flex items-center justify-between gap-2">
                        <StatusBadge status={upload.status} />
                        <span className="text-slate-400 text-xs flex-shrink-0">
                          {new Date(upload.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>

                      {/* Photo Preview */}
                      {upload.photoUrl && (
                        <div
                          className="relative aspect-video bg-black/20 overflow-hidden cursor-pointer"
                          onClick={() => handleImageClick(upload.photoUrl)}
                        >
                          <img
                            src={getImageUrl(upload.photoUrl)}
                            alt="Upload"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              // Only log the URL, not the event object to avoid Next.js warnings
                              console.error(
                                "Image failed to load:",
                                upload.photoUrl
                              );
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

                      {/* Username and Email */}
                      {(upload.username || upload.email) && (
                        <div className="p-3 sm:p-4 bg-black/10 border-t border-white/5">
                          <div className="space-y-1">
                            {upload.username && (
                              <p className="text-white/80 text-xs sm:text-sm">
                                <span className="text-white/60">Username: </span>
                                {upload.username}
                              </p>
                            )}
                            {upload.email && (
                              <p className="text-white/80 text-xs sm:text-sm">
                                <span className="text-white/60">Email: </span>
                                {upload.email}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="p-3 sm:p-4 border-t border-white/10 space-y-2">
                        {upload.status.toLowerCase() === "pending" && (
                          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                            <button
                              onClick={() =>
                                handleItemAction(upload.id, "approve")
                              }
                              className="px-2 sm:px-3 py-1.5 sm:py-2 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-md sm:rounded-lg text-xs font-semibold transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
                            >
                              <span className="hidden sm:inline">✓ </span>
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                handleItemAction(upload.id, "reject")
                              }
                              className="px-2 sm:px-3 py-1.5 sm:py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-md sm:rounded-lg text-xs font-semibold transition-all shadow-lg shadow-rose-500/20 hover:shadow-rose-500/40"
                            >
                              <span className="hidden sm:inline">✗ </span>Reject
                            </button>
                            <button
                              onClick={() =>
                                handleOpenScheduleModal(upload.id)
                              }
                              className="px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-md sm:rounded-lg text-xs font-semibold transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
                            >
                              <span className="hidden sm:inline">⏰ </span>
                              Schedule
                            </button>
                          </div>
                        )}
                        {upload.status.toLowerCase() === "scheduled" && (
                          <div className="space-y-2">
                            {upload.scheduledFor && (
                              <div className="text-center py-2 px-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
                                <p className="text-blue-300 text-xs font-medium">
                                  Scheduled for:
                                </p>
                                <p className="text-white text-sm font-semibold mt-1">
                                  {new Date(upload.scheduledFor).toLocaleString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            )}
                            <button
                              onClick={() =>
                                handleItemAction(upload.id, "approve")
                              }
                              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50"
                            >
                              Activate Now
                            </button>
                          </div>
                        )}
                        {/* Delete Button - Always visible */}
                        <button
                          onClick={() => handleDeleteUpload(upload.id)}
                          className="w-full px-3 sm:px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-red-500/20 hover:shadow-red-500/40 flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-6 sm:mt-8 flex items-center justify-center gap-2 sm:gap-3">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        page === 1
                          ? "bg-white/5 text-slate-500 cursor-not-allowed"
                          : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                      }`}
                    >
                      Previous
                    </button>

                    <div className="flex items-center gap-1 sm:gap-2">
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (page <= 3) {
                            pageNum = i + 1;
                          } else if (page >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = page - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPage(pageNum)}
                              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                                page === pageNum
                                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                                  : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                      )}
                    </div>

                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        page === totalPages
                          ? "bg-white/5 text-slate-500 cursor-not-allowed"
                          : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                      }`}
                    >
                      Next
                    </button>

                    <span className="ml-2 sm:ml-4 text-slate-400 text-xs sm:text-sm">
                      Page {page} of {totalPages}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Table View */}
                <div className="bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl overflow-hidden border border-white/10">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-black/30 border-b border-white/10">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                            Preview
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                            Message
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                            Displayed
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {uploads.map((upload) => (
                          <tr key={upload.id} className="hover:bg-white/5 transition-colors">
                            {/* Preview */}
                            <td className="px-4 py-3">
                              {upload.photoUrl ? (
                                <div
                                  className="w-16 h-16 rounded-lg overflow-hidden bg-black/20 cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                                  onClick={() => handleImageClick(upload.photoUrl)}
                                >
                                  <img
                                    src={getImageUrl(upload.photoUrl)}
                                    alt="Upload"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-16 h-16 rounded-lg bg-black/20 flex items-center justify-center">
                                  <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </td>

                            {/* Message */}
                            <td className="px-4 py-3">
                              {upload.message ? (
                                <p className="text-white text-sm line-clamp-2 max-w-xs">
                                  {upload.message}
                                </p>
                              ) : (
                                <span className="text-slate-500 text-sm italic">No message</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <StatusBadge status={upload.status} />
                                {upload.status.toLowerCase() === "scheduled" && upload.scheduledFor && (
                                  <span className="text-blue-300 text-xs">
                                    {new Date(upload.scheduledFor).toLocaleString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Displayed */}
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                upload.displayed
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-slate-500/20 text-slate-300"
                              }`}>
                                {upload.displayed ? "Yes" : "No"}
                              </span>
                            </td>

                            {/* Date */}
                            <td className="px-4 py-3">
                              <span className="text-slate-400 text-sm whitespace-nowrap">
                                {new Date(upload.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                {upload.status.toLowerCase() === "pending" && (
                                  <>
                                    <button
                                      onClick={() => handleItemAction(upload.id, "approve")}
                                      className="p-2 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
                                      title="Approve"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleItemAction(upload.id, "reject")}
                                      className="p-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg transition-all shadow-lg shadow-rose-500/20 hover:shadow-rose-500/40"
                                      title="Reject"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleOpenScheduleModal(upload.id)}
                                      className="p-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
                                      title="Schedule"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </button>
                                  </>
                                )}
                                {upload.status.toLowerCase() === "scheduled" && (
                                  <button
                                    onClick={() => handleItemAction(upload.id, "approve")}
                                    className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50"
                                    title="Activate Now"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                  </button>
                                )}
                                {/* Delete Button - Always visible */}
                                <button
                                  onClick={() => handleDeleteUpload(upload.id)}
                                  className="p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-all shadow-lg shadow-red-500/20 hover:shadow-red-500/40"
                                  title="Delete"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-6 sm:mt-8 flex items-center justify-center gap-2 sm:gap-3">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        page === 1
                          ? "bg-white/5 text-slate-500 cursor-not-allowed"
                          : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                      }`}
                    >
                      Previous
                    </button>

                    <div className="flex items-center gap-1 sm:gap-2">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                              page === pageNum
                                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                                : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        page === totalPages
                          ? "bg-white/5 text-slate-500 cursor-not-allowed"
                          : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                      }`}
                    >
                      Next
                    </button>

                    <span className="ml-2 sm:ml-4 text-slate-400 text-xs sm:text-sm">
                      Page {page} of {totalPages}
                    </span>
                  </div>
                )}
              </>
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
                  setPhotographerForm({
                    username: "",
                    password: "",
                    isActive: true,
                  });
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
                          {new Date(
                            photographer.createdAt
                          ).toLocaleDateString()}
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
                        onClick={() =>
                          handleDeletePhotographer(photographer._id)
                        }
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
                      setPhotographerForm({
                        ...photographerForm,
                        username: e.target.value,
                      })
                    }
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Password{" "}
                    {editingPhotographer && "(leave blank to keep current)"}
                  </label>
                  <input
                    type="password"
                    value={photographerForm.password}
                    onChange={(e) =>
                      setPhotographerForm({
                        ...photographerForm,
                        password: e.target.value,
                      })
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
                      setPhotographerForm({
                        ...photographerForm,
                        isActive: e.target.checked,
                      })
                    }
                    className="w-5 h-5 rounded border-white/20 bg-white/5"
                  />
                  <label
                    htmlFor="isActive"
                    className="text-white text-sm font-medium"
                  >
                    Active
                  </label>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPhotographerModal(false);
                      setEditingPhotographer(null);
                      setPhotographerForm({
                        username: "",
                        password: "",
                        isActive: true,
                      });
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

        {/* Image Modal */}
        {showImageModal && selectedImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
            onClick={closeImageModal}
          >
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-10"
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div
              className="relative max-w-7xl max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={getImageUrl(selectedImage)}
                alt="Full size"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Schedule Modal */}
        {showScheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-slate-900 to-indigo-900 rounded-3xl p-8 max-w-md w-full border border-white/10 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">Schedule Upload</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Select Date and Time
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-slate-400 text-xs mt-2">
                    The upload will be automatically activated at the selected time
                  </p>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowScheduleModal(false);
                      setSchedulingUploadId(null);
                      setScheduledDateTime("");
                    }}
                    className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleScheduleSubmit}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg"
                  >
                    Schedule
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
