"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { API_ENDPOINTS, getImageUrl } from "@/config/api";
import QRCode from "@/components/QRCode";

const DISPLAY_DURATION = 10000; // 10 seconds per item (strict rule)
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
      const response = await fetch(`${API_ENDPOINTS.UPLOADS}?status=approved`);
      if (response.ok) {
        const data = await response.json();
        // Filter out already displayed items
        const newItems = data.filter(
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
    const pollInterval = setInterval(fetchApprovedUploads, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, []);

  const currentUpload = uploads[currentIndex];

  return (
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
          {/* Photo - Full Screen */}
          {currentUpload.photoUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src={getImageUrl(currentUpload.photoUrl)}
                alt="Display"
                className="max-w-full max-h-full object-contain"
                onError={() => {
                  // Only log the URL, not the event object to avoid Next.js warnings
                  console.error(
                    "Image failed to load:",
                    currentUpload.photoUrl
                  );
                }}
              />
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
  );
}
