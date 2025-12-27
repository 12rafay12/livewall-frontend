"use client";

import { QRCodeSVG } from "qrcode.react";

export default function QRCode({
  variant = "full", // "full" | "compact" | "mini"
  className = ""
}) {
  // Get the QR code URL from environment variable or fallback to dynamic URL
  const getUploadUrl = () => {
    // First priority: Environment variable
    if (process.env.NEXT_PUBLIC_QR_URL) {
      return process.env.NEXT_PUBLIC_QR_URL;
    }

    // Fallback: Dynamic URL based on current location
    const baseUrl = typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "http://localhost:3000";

    return `${baseUrl}/upload`;
  };

  const uploadUrl = getUploadUrl();

  // Full design with branding (like the original image)
  if (variant === "full") {
    return (
      <div className={`relative ${className}`}>
        <div className="bg-gradient-to-br from-purple-950 via-indigo-950 to-blue-950 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 md:gap-8">
            {/* Left side - SCAN SHARE SHINE text */}
            <div className="flex flex-col items-center sm:items-start space-y-0.5 sm:space-y-1">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-pink-300"
                  style={{
                    textShadow: '0 0 25px rgba(236, 72, 153, 0.8), 0 0 50px rgba(236, 72, 153, 0.4)',
                    WebkitTextStroke: '0.8px rgba(236, 72, 153, 0.3)'
                  }}>
                SCAN
              </h2>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-pink-300"
                  style={{
                    textShadow: '0 0 25px rgba(236, 72, 153, 0.8), 0 0 50px rgba(236, 72, 153, 0.4)',
                    WebkitTextStroke: '0.8px rgba(236, 72, 153, 0.3)'
                  }}>
                SHARE
              </h2>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-pink-300"
                  style={{
                    textShadow: '0 0 25px rgba(236, 72, 153, 0.8), 0 0 50px rgba(236, 72, 153, 0.4)',
                    WebkitTextStroke: '0.8px rgba(236, 72, 153, 0.3)'
                  }}>
                SHINE
              </h2>
            </div>

            {/* Right side - QR Code with neon border */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative p-3 sm:p-4 md:p-5 bg-white rounded-xl sm:rounded-2xl"
                   style={{
                     boxShadow: '0 0 35px rgba(236, 72, 153, 0.6), 0 0 70px rgba(236, 72, 153, 0.3), inset 0 0 15px rgba(168, 85, 247, 0.2)',
                     border: '2.5px solid transparent',
                     backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #ec4899, #a855f7, #3b82f6)',
                     backgroundOrigin: 'border-box',
                     backgroundClip: 'padding-box, border-box'
                   }}>
                <QRCodeSVG
                  value={uploadUrl}
                  size={200}
                  level="H"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>

              {/* Powered by text */}
              <div className="text-center">
                <p className="text-xs text-cyan-300/80 font-semibold tracking-wider uppercase">
                  POWERED BY
                </p>
                <p className="text-base sm:text-lg md:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300"
                   style={{ textShadow: '0 0 18px rgba(103, 232, 249, 0.5)' }}>
                  LIVEWALL EXPERIENCE
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compact version - QR with text and branding (for medium displays)
  if (variant === "compact") {
    return (
      <div className={`relative ${className}`}>
        <div className="bg-gradient-to-br from-purple-950 via-indigo-950 to-blue-950 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl">
          <div className="flex flex-col items-center gap-4">
            {/* SCAN SHARE SHINE text - compact version */}
            <div className="flex gap-2 sm:gap-3">
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-pink-300"
                  style={{
                    textShadow: '0 0 20px rgba(236, 72, 153, 0.7), 0 0 40px rgba(236, 72, 153, 0.3)',
                    WebkitTextStroke: '0.5px rgba(236, 72, 153, 0.3)'
                  }}>
                SCAN
              </h3>
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-pink-300"
                  style={{
                    textShadow: '0 0 20px rgba(236, 72, 153, 0.7), 0 0 40px rgba(236, 72, 153, 0.3)',
                    WebkitTextStroke: '0.5px rgba(236, 72, 153, 0.3)'
                  }}>
                SHARE
              </h3>
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-pink-300"
                  style={{
                    textShadow: '0 0 20px rgba(236, 72, 153, 0.7), 0 0 40px rgba(236, 72, 153, 0.3)',
                    WebkitTextStroke: '0.5px rgba(236, 72, 153, 0.3)'
                  }}>
                SHINE
              </h3>
            </div>

            {/* QR Code */}
            <div className="p-3 sm:p-4 bg-white rounded-xl sm:rounded-2xl"
                 style={{
                   boxShadow: '0 0 30px rgba(236, 72, 153, 0.5), 0 0 60px rgba(236, 72, 153, 0.25)',
                   border: '2px solid transparent',
                   backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #ec4899, #a855f7)',
                   backgroundOrigin: 'border-box',
                   backgroundClip: 'padding-box, border-box'
                 }}>
              <QRCodeSVG
                value={uploadUrl}
                size={180}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>

            {/* Branding */}
            <div className="text-center">
              <p className="text-xs text-cyan-300/70 font-semibold tracking-wider uppercase">
                POWERED BY
              </p>
              <p className="text-sm sm:text-base md:text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300"
                 style={{ textShadow: '0 0 15px rgba(103, 232, 249, 0.4)' }}>
                LIVEWALL EXPERIENCE
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mini version - tiny QR for corner display
  return (
    <div className={`relative ${className}`}>
      <div className="p-2 bg-white rounded-lg"
           style={{
             boxShadow: '0 0 20px rgba(236, 72, 153, 0.4)',
             border: '2px solid rgba(236, 72, 153, 0.3)'
           }}>
        <QRCodeSVG
          value={uploadUrl}
          size={100}
          level="H"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>
    </div>
  );
}
