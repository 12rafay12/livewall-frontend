"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { API_ENDPOINTS, getImageUrl } from "@/config/api";

export default function AdminPanel() {
  const [uploads, setUploads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [filter, setFilter] = useState("all");

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

  // Fetch uploads
  const fetchUploads = async () => {
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
    }
  };

  useEffect(() => {
    fetchUploads();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchUploads, 5000);
    return () => clearInterval(interval);
  }, []);

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
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Admin Panel
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Manage content and approvals
              </p>
            </div>
            <div className="text-right">
              <div className="text-white/60 text-sm">Total Uploads</div>
              <div className="text-2xl font-bold text-white">
                {uploads.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters and Bulk Actions */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 mb-8 border border-white/10 shadow-2xl">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-3">
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
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    filter === key
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/50 scale-105"
                      : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10"
                  }`}
                >
                  {label}
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
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
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="text-slate-400 mt-4">Loading uploads...</p>
          </div>
        ) : filteredUploads.length === 0 ? (
          <div className="text-center py-20 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
            <svg
              className="mx-auto h-16 w-16 text-slate-500"
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
            <p className="text-slate-400 mt-4 text-lg">No uploads found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredUploads.map((upload) => (
              <div
                key={upload.id}
                className="bg-white/5 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 group"
              >
                {/* Status and Date */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <StatusBadge status={upload.status} />
                  <span className="text-slate-400 text-xs">
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
                    />
                  </div>
                )}

                {/* Message */}
                {upload.message && (
                  <div className="p-4 bg-black/20">
                    <p className="text-white text-sm leading-relaxed line-clamp-3">
                      {upload.message}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="p-4 border-t border-white/10">
                  {upload.status.toLowerCase() === "pending" && (
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleItemAction(upload.id, "approve")}
                        className="px-3 py-2 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleItemAction(upload.id, "reject")}
                        className="px-3 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold transition-all shadow-lg shadow-rose-500/20 hover:shadow-rose-500/40"
                      >
                        ✗ Reject
                      </button>
                      <button
                        onClick={() => handleItemAction(upload.id, "schedule")}
                        className="px-3 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
                      >
                        ⏰ Schedule
                      </button>
                    </div>
                  )}
                  {upload.status.toLowerCase() === "scheduled" && (
                    <button
                      onClick={() => handleItemAction(upload.id, "approve")}
                      className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50"
                    >
                      Activate Now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
