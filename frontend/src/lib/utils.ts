import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn — className merger using clsx + tailwind-merge.
 * Combines conditional classes, deduplicates, and resolves tailwind conflicts.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format INR (Indian Rupee) for compact display.
 *   1,23,45,678 → "₹1.23 Cr"
 *   1,00,000    → "₹1.00 L"
 *   1,000       → "₹1.0K"
 */
export function formatINR(amount: number, decimals = 2): string {
  if (!Number.isFinite(amount)) return "₹—";
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(decimals)} Cr`;
  if (amount >= 1_00_000)    return `₹${(amount / 1_00_000).toFixed(decimals)} L`;
  if (amount >= 1_000)        return `₹${(amount / 1_000).toFixed(1)}K`;
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

/**
 * Format INR with the standard "₹" + comma-separated Indian style.
 */
export function formatINRFull(amount: number): string {
  if (!Number.isFinite(amount)) return "₹—";
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

/**
 * Format date to "DD MMM YYYY" (en-IN style).
 */
export function formatDate(d: string | Date | null | undefined, fallback = "—"): string {
  if (!d) return fallback;
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Relative time formatter (e.g. "5m ago", "2h ago", "3d ago").
 */
export function timeAgo(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Map a 0..100 score to a color (green/amber/red).
 */
export function scoreColor(score: number): "green" | "amber" | "red" {
  if (score >= 75) return "red";
  if (score >= 50) return "amber";
  return "green";
}

/**
 * Map a 0..100 score to a hex color (for SVG/canvas).
 */
export function scoreHex(score: number): string {
  if (score >= 75) return "#ef4444";
  if (score >= 50) return "#f59e0b";
  if (score >= 25) return "#3b82f6";
  return "#22c55e";
}

/**
 * Truncate text with ellipsis.
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1).trimEnd() + "…";
}

/**
 * Unique id helper (for React keys, aria-ids).
 */
let _idCounter = 0;
export function uid(prefix = "id"): string {
  _idCounter += 1;
  return `${prefix}-${_idCounter}-${Date.now().toString(36)}`;
}
