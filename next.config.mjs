/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow cross-origin requests from network IP during development
  allowedDevOrigins: [
    'https://169.254.83.107:3000',
    'https://169.254.83.107',
    'http://169.254.83.107:3000',
    'http://169.254.83.107',
    '169.254.83.107:3000',
    '169.254.83.107',
  ],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '169.254.83.107',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '169.254.83.107',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '**.s3.**.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.s3.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'livewall-uploads.s3.eu-north-1.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'd1w558igkzurxw.cloudfront.net',
        pathname: '/**',
      },
    ],
    unoptimized: true, // For local development
  },
};

export default nextConfig;
