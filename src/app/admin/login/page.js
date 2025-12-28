"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS } from "@/config/api";

export default function AdminLogin() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // "login" or "create"

  // Login form
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Create admin form
  const [createUsername, setCreateUsername] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [secretKey, setSecretKey] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.USER_LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });

      if (response.ok) {
        const userData = await response.json();

        // Check if user is admin
        if (userData.role !== "admin") {
          setError("Access denied. Admin privileges required.");
          setIsLoading(false);
          return;
        }

        // Store in sessionStorage
        sessionStorage.setItem("admin", JSON.stringify(userData));
        // Redirect to admin panel
        router.push("/admin");
      } else {
        const data = await response.json();
        setError(data.message || "Login failed. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Unable to connect to server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_ENDPOINTS.USERS}/admin/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secretKey,
        },
        body: JSON.stringify({
          username: createUsername,
          password: createPassword,
        }),
      });

      if (response.ok) {
        setSuccess("Admin user created successfully! You can now login.");
        setCreateUsername("");
        setCreatePassword("");
        setSecretKey("");
        // Switch to login mode after 2 seconds
        setTimeout(() => {
          setMode("login");
          setSuccess("");
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.message || "Failed to create admin user.");
      }
    } catch (err) {
      console.error("Create admin error:", err);
      setError("Unable to connect to server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Admin Access
          </h1>
          <p className="text-slate-400 text-sm">
            Manage LiveWall system
          </p>
        </div>

        {/* Toggle Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              setMode("login");
              setError("");
              setSuccess("");
            }}
            className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
              mode === "login"
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => {
              setMode("create");
              setError("");
              setSuccess("");
            }}
            className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
              mode === "create"
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
            }`}
          >
            Create Admin
          </button>
        </div>

        {/* Form Container */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10">
          {/* Login Form */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Username Input */}
              <div>
                <label
                  htmlFor="login-username"
                  className="block text-sm font-semibold text-white mb-3"
                >
                  Username
                </label>
                <input
                  id="login-username"
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required
                  className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-2xl text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Enter admin username"
                />
              </div>

              {/* Password Input */}
              <div>
                <label
                  htmlFor="login-password"
                  className="block text-sm font-semibold text-white mb-3"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-2xl text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all pr-12"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-rose-500/20 border border-rose-500/50 rounded-2xl">
                  <p className="text-rose-200 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 px-6 rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 disabled:shadow-none text-lg"
              >
                {isLoading ? "Logging in..." : "Login"}
              </button>
            </form>
          )}

          {/* Create Admin Form */}
          {mode === "create" && (
            <form onSubmit={handleCreateAdmin} className="space-y-6">
              {/* Username Input */}
              <div>
                <label
                  htmlFor="create-username"
                  className="block text-sm font-semibold text-white mb-3"
                >
                  Username
                </label>
                <input
                  id="create-username"
                  type="text"
                  value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value)}
                  required
                  className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-2xl text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Choose admin username"
                />
              </div>

              {/* Password Input */}
              <div>
                <label
                  htmlFor="create-password"
                  className="block text-sm font-semibold text-white mb-3"
                >
                  Password
                </label>
                <input
                  id="create-password"
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-2xl text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Minimum 8 characters"
                />
              </div>

              {/* Secret Key Input */}
              <div>
                <label
                  htmlFor="secret-key"
                  className="block text-sm font-semibold text-white mb-3"
                >
                  Admin Secret Key
                </label>
                <input
                  id="secret-key"
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  required
                  className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-2xl text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Enter server secret key"
                />
                <p className="text-slate-400 text-xs mt-2">
                  Required secret key from server environment (ADMIN_CREATE_SECRET)
                </p>
              </div>

              {/* Success Message */}
              {success && (
                <div className="p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-2xl">
                  <p className="text-emerald-200 text-sm">{success}</p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-rose-500/20 border border-rose-500/50 rounded-2xl">
                  <p className="text-rose-200 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 px-6 rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 disabled:shadow-none text-lg"
              >
                {isLoading ? "Creating..." : "Create Admin User"}
              </button>
            </form>
          )}

          {/* Back Link */}
          <div className="mt-6 text-center">
            <a
              href="/"
              className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors hover:underline"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
