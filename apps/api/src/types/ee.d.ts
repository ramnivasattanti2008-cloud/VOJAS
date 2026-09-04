/**
 * Optional type declarations for the google-earthengine-api package.
 * This package is only required when GEE credentials are configured.
 * skipLibCheck is enabled so these are only used for type inference.
 */

declare module 'ee' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ee: any;
  export = ee;
}
