"use client";

import { useState, useRef, useEffect } from "react";
import { API_ENDPOINTS } from "@/config/api";

export default function UploadPage() {
  const [capturedImage, setCapturedImage] = useState(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [showMessageScreen, setShowMessageScreen] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  // Auto-open camera on page load
  useEffect(() => {
    openCamera();
  }, []);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Open camera
  const openCamera = async () => {
    setCameraError(null);
    setIsLoadingCamera(true);
    setIsCameraOpen(true);

    await new Promise((resolve) => setTimeout(resolve, 200));

    try {
      const isSecureContext =
        window.isSecureContext ||
        location.protocol === "https:" ||
        location.hostname === "localhost" ||
        location.hostname === "127.0.0.1";

      if (!isSecureContext) {
        throw new Error("HTTPS_REQUIRED");
      }

      const getUserMedia =
        navigator.mediaDevices?.getUserMedia ||
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

      if (!getUserMedia) {
        throw new Error(
          "Camera API not supported. Please use a modern browser."
        );
      }

      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
      } catch (userError) {
        if (isMobile) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "environment" },
              audio: false,
            });
          } catch (envError) {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          }
        } else {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      streamRef.current = stream;
      setIsLoadingCamera(false);

      await new Promise((resolve) => setTimeout(resolve, 100));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        const playVideo = () => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            videoRef.current.play().catch((err) => {
              console.error("Error playing video:", err);
              setCameraError("Camera accessed but video failed to play");
            });
          } else {
            setTimeout(playVideo, 100);
          }
        };

        videoRef.current.onloadedmetadata = () => {
          playVideo();
        };

        if (videoRef.current.readyState >= 2) {
          playVideo();
        }
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setIsLoadingCamera(false);

      let errorMessage = "Unable to access camera.";

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
          "Camera permission denied. Please allow camera access and try again.";
      } else if (
        error.name === "NotFoundError" ||
        error.name === "DevicesNotFoundError"
      ) {
        errorMessage = "No camera found. Please connect a camera.";
      } else if (
        error.name === "NotReadableError" ||
        error.name === "TrackStartError"
      ) {
        errorMessage =
          "Camera is already in use by another application. Please close other apps.";
      }

      setCameraError(errorMessage);
    }
  };

  // Close camera
  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setCameraError(null);
  };

  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);

        // Store file for upload
        canvas.capturedFile = file;

        // Close camera and show message screen
        closeCamera();
        setShowMessageScreen(true);
      },
      "image/jpeg",
      0.9
    );
  };

  // Discard photo
  const discardPhoto = () => {
    setCapturedImage(null);
    setMessage("");
    setShowMessageScreen(false);
    setSubmitStatus(null);
    // Reopen camera
    openCamera();
  };

  // Submit photo
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!capturedImage) return;

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const formData = new FormData();

      // Get the file from canvas
      const file = canvasRef.current.capturedFile;
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
        // Reset after 2 seconds and take new photo
        setTimeout(() => {
          discardPhoto();
        }, 2000);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center p-4">
      {/* Camera View */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Header */}
          <div className="bg-black/40 backdrop-blur-xl border-b border-white/10 p-4">
            <h1 className="text-2xl font-bold text-white text-center bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Take a Photo
            </h1>
          </div>

          {/* Video Preview */}
          <div className="flex-1 relative flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Loading indicator */}
            {isLoadingCamera && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                  <p className="text-white text-sm">Accessing camera...</p>
                  <p className="text-white/70 text-xs mt-2">
                    Please allow camera access when prompted
                  </p>
                </div>
              </div>
            )}

            {/* Error message */}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
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
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 3l18 18"
                      />
                    </svg>
                  </div>
                  <p className="text-white text-sm font-medium mb-3">
                    {cameraError}
                  </p>

                  {/* Show instructions if permission was denied */}
                  {(cameraError.includes("permission") ||
                    cameraError.includes("denied")) && (
                    <div className="bg-white/5 rounded-xl p-4 mb-4 text-left">
                      <p className="text-white text-xs font-semibold mb-2">
                        To enable camera access:
                      </p>
                      <ol className="text-slate-300 text-xs space-y-1 list-decimal list-inside">
                        <li>
                          Look for the camera icon in your browser's address bar
                        </li>
                        <li>Click it and select "Allow" for camera access</li>
                        <li>Then click "Try Again" below</li>
                      </ol>
                      <p className="text-slate-400 text-xs mt-3 italic">
                        Or refresh the page and allow camera when prompted
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={openCamera}
                      className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full font-semibold transition-all shadow-lg"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-medium transition-all text-sm"
                    >
                      Refresh Page
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Camera Controls */}
          {streamRef.current && !isLoadingCamera && !cameraError && (
            <div className="bg-gradient-to-t from-black to-transparent p-6">
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-20 h-20 bg-white rounded-full border-4 border-white/30 shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
                >
                  <div className="w-16 h-16 bg-white rounded-full"></div>
                </button>
              </div>
              {/* Photographer Link */}
              {/* <div className="mt-6 text-center">
                <a
                  href="/photographer/login"
                  className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="hover:underline">Photographer? Batch Upload Here</span>
                </a>
              </div> */}
            </div>
          )}
        </div>
      )}

      {/* Message Screen */}
      {showMessageScreen && capturedImage && (
        <div className="w-full max-w-lg">
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Add a Message
              </h1>
              <p className="text-slate-400 text-sm">Optional - or send as is</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Image Preview */}
              <div className="relative w-full h-64 rounded-2xl overflow-hidden border-2 border-white/20 bg-black/20">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Message Input */}
              <div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share your thoughts... (optional)"
                  rows={4}
                  maxLength={500}
                  className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-2xl text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all"
                />
                <div className="text-right text-xs text-slate-500 mt-2">
                  {message.length}/500
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={discardPhoto}
                  disabled={isSubmitting}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-6 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 px-6 rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 disabled:shadow-none"
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
                      Sending...
                    </span>
                  ) : (
                    "Send"
                  )}
                </button>
              </div>
            </form>

            {/* Success/Error Messages */}
            {submitStatus === "success" && (
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
                    Upload successful! Taking you back...
                  </p>
                </div>
              </div>
            )}

            {submitStatus === "error" && (
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
      )}
    </div>
  );
}
