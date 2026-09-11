import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

// Forcing a rebuild: the /api/v1/* rewrite below was failing with
// DNS_HOSTNAME_RESOLVED_PRIVATE against vojas-backend.onrender.com even
// after the backend's own DNS/build/env issues were fixed and it was
// confirmed healthy directly. This is a no-op change to trigger a fresh
// Vercel deploy in case the rewrite destination was validated/cached stale.

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
    const target = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${target}/api/v1/:path*`,
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
