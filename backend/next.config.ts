import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: frontendOrigin },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, Accept, X-Requested-With' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
    ];
  },
};

export default nextConfig;

