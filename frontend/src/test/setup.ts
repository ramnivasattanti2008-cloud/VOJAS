import "@testing-library/jest-dom";
import { vi } from "vitest";

// ── localStorage mock ──────────────────────────────────────────────────────
const storage: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value; },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
  get length() { return Object.keys(storage).length; },
  key: (i: number) => Object.keys(storage)[i] ?? null,
});

// ── crypto.randomUUID mock (used by React Router) ──────────────────────────
vi.stubGlobal("crypto", {
  randomUUID: () => Math.random().toString(36).slice(2),
  getRandomValues: (buf: Uint8Array) => {
    for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256);
    return buf;
  },
  subtle: {} as SubtleCrypto,
});

// ── IntersectionObserver mock (used by framer-motion) ──────────────────────
vi.stubGlobal("IntersectionObserver", vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})));

// ── ResizeObserver mock ────────────────────────────────────────────────────
vi.stubGlobal("ResizeObserver", vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})));
