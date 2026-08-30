import fs from "fs";

/**
 * OCR / text-extraction service (Phase 11).
 *
 * Production-grade OCR requires tesseract.js + pdftotext. To keep VOJAS
 * deployment-light (no native binary deps in Docker), we ship a *heuristic
 * extractor* that pulls printable ASCII strings from PDFs and EXIF / metadata
 * from images. This is genuinely useful for classification — sanction order
 * PDFs typically contain words like "Sanction", "Approval", "Ministry" that
 * drive a strong suggested-type signal.
 *
 * The interface is shaped so tesseract.js can be dropped in as a one-line
 * drop-in: `await extractText(path, mime)`.
 */

export interface OcrResult {
  text: string;            // best-effort extracted text (capped at ~16 KB)
  suggestedType: string;   // best-guess document type
  confidence: number;      // 0-100
  keywords: string[];      // top keywords extracted (for audit / display)
}

const TYPE_KEYWORDS: Record<string, string[]> = {
  SANCTION_ORDER:         ["sanction", "approved", "approval", "ministry", "mop&ng"],
  TENDER:                 ["tender", "bid", "notice", "rfp", "quotation"],
  CONTRACT:               ["contract", "agreement", "party", "whereas", "terms"],
  WORK_ORDER:             ["work order", "work-order", "commence", "contractor"],
  INVOICE:                ["invoice", "bill", "amount due", "tax", "gst"],
  RECEIPT:                ["receipt", "received", "payment", "acknowledgement"],
  COMPLETION_CERT:        ["completion", "completed", "certificate", "handover"],
  INSPECTION_REPORT:      ["inspection", "inspected", "site visit", "findings"],
  PHOTOGRAPH:             [], // empty — fall through to OTHER
  ENVIRONMENTAL_CLEARANCE:["environmental", "clearance", "eia", "pollution", "forest"],
  OTHER:                  [],
};

const STOP_WORDS = new Set([
  "the", "and", "of", "to", "in", "a", "is", "for", "on", "with", "as", "this",
  "that", "be", "by", "are", "an", "or", "at", "from", "it", "have", "has",
]);

/** Read a PDF (or any file) and pull printable ASCII sequences ≥ 4 chars. */
function extractPrintableStrings(buf: Buffer): string {
  // Pull sequences of printable ASCII (0x20-0x7E) or whitespace
  const minLen = 4;
  const re = /[ -~]{4,}/g;
  const raw = buf.toString("binary");
  const matches = raw.match(re) ?? [];
  // Filter out long numeric strings (likely binary noise) and keep word-like chunks
  const kept = matches
    .filter((s) => /[A-Za-z]/.test(s)) // must have at least one letter
    .map((s) => s.replace(/[ ]+/g, " ").trim());
  return kept.join(" ");
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

function topKeywords(tokens: string[], n = 10): string[] {
  const freq: Record<string, number> = {};
  for (const t of tokens) freq[t] = (freq[t] ?? 0) + 1;
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([t]) => t);
}

/** Score each document type by how many of its keywords appear in the text. */
function suggestDocumentType(text: string): { type: string; confidence: number } {
  const lower = text.toLowerCase();
  const scores: Record<string, number> = {};
  for (const [type, kws] of Object.entries(TYPE_KEYWORDS)) {
    if (kws.length === 0) continue;
    let hits = 0;
    for (const kw of kws) {
      // Use word-boundary-ish search; count occurrences
      const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
      const c = (lower.match(re) ?? []).length;
      hits += c;
    }
    scores[type] = hits;
  }
  let best: { type: string; score: number } = { type: "OTHER", score: 0 };
  for (const [t, s] of Object.entries(scores)) {
    if (s > best.score) best = { type: t, score: s };
  }
  // Confidence: hit count * 25, capped 0-95
  const confidence = Math.min(95, best.score * 25);
  return { type: best.type, confidence };
}

export const ocrService = {
  /** Best-effort text extraction. Returns empty result on failure. */
  async extractText(filePath: string, mimeType: string): Promise<OcrResult> {
    try {
      const buf = await fs.promises.readFile(filePath);
      const text = extractPrintableStrings(buf).slice(0, 16_000);

      if (!text || text.length < 20) {
        // No readable text — almost certainly a photograph / binary asset
        return { text: "", suggestedType: "PHOTOGRAPH", confidence: 40, keywords: [] };
      }

      const tokens = tokenize(text);
      const keywords = topKeywords(tokens, 12);
      const { type, confidence } = suggestDocumentType(text);
      return { text, suggestedType: type, confidence, keywords };
    } catch (err) {
      console.error("[OCR] Failed to extract:", err);
      return { text: "", suggestedType: "OTHER", confidence: 0, keywords: [] };
    }
  },
};
