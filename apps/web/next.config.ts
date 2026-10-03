import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@vojas/api-client', '@vojas/domain', '@vojas/shared'],
  // Resolve NodeNext-style .js import extensions to .ts source files
  // in transpiled workspace packages (api-client uses .js in re-exports).
  webpack(config) {
    config.resolve = config.resolve || {};
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias || {}),
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' }
    ]
  },
  async rewrites() {
    if (process.env.API_INTERNAL_URL) {
      return [
        {
          source: '/api/v1/:path*',
          destination: `${process.env.API_INTERNAL_URL}/api/v1/:path*`,
        },
      ];
    }
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/v1/:path*',
          destination: 'http://localhost:5000/api/v1/:path*',
        },
      ];
    }
    // Production without an explicit API_INTERNAL_URL: the browser calls
    // /api/v1/* same-origin, so it still needs somewhere to go. Proxy to the
    // deployed API (same fallback host as apps/web/src/lib/api.ts) instead of
    // returning no rewrites, which made every relative API call 404.
    return [
      {
        source: '/api/v1/:path*',
        destination: 'https://vojas-api.onrender.com/api/v1/:path*',
      },
    ];
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
    // Server-side only (available in next.config.ts and server components, NOT exposed to client)
    SENTRY_DSN: process.env.SENTRY_DSN,
  }
};

export default withSentryConfig(nextConfig, {
  // Suppress build-time Sentry plugin logs.
  silent: true,
  // Use hidden-source-map (strips sourceMappingURL from client bundles).
  hideSourceMaps: true,
  // Disable Sentry's own telemetry of the build process.
  telemetry: false,
});
