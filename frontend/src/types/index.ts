// Shared types for VOJAS frontend

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: any;
  } | null;
  meta: {
    timestamp: string;
  };
}

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  environment: string;
  uptime: number;
  database: string;
  timestamp: string;
}

export type UserRole = "ADMIN" | "OFFICER" | "REVIEWER" | "ANALYST" | "VIEWER";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export type NavItem = {
  label: string;
  path: string;
  icon: string;
  badge?: number;
};
