"use client";

import { useState } from "react";
import { API_ENDPOINTS } from "@/config/api";

export default function AdminCreator() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    secretKey: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    setErrorMessage("");

    try {
      const response = await fetch(`${API_ENDPOINTS.USERS}/admin/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": formData.secretKey,
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      });

      if (response.ok) {
        setSubmitStatus("success");
        setFormData({ username: "", password: "", secretKey: "" });
        setTimeout(() => {
          setShowModal(false);
          setSubmitStatus(null);
        }, 2000);
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.message || "Failed to create admin user");
        setSubmitStatus("error");
      }
    } catch (error) {
      console.error("Admin creation error:", error);
      setErrorMessage("Network error. Please try again.");
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-purple-500/50 transition-all"
      >
        + Create Admin User
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-3xl p-8 max-w-md w-full border border-white/10 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">
              Create Admin User
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter admin username"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  minLength={8}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Minimum 8 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Admin Secret Key
                </label>
                <input
                  type="password"
                  value={formData.secretKey}
                  onChange={(e) =>
                    setFormData({ ...formData, secretKey: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter admin creation secret"
                />
                <p className="text-slate-400 text-xs mt-2">
                  Required secret key from server environment
                </p>
              </div>

              {/* Success/Error Messages */}
              {submitStatus === "success" && (
                <div className="p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-xl">
                  <p className="text-emerald-200 text-sm font-medium">
                    Admin user created successfully!
                  </p>
                </div>
              )}

              {submitStatus === "error" && (
                <div className="p-4 bg-rose-500/20 border border-rose-500/50 rounded-xl">
                  <p className="text-rose-200 text-sm font-medium">
                    {errorMessage}
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({ username: "", password: "", secretKey: "" });
                    setSubmitStatus(null);
                    setErrorMessage("");
                  }}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Creating..." : "Create Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
