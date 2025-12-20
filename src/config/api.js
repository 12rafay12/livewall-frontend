// API Configuration
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const API_ENDPOINTS = {
  UPLOADS: `${API_BASE_URL}/api/uploads`,
  UPLOAD_BY_ID: (id) => `${API_BASE_URL}/api/uploads/${id}`,
  BULK_UPLOADS: `${API_BASE_URL}/api/uploads/bulk`,
};

// Helper to get full image URL
export const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path}`;
};
