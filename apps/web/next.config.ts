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
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
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
