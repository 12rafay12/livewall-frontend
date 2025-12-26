"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { API_ENDPOINTS } from "@/config/api";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setCapturedImage(null);
    }
  };

  // Open camera
  const openCamera = async () => {
    // Reset error state
    setCameraError(null);
    setIsLoadingCamera(true);

    // Show modal first
    setIsCameraOpen(true);

    // Wait a bit for the modal to render
    await new Promise((resolve) => setTimeout(resolve, 200));

    try {
      // Check if we're on HTTPS or localhost (required for camera on mobile)
      const isSecureContext =
        window.isSecureContext ||
        location.protocol === "https:" ||
        location.hostname === "localhost" ||
        location.hostname === "127.0.0.1";

      if (!isSecureContext) {
        throw new Error("HTTPS_REQUIRED");
      }

      // Check if getUserMedia is available (check both modern and legacy APIs)
      const getUserMedia =
        navigator.mediaDevices?.getUserMedia ||
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

      if (!getUserMedia) {
        throw new Error(
          "Camera API not supported. Please use a modern browser like Chrome, Firefox, Safari, or Edge."
        );
      }

      // Detect if mobile device
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );

      // Try with user camera first (front camera - works on laptops and mobile)
      // Then try environment (back camera) on mobile if user camera fails
      let stream;
      try {
        // Start with front camera (user) - works on both laptop and mobile
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user", // Front camera
          },
          audio: false,
        });
      } catch (userError) {
        // On mobile, try back camera if front camera fails
        if (isMobile) {
          console.log("Front camera failed, trying back camera:", userError);
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: "environment", // Back camera on mobile
              },
              audio: false,
            });
          } catch (envError) {
            // Last fallback: no facingMode constraint
            console.log("Back camera failed, trying default:", envError);
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          }
        } else {
          // On laptop/desktop, just try default camera
          console.log("Front camera failed, trying default:", userError);
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      streamRef.current = stream;
      setIsLoadingCamera(false);

      // Wait a bit more to ensure video element is ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait for video to be ready and play
        const playVideo = () => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            videoRef.current
              .play()
              .then(() => {
                console.log("Video playing successfully");
              })
              .catch((err) => {
                console.error("Error playing video:", err);
                setCameraError("Camera accessed but video failed to play");
              });
          } else {
            // Retry after a short delay
            setTimeout(playVideo, 100);
          }
        };

        videoRef.current.onloadedmetadata = () => {
          playVideo();
        };

        // Also try to play immediately if metadata is already loaded
        if (videoRef.current.readyState >= 2) {
          playVideo();
        }
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setIsLoadingCamera(false);

      let errorMessage = "Unable to access camera.";

      // Check for HTTPS requirement first
      if (error.message === "HTTPS_REQUIRED") {
        const isMobile =
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          );

        if (isMobile) {
          errorMessage =
            "HTTPS is required to access the camera. Please use a secure connection.";
        }
      } else if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        errorMessage =
          "Camera permission denied. Please allow camera access in your browser settings and try again.";
      } else if (
        error.name === "NotFoundError" ||
        error.name === "DevicesNotFoundError"
      ) {
        errorMessage =
          "No camera found. Please connect a camera and try again.";
      } else if (
        error.name === "NotReadableError" ||
        error.name === "TrackStartError"
      ) {
        errorMessage =
          "Camera is already in use by another application. Please close other apps using the camera.";
      } else if (
        error.name === "OverconstrainedError" ||
        error.name === "ConstraintNotSatisfiedError"
      ) {
        errorMessage =
          "Camera constraints not satisfied. Trying with default settings...";
        // Retry with minimal constraints
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          streamRef.current = stream;
          setIsLoadingCamera(false);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(console.error);
          }
          return;
        } catch (retryError) {
          errorMessage =
            "Unable to access camera. Please check your browser permissions.";
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      setCameraError(errorMessage);
    }
  };

  // Close camera and stop stream
  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.pause();
    }
    setIsCameraOpen(false);
    setCapturedImage(null);
    setCameraError(null);
    setIsLoadingCamera(false);
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0);

      // Convert canvas to blob, then to File
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const capturedFile = new File(
              [blob],
              `camera-capture-${Date.now()}.jpg`,
              {
                type: "image/jpeg",
              }
            );
            setFile(capturedFile);
            setCapturedImage(canvas.toDataURL("image/jpeg"));
            closeCamera();
          }
        },
        "image/jpeg",
        0.9
      );
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file && !message.trim()) {
      alert("Please upload a photo or enter a message");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const formData = new FormData();
      if (file) {
        formData.append("photo", file);
      }
      if (message.trim()) {
        formData.append("message", message.trim());
      }

      const response = await fetch(API_ENDPOINTS.UPLOADS, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setSubmitStatus("success");
        setFile(null);
        setCapturedImage(null);
        setMessage("");
        const fileInput = document.getElementById("photo-input");
        if (fileInput) fileInput.value = "";
      } else {
        setSubmitStatus("error");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center p-3 sm:p-4 md:p-6 py-6 sm:py-8">
      <div className="w-full max-w-lg">
        {/* QR Code at top */}
        <div className="mb-4 sm:mb-6 md:mb-8 flex justify-center">
          <div className="bg-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 border border-white/20 shadow-2xl">
            <Image
              src="/Landscape screen qr code.png"
              alt="QR Code"
              width={180}
              height={180}
              className="w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 object-contain"
              priority
            />
            <p className="text-center text-white/70 text-xs sm:text-sm mt-2 sm:mt-3 font-medium">
              Scan to share your moment
            </p>
          </div>
        </div>

        {/* Upload Form */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl border border-white/10">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Share Your Moment
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              Upload a photo, write a message, or both
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* File Input */}
            <div>
              <label
                htmlFor="photo-input"
                className="block text-xs sm:text-sm font-semibold text-white mb-2 sm:mb-3"
              >
                Photo{" "}
                <span className="text-slate-400 font-normal">(Optional)</span>
              </label>

              {/* Camera Preview Modal */}
              {isCameraOpen && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-2 sm:p-4">
                  <div className="w-full max-w-md h-full sm:h-auto flex items-center justify-center">
                    <div className="relative bg-black rounded-xl sm:rounded-2xl overflow-hidden w-full h-full sm:h-auto flex flex-col">
                      {/* Video Preview */}
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full sm:h-auto object-cover sm:object-contain"
                        style={{ maxHeight: "calc(100vh - 120px)" }}
                      />
                      <canvas ref={canvasRef} className="hidden" />

                      {/* Loading indicator */}
                      {isLoadingCamera && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                          <div className="text-center">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                            <p className="text-white text-sm">
                              Accessing camera...
                            </p>
                            <p className="text-white/70 text-xs mt-2">
                              Please allow camera access when prompted
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Error message */}
                      {cameraError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10 p-4 overflow-y-auto">
                          <div className="text-center max-w-md">
                            <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                              <svg
                                className="w-8 h-8 text-rose-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                              </svg>
                            </div>
                            <p className="text-white text-sm font-medium mb-2 whitespace-pre-line">
                              {cameraError}
                            </p>
                            <button
                              type="button"
                              onClick={closeCamera}
                              className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-sm font-semibold transition-all"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Camera Controls - Only show when camera is ready */}
                      {streamRef.current &&
                        !isLoadingCamera &&
                        !cameraError && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 sm:p-6">
                            <div className="flex items-center justify-center gap-3 sm:gap-4">
                              <button
                                type="button"
                                onClick={closeCamera}
                                className="px-4 sm:px-6 py-2 sm:py-3 bg-white/20 hover:bg-white/30 text-white rounded-full text-sm sm:text-base font-semibold transition-all backdrop-blur-sm"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={capturePhoto}
                                disabled={!streamRef.current}
                                className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-full border-4 border-white/30 shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <div className="w-full h-full bg-white rounded-full"></div>
                              </button>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              )}

              {/* File input - always accessible */}
              <input
                id="photo-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="space-y-3">
                {/* Action Buttons */}
                {!file && (
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={openCamera}
                      className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
                    >
                      <svg
                        className="w-4 h-4 sm:w-5 sm:h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span className="hidden xs:inline">Take Photo</span>
                      <span className="xs:hidden">Camera</span>
                    </button>
                    <label
                      htmlFor="photo-input"
                      className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer border border-white/20"
                    >
                      <svg
                        className="w-4 h-4 sm:w-5 sm:h-5"
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
                      <span className="hidden xs:inline">Choose File</span>
                      <span className="xs:hidden">File</span>
                    </label>
                  </div>
                )}

                {/* File Preview */}
                {file && (
                  <div className="relative">
                    <div className="relative w-full h-48 sm:h-56 md:h-64 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-white/20 bg-black/20">
                      {capturedImage ? (
                        <img
                          src={capturedImage}
                          alt="Captured"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-3 mx-auto">
                              <svg
                                className="w-8 h-8 text-emerald-400"
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
                            </div>
                            <span className="text-sm text-white font-medium block">
                              {file.name.length > 30
                                ? file.name.substring(0, 30) + "..."
                                : file.name}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row gap-2">
                      <label
                        htmlFor="photo-input"
                        className="flex-1 px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium text-center cursor-pointer transition-all border border-white/20"
                      >
                        Change Photo
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null);
                          setCapturedImage(null);
                          const fileInput =
                            document.getElementById("photo-input");
                          if (fileInput) fileInput.value = "";
                        }}
                        className="px-3 sm:px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all border border-rose-500/30"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Message Input */}
            <div>
              <label
                htmlFor="message-input"
                className="block text-xs sm:text-sm font-semibold text-white mb-2 sm:mb-3"
              >
                Message{" "}
                <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                id="message-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share your thoughts..."
                rows={4}
                maxLength={500}
                className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-white/5 border border-white/20 rounded-xl sm:rounded-2xl text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all"
              />
              <div className="text-right text-xs text-slate-500 mt-1 sm:mt-2">
                {message.length}/500
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || (!file && !message.trim())}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 disabled:shadow-none text-base sm:text-lg"
            >
              {isSubmitting ? (
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
                  Uploading...
                </span>
              ) : (
                "Submit"
              )}
            </button>
          </form>

          {/* Success/Error Messages */}
          {submitStatus === "success" && (
            <div className="mt-6 p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-2xl backdrop-blur-sm">
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
                  Upload successful! Your submission is pending approval.
                </p>
              </div>
            </div>
          )}

          {submitStatus === "error" && (
            <div className="mt-6 p-4 bg-rose-500/20 border border-rose-500/50 rounded-2xl backdrop-blur-sm">
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
