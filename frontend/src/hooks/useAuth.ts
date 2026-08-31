/**
 * Re-export the auth context hook for a single, consistent import point.
 * Authentication (JWT + user identity) is client state, not server state,
 * so AuthContext handles it; React Query handles all server-state caching.
 */
export { useAuth } from "@/contexts/AuthContext";
