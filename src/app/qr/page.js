"use client";

import QRCode from "@/components/QRCode";

export default function QRCodePage() {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center p-4 sm:p-6 md:p-8 min-h-screen">
      <QRCode variant="full" className="w-full max-w-4xl" />
    </div>
  );
}
