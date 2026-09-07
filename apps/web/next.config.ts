import type { NextConfig } from 'next';

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
  }
};

export default nextConfig;
