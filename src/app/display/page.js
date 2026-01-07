"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { API_ENDPOINTS, getImageUrl } from "@/config/api";
import QRCode from "@/components/QRCode";

const DISPLAY_DURATION = 10000; // 15 seconds per item
const QR_INTERVAL = 600000; // 10 minutes (configurable)
const QR_DURATION = 90000; // 1.5 minutes (configurable)

export default function DisplayPage() {
  const [uploads, setUploads] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [showFullScreenQR, setShowFullScreenQR] = useState(false);
  const [displayedIds, setDisplayedIds] = useState(new Set());
  const intervalRef = useRef(null);
  const qrIntervalRef = useRef(null);
  const qrTimeoutRef = useRef(null);
  const uploadsRef = useRef([]);
  const displayedIdsRef = useRef(new Set());

  // Update ref when displayedIds change
  useEffect(() => {
    displayedIdsRef.current = displayedIds;
  }, [displayedIds]);

  // Fetch approved uploads
  const fetchApprovedUploads = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.UPLOADS}?status=approved&displayed=not-displayed`);
      if (response.ok) {
        const data = await response.json();
        // Handle paginated response
        const uploadsList = data.uploads || [];
        // Filter out already displayed items
        const newItems = uploadsList.filter(
          (item) => !displayedIdsRef.current.has(item.id)
        );

        if (newItems.length > 0) {
          setUploads((prev) => {
            // Add new items that haven't been displayed
            const existingIds = new Set(prev.map((u) => u.id));
            const toAdd = newItems.filter((item) => !existingIds.has(item.id));

            // Only add if there are truly new items
            if (toAdd.length === 0) {
              return prev;
            }

            const updated = [...prev, ...toAdd];
            uploadsRef.current = updated;

            // If we're not active, start the slideshow
            if (!isActive) {
              setIsActive(true);
              setCurrentIndex(0);
            }

            return updated;
          });
        }
      }
    } catch (error) {
      console.error("Error fetching uploads:", error);
    }
  };

  // Update ref when uploads change
  useEffect(() => {
    uploadsRef.current = uploads;
  }, [uploads]);

  // Handle slideshow progression
  useEffect(() => {
    if (isActive && uploads.length > 0 && !showFullScreenQR) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Set up interval for 10 seconds per item
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          const currentUploads = uploadsRef.current;

          // If no uploads, return to passive
          if (currentUploads.length === 0) {
            setIsActive(false);
            return 0;
          }

          const next = prev + 1;

          // If we've shown all items, mark them as displayed and return to passive mode
          if (next >= currentUploads.length) {
            // Mark all items as displayed
            setDisplayedIds((prev) => {
              const newSet = new Set(prev);
              currentUploads.forEach((upload) => newSet.add(upload.id));
              displayedIdsRef.current = newSet;
              return newSet;
            });

            // Clear the uploads array and return to passive
            setUploads([]);
            uploadsRef.current = [];
            setIsActive(false);
            return 0;
          }

          return next;
        });
      }, DISPLAY_DURATION);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else if (!isActive && uploads.length > 0 && !showFullScreenQR) {
      // If we have uploads but not active, start the slideshow
      setIsActive(true);
      setCurrentIndex(0);
    }
  }, [isActive, uploads.length, showFullScreenQR]);

  // Handle full-screen QR code overlay
  useEffect(() => {
    // Set up interval for full-screen QR
    qrIntervalRef.current = setInterval(() => {
      setShowFullScreenQR(true);

      // Hide QR after duration
      qrTimeoutRef.current = setTimeout(() => {
        setShowFullScreenQR(false);
      }, QR_DURATION);
    }, QR_INTERVAL);

    return () => {
      if (qrIntervalRef.current) {
        clearInterval(qrIntervalRef.current);
      }
      if (qrTimeoutRef.current) {
        clearTimeout(qrTimeoutRef.current);
      }
    };
  }, []);

  // Poll for new approved uploads
  useEffect(() => {
    fetchApprovedUploads();

    // Only poll when not active (no images showing)
    if (!isActive) {
      const pollInterval = setInterval(fetchApprovedUploads, 10000); // Poll every 10 seconds
      return () => clearInterval(pollInterval);
    }
  }, [isActive]);

  const currentUpload = uploads[currentIndex];

  // Mark upload as displayed when shown on screen
  useEffect(() => {
    if (isActive && currentUpload && !showFullScreenQR) {
      // Call API to mark as displayed
      const markAsDisplayed = async () => {
        try {
          await fetch(API_ENDPOINTS.UPLOAD_MARK_DISPLAYED(currentUpload.id), {
            method: 'PATCH',
          });
        } catch (error) {
          console.error('Error marking upload as displayed:', error);
        }
      };
      markAsDisplayed();
    }
  }, [currentUpload?.id, isActive, showFullScreenQR]);

  return (
    <>
      <style jsx global>{`
        @keyframes swirlLeft {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 0.8;
          }
          25% {
            transform: translate(-10px, -20px) rotate(5deg);
            opacity: 1;
          }
          50% {
            transform: translate(10px, -40px) rotate(-5deg);
            opacity: 0.9;
          }
          75% {
            transform: translate(-5px, -10px) rotate(3deg);
            opacity: 1;
          }
        }
        @keyframes swirlRight {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 0.8;
          }
          25% {
            transform: translate(10px, -20px) rotate(-5deg);
            opacity: 1;
          }
          50% {
            transform: translate(-10px, -40px) rotate(5deg);
            opacity: 0.9;
          }
          75% {
            transform: translate(5px, -10px) rotate(-3deg);
            opacity: 1;
          }
        }
      `}</style>
    <div className="fixed inset-0 overflow-hidden bg-black">
      {/* Full-screen QR Code Overlay */}
      {showFullScreenQR && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
          <QRCode variant="full" className="w-full max-w-4xl" />
        </div>
      )}

      {/* Passive Mode */}
      {!isActive && !showFullScreenQR && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center p-4 sm:p-6">
          {/* Small neon QR code in corner */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6">
            <QRCode variant="mini" />
          </div>

          {/* Center content */}
          <div className="text-center px-4">
            <div className="inline-block p-6 sm:p-8 bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/10">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-3 sm:mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                LiveWall
              </h1>
              <p className="text-slate-400 text-base sm:text-lg md:text-xl">
                Waiting for content...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Mode - Slideshow */}
      {isActive && !showFullScreenQR && currentUpload && (
        <div className="absolute inset-0 bg-black">
          {/* LiveWall Visuals - Left Side */}
          {currentUpload.photoUrl && (
            <div className="absolute left-0 top-0 bottom-0 w-1/3 pointer-events-none overflow-hidden">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <linearGradient id="swirlGradientLeft1" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ff6b6b" stopOpacity="0.9" />
                    <stop offset="25%" stopColor="#ffa500" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.7" />
                    <stop offset="75%" stopColor="#ec4899" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.4" />
                  </linearGradient>
                  <linearGradient id="swirlGradientLeft2" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
                    <stop offset="30%" stopColor="#fbbf24" stopOpacity="0.7" />
                    <stop offset="60%" stopColor="#ec4899" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3" />
                  </linearGradient>
                  <linearGradient id="swirlGradientLeft3" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ffa500" stopOpacity="0.7" />
                    <stop offset="40%" stopColor="#ec4899" stopOpacity="0.6" />
                    <stop offset="80%" stopColor="#a855f7" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
                  </linearGradient>
                  <filter id="glowLeft">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                {/* Main swirling pattern - flowing from bottom center upward and outward */}
                <path
                  d="M 200 750 C 180 700, 150 650, 120 600 C 100 550, 90 500, 100 450 C 110 400, 130 350, 160 300 C 180 250, 200 200, 220 150 C 240 100, 260 80, 280 100 C 300 120, 310 150, 320 200 C 330 250, 330 300, 320 350 C 310 400, 290 450, 260 500 C 240 550, 220 600, 200 650 C 190 700, 200 750, 200 750"
                  fill="none"
                  stroke="url(#swirlGradientLeft1)"
                  strokeWidth="4"
                  filter="url(#glowLeft)"
                  style={{
                    animation: 'swirlLeft 12s ease-in-out infinite'
                  }}
                />
                {/* Secondary swirling pattern */}
                <path
                  d="M 220 720 C 200 680, 170 640, 140 600 C 120 560, 110 520, 115 480 C 120 440, 135 400, 160 360 C 185 320, 210 280, 240 240 C 260 200, 280 170, 300 180 C 320 190, 335 220, 340 260 C 345 300, 340 340, 325 380 C 310 420, 285 460, 255 500 C 235 540, 220 580, 220 620 C 220 660, 220 720, 220 720"
                  fill="none"
                  stroke="url(#swirlGradientLeft2)"
                  strokeWidth="3.5"
                  filter="url(#glowLeft)"
                  style={{
                    animation: 'swirlLeft 14s ease-in-out infinite',
                    animationDelay: '1.5s'
                  }}
                />
                {/* Tertiary swirling pattern */}
                <path
                  d="M 180 740 C 160 700, 130 660, 100 620 C 80 580, 70 540, 75 500 C 80 460, 95 420, 120 380 C 145 340, 175 300, 210 260 C 235 220, 260 190, 290 200 C 315 210, 330 240, 335 280 C 340 320, 335 360, 320 400 C 305 440, 280 480, 250 520 C 230 560, 210 600, 190 640 C 180 680, 180 740, 180 740"
                  fill="none"
                  stroke="url(#swirlGradientLeft3)"
                  strokeWidth="3"
                  filter="url(#glowLeft)"
                  style={{
                    animation: 'swirlLeft 16s ease-in-out infinite',
                    animationDelay: '3s'
                  }}
                />
              </svg>
            </div>
          )}

          {/* Photo - Center */}
          {currentUpload.photoUrl && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="relative w-full max-w-2xl mx-auto px-4 h-full flex items-center justify-center">
                <img
                  src={getImageUrl(currentUpload.photoUrl)}
                  alt="Display"
                  className="object-contain"
                  style={{ 
                    height: '100vh',
                    width: 'auto',
                    maxWidth: '100%'
                  }}
                  onError={() => {
                    console.error("Image failed to load:", currentUpload.photoUrl);
                  }}
                />
              </div>
            </div>
          )}

          {/* LiveWall Visuals - Right Side */}
          {currentUpload.photoUrl && (
            <div className="absolute right-0 top-0 bottom-0 w-1/3 pointer-events-none overflow-hidden">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <linearGradient id="swirlGradientRight1" x1="100%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#ff6b6b" stopOpacity="0.9" />
                    <stop offset="25%" stopColor="#ffa500" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.7" />
                    <stop offset="75%" stopColor="#ec4899" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.4" />
                  </linearGradient>
                  <linearGradient id="swirlGradientRight2" x1="100%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
                    <stop offset="30%" stopColor="#fbbf24" stopOpacity="0.7" />
                    <stop offset="60%" stopColor="#ec4899" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3" />
                  </linearGradient>
                  <linearGradient id="swirlGradientRight3" x1="100%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#ffa500" stopOpacity="0.7" />
                    <stop offset="40%" stopColor="#ec4899" stopOpacity="0.6" />
                    <stop offset="80%" stopColor="#a855f7" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
                  </linearGradient>
                  <filter id="glowRight">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                {/* Main swirling pattern - Mirrored, flowing from bottom center upward and outward */}
                <path
                  d="M 200 750 C 220 700, 250 650, 280 600 C 300 550, 310 500, 300 450 C 290 400, 270 350, 240 300 C 220 250, 200 200, 180 150 C 160 100, 140 80, 120 100 C 100 120, 90 150, 80 200 C 70 250, 70 300, 80 350 C 90 400, 110 450, 140 500 C 160 550, 180 600, 200 650 C 210 700, 200 750, 200 750"
                  fill="none"
                  stroke="url(#swirlGradientRight1)"
                  strokeWidth="4"
                  filter="url(#glowRight)"
                  style={{
                    animation: 'swirlRight 12s ease-in-out infinite'
                  }}
                />
                {/* Secondary swirling pattern - Mirrored */}
                <path
                  d="M 180 720 C 200 680, 230 640, 260 600 C 280 560, 290 520, 285 480 C 280 440, 265 400, 240 360 C 215 320, 190 280, 160 240 C 140 200, 120 170, 100 180 C 80 190, 65 220, 60 260 C 55 300, 60 340, 75 380 C 90 420, 115 460, 145 500 C 165 540, 180 580, 180 620 C 180 660, 180 720, 180 720"
                  fill="none"
                  stroke="url(#swirlGradientRight2)"
                  strokeWidth="3.5"
                  filter="url(#glowRight)"
                  style={{
                    animation: 'swirlRight 14s ease-in-out infinite',
                    animationDelay: '1.5s'
                  }}
                />
                {/* Tertiary swirling pattern - Mirrored */}
                <path
                  d="M 220 740 C 240 700, 270 660, 300 620 C 320 580, 330 540, 325 500 C 320 460, 305 420, 280 380 C 255 340, 225 300, 190 260 C 165 220, 140 190, 110 200 C 85 210, 70 240, 65 280 C 60 320, 65 360, 80 400 C 95 440, 120 480, 150 520 C 170 560, 190 600, 210 640 C 220 680, 220 740, 220 740"
                  fill="none"
                  stroke="url(#swirlGradientRight3)"
                  strokeWidth="3"
                  filter="url(#glowRight)"
                  style={{
                    animation: 'swirlRight 16s ease-in-out infinite',
                    animationDelay: '3s'
                  }}
                />
              </svg>
            </div>
          )}

          {/* Message - Below Image */}
          {currentUpload.message && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-8 sm:pt-12 md:pt-16 pb-4 sm:pb-6 md:pb-8 px-4 sm:px-6 md:px-8">
              <div className="max-w-5xl mx-auto">
                <p className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-7xl font-bold text-center leading-tight drop-shadow-2xl">
                  {currentUpload.message}
                </p>
              </div>
            </div>
          )}

          {/* Small QR code in corner (always visible) */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 z-10">
            <QRCode variant="mini" />
          </div>

          {/* Progress indicator */}
          {uploads.length > 1 && (
            <div className="absolute bottom-2 sm:bottom-3 md:bottom-4 left-1/2 transform -translate-x-1/2 z-20">
              <div className="flex gap-1.5 sm:gap-2 bg-black/40 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/20">
                {uploads.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                      index === currentIndex
                        ? "bg-indigo-400 w-6 sm:w-8 shadow-lg shadow-indigo-400/50"
                        : "bg-white/30 w-1.5 sm:w-2"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}
