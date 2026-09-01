/**
 * Centralized React Query key factory.
 * Use these helpers to avoid string-typo bugs in invalidation logic.
 */

export const qk = {
  // Projects
  projects: (filters?: object) => ["projects", "list", filters ?? {}] as const,
  project: (id: string) => ["projects", "detail", id] as const,
  projectStats: () => ["projects", "stats"] as const,

  // Anomalies
  anomalies: (filters?: object) => ["anomalies", "list", filters ?? {}] as const,
  anomaly: (id: string) => ["anomalies", "detail", id] as const,
  anomalyStats: () => ["anomalies", "stats"] as const,
  anomalyRules: () => ["anomalies", "rules"] as const,

  // Reports
  reports: (filters?: object) => ["reports", "list", filters ?? {}] as const,
  report: (id: string) => ["reports", "detail", id] as const,
  reportStats: () => ["reports", "stats"] as const,

  // Financial
  expenditures: (projectId: string, filters?: object) =>
    ["financials", "expenditures", projectId, filters ?? {}] as const,
  projectFinancials: (projectId: string) =>
    ["financials", "project", projectId] as const,
  schemeFinancials: () => ["financials", "scheme"] as const,

  // Documents
  documents: (projectId: string, filters?: object) =>
    ["documents", "list", projectId, filters ?? {}] as const,
  documentStats: (projectId: string) => ["documents", "stats", projectId] as const,

  // Notifications
  notifications: (filters?: object) =>
    ["notifications", "list", filters ?? {}] as const,
  notificationsUnreadCount: () => ["notifications", "unread-count"] as const,

  // Risk
  risk: (filters?: object) => ["risk", "list", filters ?? {}] as const,
  riskStats: () => ["risk", "stats"] as const,
  projectRisk: (projectId: string) => ["risk", "project", projectId] as const,

  // Analytics
  analyticsSummary: () => ["analytics", "summary"] as const,

  // Map
  mapOverview: (filters?: object) => ["map", "overview", filters ?? {}] as const,
  projectLocations: (projectId: string) => ["map", "project-locations", projectId] as const,

  // System
  health: () => ["system", "health"] as const,

  // MPs (open-data)
  mps: (filters?: object) => ["mps", "list", filters ?? {}] as const,
  mp: (id: string) => ["mps", "detail", id] as const,

  // Vendors (open-data)
  vendors: (filters?: object) => ["vendors", "list", filters ?? {}] as const,
  vendor: (id: string) => ["vendors", "detail", id] as const,
  topVendors: (limit: number) => ["vendors", "top", limit] as const,

  // Extended analytics
  mpOverview: () => ["analytics", "mp-overview"] as const,
  mpTrends: (id: string) => ["analytics", "mp-trends", id] as const,
  vendorOverview: () => ["analytics", "vendor-overview"] as const,
  vendorTop: (limit: number) => ["analytics", "vendor-top", limit] as const,
  longitudinal: () => ["analytics", "longitudinal"] as const,
} as const;
