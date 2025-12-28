"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS, getImageUrl } from "@/config/api";

export default function PhotographerBatchUpload() {
  const router = useRouter();
  const [photographer, setPhotographer] = useState(null);
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Check session on load
  useEffect(() => {
    const photographerData = sessionStorage.getItem("photographer");
    if (!photographerData) {
      router.push("/photographer/login");
    } else {
      setPhotographer(JSON.parse(photographerData));
    }
  }, [router]);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    const imageFiles = selectedFiles.filter((file) =>
      file.type.match(/^image\/(jpg|jpeg|png|gif|webp)$/)
    );
    setFiles((prev) => [...prev, ...imageFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    const imageFiles = droppedFiles.filter((file) =>
      file.type.match(/^image\/(jpg|jpeg|png|gif|webp)$/)
    );
    setFiles((prev) => [...prev, ...imageFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLogout = () => {
    sessionStorage.removeItem("photographer");
    router.push("/photographer/login");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (files.length === 0) {
      setUploadStatus("error");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus(null);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("photos", file);
      });
      if (message.trim()) {
        formData.append("message", message.trim());
      }
      formData.append("uploadedBy", photographer.id);

      const response = await fetch(API_ENDPOINTS.BATCH_UPLOADS, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setUploadStatus("success");
        setFiles([]);
        setMessage("");
        setUploadProgress(100);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        setUploadStatus("error");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("error");
    } finally {
      setIsUploading(false);
    }
  };

  if (!photographer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      {/* Header */}
      <div className="bg-black/40 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Batch Upload
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Welcome, {photographer.username}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition-all border border-white/20"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Drop Zone */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                Images (JPG, PNG, GIF, WebP)
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative border-2 border-dashed rounded-2xl transition-all ${
                  isDragging
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-white/20 bg-white/5"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-input"
                />
                <label
                  htmlFor="file-input"
                  className="block p-12 text-center cursor-pointer"
                >
                  <svg
                    className="w-16 h-16 mx-auto text-indigo-400 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-white font-semibold mb-2">
                    Click to browse or drag and drop images here
                  </p>
                  <p className="text-slate-400 text-sm">
                    Select multiple images (max 10MB each)
                  </p>
                </label>
              </div>
            </div>

            {/* Preview Grid */}
            {files.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">
                  Selected Images ({files.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="relative group aspect-square rounded-xl overflow-hidden bg-black/20 border border-white/10"
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 w-8 h-8 bg-rose-500 hover:bg-rose-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p className="text-white text-xs truncate">
                          {file.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message Input */}
            <div>
              <label
                htmlFor="message"
                className="block text-sm font-semibold text-white mb-3"
              >
                Message{" "}
                <span className="text-slate-400 font-normal">(Optional - applies to all images)</span>
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a message for all uploads..."
                rows={4}
                maxLength={500}
                className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-2xl text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all"
              />
              <div className="text-right text-xs text-slate-500 mt-2">
                {message.length}/500
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isUploading || files.length === 0}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 px-6 rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 disabled:shadow-none text-lg"
            >
              {isUploading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Uploading {files.length} images...
                </span>
              ) : (
                `Upload ${files.length} ${files.length === 1 ? "Image" : "Images"}`
              )}
            </button>
          </form>

          {/* Status Messages */}
          {uploadStatus === "success" && (
            <div className="mt-6 p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-2xl">
              <div className="flex items-center gap-3">
                <svg
                  className="w-6 h-6 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-emerald-200 text-sm font-medium">
                  Upload successful! All images are pending approval.
                </p>
              </div>
            </div>
          )}

          {uploadStatus === "error" && (
            <div className="mt-6 p-4 bg-rose-500/20 border border-rose-500/50 rounded-2xl">
              <div className="flex items-center gap-3">
                <svg
                  className="w-6 h-6 text-rose-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                <p className="text-rose-200 text-sm font-medium">
                  Upload failed. Please try again.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
