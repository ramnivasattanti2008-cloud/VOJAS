/**
 * M18: Export Service — CSV generation utilities
 */

import type { Response } from 'express';

// ── CSV Utilities ────────────────────────────────────────────────────────────────

/**
 * Escape a value for CSV: wrap in quotes if contains comma/quote/newline, double internal quotes.
 */
export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Convert an array of flat objects to a CSV string. */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const columns = Object.keys(rows[0]);
  const header = columns.map(escapeCsvValue).join(',');
  const body = rows
    .map(row => columns.map(col => escapeCsvValue(row[col])).join(','))
    .join('\n');
  return `${header}\n${body}`;
}

// ── HTTP Response Helpers ──────────────────────────────────────────────────────

export function sendCsv(res: Response, csv: string, filename: string): void {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-cache');
  res.send(csv);
}
