import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,

  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  experimental: {
    optimizePackageImports: [
      '@tanstack/react-table',
      'recharts',
      'lucide-react',
      'date-fns',
      'zod',
      '@react-email/components',
      '@radix-ui/react-icons',
    ],
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
      {
        source: '/sitemap.xml',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=3600',
          },
        ],
      },
      {
        source: '/robots.txt',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=3600',
          },
        ],
      },
      {
        source: '/llm.txt',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=3600',
          },
        ],
      },
    ];
  },

  webpack: (config, { isServer, dev }) => {
    if (!isServer && !dev) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
        cacheGroups: {
          default: false,
          vendors: false,
          commons: {
            name: 'commons',
            chunks: 'all',
            minChunks: 2,
            maxInitialRequests: 10,
            minSize: 0,
            priority: 10,
            reuseExistingChunk: true,
          },
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)[\\/]/)?.[1];
              return `npm.${packageName?.replace('@', '')}`;
            },
            chunks: 'all',
            priority: 20,
            reuseExistingChunk: true,
          },
          recharts: {
            name: 'recharts',
            test: /[\\/]node_modules[\\/]recharts/,
            chunks: 'all',
            priority: 30,
            reuseExistingChunk: true,
          },
          tanstack: {
            name: 'tanstack',
            test: /[\\/]node_modules[\\/]@tanstack/,
            chunks: 'all',
            priority: 30,
            reuseExistingChunk: true,
          },
          pdf: {
            name: 'pdf',
            test: /[\\/]node_modules[\\/](jspdf|@react-pdf|html2canvas)/,
            chunks: 'all',
            priority: 30,
            reuseExistingChunk: true,
          },
          xlsx: {
            name: 'xlsx',
            test: /[\\/]node_modules[\\/]xlsx/,
            chunks: 'all',
            priority: 30,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
  },

  // Disable source maps in production for security
  productionBrowserSourceMaps: false,

  // Output config for better caching
  output: 'standalone',

  // Enable Turbopack (Next.js 15+)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;