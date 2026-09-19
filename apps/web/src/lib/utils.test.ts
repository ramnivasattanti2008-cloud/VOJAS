import { describe, expect, it } from 'vitest';
import { cn, formatBytes, formatCurrency, formatDate, formatDateTime } from './utils';

describe('cn', () => {
  it('joins plain class names', () => {
    expect(cn('px-2 py-1', 'text-red-500')).toBe('px-2 py-1 text-red-500');
  });

  it('drops falsy conditional classes', () => {
    const isHidden = 1 > 2;
    const isVisible = 2 > 1;
    expect(cn('base', isHidden && 'hidden', undefined, isVisible && 'visible')).toBe('base visible');
  });

  it('resolves conflicting Tailwind utilities to the last one', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});

describe('formatCurrency', () => {
  it('formats a whole-rupee amount with Indian digit grouping', () => {
    expect(formatCurrency(1000000)).toBe('₹10,00,000');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('₹0');
  });

  it('returns an em dash for null', () => {
    expect(formatCurrency(null)).toBe('—');
  });

  it('returns an em dash for undefined', () => {
    expect(formatCurrency(undefined)).toBe('—');
  });
});

describe('formatDate', () => {
  it('formats an ISO date string', () => {
    expect(formatDate('2026-01-15T12:00:00Z')).toBe('15 Jan 2026');
  });

  it('returns an em dash for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('returns an em dash for an empty string', () => {
    expect(formatDate('')).toBe('—');
  });
});

describe('formatDateTime', () => {
  it('formats an ISO date string with time', () => {
    expect(formatDateTime('2026-01-15T12:00:00Z')).toBe('15 Jan 2026, 5:30 pm');
  });

  it('returns an em dash for null', () => {
    expect(formatDateTime(null)).toBe('—');
  });
});

describe('formatBytes', () => {
  it('special-cases zero', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('returns an em dash for null', () => {
    expect(formatBytes(null)).toBe('—');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1048576)).toBe('1.0 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1.0 GB');
  });
});
