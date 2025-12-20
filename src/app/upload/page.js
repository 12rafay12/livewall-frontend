'use client';

import { useState } from 'react';
import Image from 'next/image';
import { API_ENDPOINTS } from '@/config/api';

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file && !message.trim()) {
      alert('Please upload a photo or enter a message');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const formData = new FormData();
      if (file) {
        formData.append('photo', file);
      }
      if (message.trim()) {
        formData.append('message', message.trim());
      }

      const response = await fetch(API_ENDPOINTS.UPLOADS, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFile(null);
        setMessage('');
        const fileInput = document.getElementById('photo-input');
        if (fileInput) fileInput.value = '';
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* QR Code at top */}
        <div className="mb-8 flex justify-center">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl">
            <Image
              src="/Landscape screen qr code.png"
              alt="QR Code"
              width={180}
              height={180}
              className="w-44 h-44 object-contain"
              priority
            />
            <p className="text-center text-white/70 text-sm mt-3 font-medium">
              Scan to share your moment
            </p>
          </div>
        </div>

        {/* Upload Form */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-3 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Share Your Moment
            </h1>
            <p className="text-slate-400 text-sm">
              Upload a photo, write a message, or both
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Input */}
            <div>
              <label
                htmlFor="photo-input"
                className="block text-sm font-semibold text-white mb-3"
              >
                Photo <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <input
                  id="photo-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="photo-input"
                  className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-white/20 rounded-2xl cursor-pointer bg-white/5 hover:bg-white/10 hover:border-indigo-400/50 transition-all duration-300 group"
                >
                  {file ? (
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-3">
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
                      <span className="text-sm text-white font-medium">
                        {file.name.length > 30 ? file.name.substring(0, 30) + '...' : file.name}
                      </span>
                      <span className="text-xs text-slate-400 mt-1">
                        Click to change
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mb-3 group-hover:bg-indigo-500/30 transition-colors">
                        <svg
                          className="w-8 h-8 text-indigo-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </div>
                      <span className="text-sm text-white/80 font-medium">
                        Click to upload photo
                      </span>
                      <span className="text-xs text-slate-500 mt-1">
                        PNG, JPG, WEBP up to 10MB
                      </span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Message Input */}
            <div>
              <label
                htmlFor="message-input"
                className="block text-sm font-semibold text-white mb-3"
              >
                Message <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                id="message-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share your thoughts..."
                rows={5}
                maxLength={500}
                className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all"
              />
              <div className="text-right text-xs text-slate-500 mt-2">
                {message.length}/500
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || (!file && !message.trim())}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 px-6 rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 disabled:shadow-none text-lg"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </span>
              ) : (
                'Submit'
              )}
            </button>
          </form>

          {/* Success/Error Messages */}
          {submitStatus === 'success' && (
            <div className="mt-6 p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-2xl backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-emerald-200 text-sm font-medium">
                  Upload successful! Your submission is pending approval.
                </p>
              </div>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="mt-6 p-4 bg-rose-500/20 border border-rose-500/50 rounded-2xl backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
