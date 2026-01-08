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
  const [showFlash, setShowFlash] = useState(false);
  const [showIntroScreen, setShowIntroScreen] = useState(true);
  const [selectedOption, setSelectedOption] = useState(null); // 'photo' or 'message'
  const [facingMode, setFacingMode] = useState("user"); // 'user' for front, 'environment' for rear
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const capturedFileRef = useRef(null);

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
          video: { facingMode: facingMode },
          audio: false,
        });
      } catch (facingError) {
        // Fallback to any available camera if specific facing mode fails
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (generalError) {
          throw generalError;
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

  // Switch camera (front/rear)
  const switchCamera = async () => {
    // Stop current stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Toggle facing mode
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacingMode);

    // Small delay to ensure stream is stopped
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Restart camera with new facing mode
    setIsLoadingCamera(true);
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: false,
      });

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
      console.error("Error switching camera:", error);
      setIsLoadingCamera(false);
      setCameraError("Unable to switch camera. This device may only have one camera.");

      // Revert to previous facing mode if switch fails
      setFacingMode(facingMode);
    }
  };

  // Handle intro screen option selection
  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    setShowIntroScreen(false);
    if (option === "photo") {
      openCamera();
    } else if (option === "message") {
      setShowMessageScreen(true);
    }
  };

  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Trigger flash animation
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 300);

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

        // Store file for upload in ref
        capturedFileRef.current = file;

        // Delay closing camera and showing form to let flash complete
        setTimeout(() => {
          closeCamera();
          setShowMessageScreen(true);
        }, 350);
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
    setShowIntroScreen(true);
    setSelectedOption(null);
    capturedFileRef.current = null;
    // Close camera if open
    if (streamRef.current) {
      closeCamera();
    }
  };

  // Submit photo
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Allow submission with just message (no photo required)
    if (!capturedImage && !message.trim()) return;

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const formData = new FormData();

      // Get the file from ref (if photo was uploaded)
      const file = capturedFileRef.current;
      if (file) {
        formData.append("photo", file);
      }

      // Message is required if no photo, optional if photo exists
      if (message.trim()) {
        formData.append("message", message.trim());
      } else if (!file) {
        // If no photo and no message, show error
        setSubmitStatus("error");
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(API_ENDPOINTS.UPLOADS, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setSubmitStatus("success");
        // Reset after 2 seconds and return to intro
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
    <>
      <style jsx>{`
        @keyframes flash {
          0% {
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 300ms ease-out;
        }
      `}</style>
      <div className="h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center p-4 overflow-hidden" style={{ height: '100vh' }}>
        {/* Intro Screen */}
        {showIntroScreen && (
          <div className="w-full max-w-lg animate-fadeIn">
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10">
              <div className="text-center mb-8">
                <h1
                  className="text-4xl sm:text-5xl font-bold mb-3"
                  style={{
                    fontFamily: "cursive",
                    textShadow:
                      "0 0 30px rgba(236, 72, 153, 0.8), 0 0 60px rgba(236, 72, 153, 0.4)",
                    color: "#ec4899",
                  }}
                >
                  LiveWall
                </h1>
                <p
                  className="text-lg sm:text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300 mb-6"
                  style={{ textShadow: "0 0 20px rgba(103, 232, 249, 0.5)" }}
                >
                  EXPERIENCE
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">
                  Share your night
                </h2>
              </div>

              <div className="space-y-4">
                {/* Upload Photo Button - Opens Camera */}
                <button
                  type="button"
                  onClick={() => handleOptionSelect("photo")}
                  className="w-full py-4 px-6 rounded-2xl border-2 font-bold text-lg transition-all hover:scale-105 active:scale-95"
                  style={{
                    borderColor: "#3b82f6",
                    color: "#3b82f6",
                    boxShadow:
                      "0 0 20px rgba(59, 130, 246, 0.5), inset 0 0 20px rgba(59, 130, 246, 0.1)",
                    textShadow: "0 0 10px rgba(59, 130, 246, 0.8)",
                  }}
                >
                  UPLOAD PHOTO
                </button>

                {/* Send Message Button */}
                <button
                  type="button"
                  onClick={() => handleOptionSelect("message")}
                  className="w-full py-4 px-6 rounded-2xl border-2 font-bold text-lg transition-all hover:scale-105 active:scale-95"
                  style={{
                    borderColor: "#ec4899",
                    color: "#ec4899",
                    boxShadow:
                      "0 0 20px rgba(236, 72, 153, 0.5), inset 0 0 20px rgba(236, 72, 153, 0.1)",
                    textShadow: "0 0 10px rgba(236, 72, 153, 0.8)",
                  }}
                >
                  SEND MESSAGE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Camera View */}
        {isCameraOpen && !showIntroScreen && (
          <div className="fixed inset-0 z-50 bg-black overflow-hidden" style={{ height: '100vh' }}>
            {/* Header with Switch Camera Button */}
            <div className="absolute top-0 left-0 right-0 z-[60] bg-black/40 backdrop-blur-xl border-b border-white/10 p-4">
              <div className="flex items-center justify-between">
                {/* Spacer for centering */}
                <div className="w-12"></div>

                <h1 className="text-2xl font-bold text-white text-center bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Take a Photo
                </h1>

                {/* Switch Camera Button */}
                {streamRef.current && !isLoadingCamera && !cameraError && (
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="w-12 h-12 bg-gradient-to-br from-indigo-500/30 to-purple-500/30 backdrop-blur-sm rounded-full border-2 border-white/60 shadow-lg hover:from-indigo-500/50 hover:to-purple-500/50 hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
                    style={{
                      boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)'
                    }}
                    title="Switch Camera"
                  >
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Video Preview with Phone Frame - Fills remaining space */}
            <div className="absolute inset-0 top-[73px] flex items-center justify-center bg-black">
              {/* Phone Frame Container - Fills available space */}
              <div className="relative w-full h-full">
                {/* Phone Bezel with Glowing Border */}
                <div
                  className="absolute inset-0 rounded-[2rem] md:rounded-[3rem] border-[3px] md:border-[4px]"
                  style={{
                    borderColor: "rgba(236, 72, 153, 0.6)",
                    boxShadow: `
                    0 0 30px rgba(236, 72, 153, 0.8),
                    0 0 60px rgba(236, 72, 153, 0.4),
                    inset 0 0 20px rgba(236, 72, 153, 0.2)
                  `,
                    backgroundColor: "rgba(0, 0, 0, 0.9)",
                  }}
                >
                  {/* Top Notch */}
                  <div
                    className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-8 rounded-b-3xl z-10"
                    style={{
                      backgroundColor: "rgba(0, 0, 0, 0.9)",
                      borderLeft: "3px solid rgba(236, 72, 153, 0.6)",
                      borderRight: "3px solid rgba(236, 72, 153, 0.6)",
                      borderBottom: "3px solid rgba(236, 72, 153, 0.6)",
                      boxShadow: "0 0 15px rgba(236, 72, 153, 0.5)",
                    }}
                  />

                  {/* Phone Screen Area */}
                  <div
                    className="absolute inset-0 rounded-[1.75rem] md:rounded-[2.75rem] overflow-hidden"
                    style={{ margin: "8px" }}
                  >
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Flash Animation */}
                    {showFlash && (
                      <div
                        className="absolute inset-0 bg-white pointer-events-none"
                        style={{
                          animation: "flash 300ms ease-out",
                        }}
                      />
                    )}

                    {/* Loading indicator */}
                    {isLoadingCamera && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/80">
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
                                  Look for the camera icon in your browser's
                                  address bar
                                </li>
                                <li>
                                  Click it and select "Allow" for camera access
                                </li>
                                <li>Then click "Try Again" below</li>
                              </ol>
                              <p className="text-slate-400 text-xs mt-3 italic">
                                Or refresh the page and allow camera when
                                prompted
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
                </div>
              </div>
            </div>

            {/* Capture Button - Fixed Overlay at Bottom Center */}
            {streamRef.current && !isLoadingCamera && !cameraError && (
              <button
                type="button"
                onClick={capturePhoto}
                className="fixed left-1/2 transform -translate-x-1/2 w-20 h-20 md:w-24 md:h-24 bg-white rounded-full border-4 md:border-6 border-white/30 shadow-2xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center z-[100] cursor-pointer"
                style={{
                  bottom: 'max(2rem, calc(2rem + env(safe-area-inset-bottom)))',
                  boxShadow: "0 0 30px rgba(255, 255, 255, 0.5), 0 0 60px rgba(255, 255, 255, 0.3)",
                  pointerEvents: 'auto'
                }}
              >
                <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full pointer-events-none"></div>
              </button>
            )}
          </div>
        )}

        {/* Message Screen - Show when message option selected or after photo capture */}
        {showMessageScreen && (
          <div className="w-full max-w-lg animate-fadeIn">
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Add a Message
                </h1>
                <p className="text-slate-400 text-sm">
                  Optional - or send as is
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Image Preview - Only show if image exists */}
                {capturedImage && (
                  <div className="relative w-full h-64 rounded-2xl overflow-hidden border-2 border-white/20 bg-black/20">
                    <img
                      src={capturedImage}
                      alt="Captured"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

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
    </>
  );
}
