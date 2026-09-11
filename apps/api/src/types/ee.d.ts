/**
 * Optional type declarations for the google-earthengine-api package.
 * This package is only required when GEE credentials are configured.
 * skipLibCheck is enabled so these are only used for type inference.
 */

declare module 'ee' {
   
  const ee: any;
  export = ee;
}
