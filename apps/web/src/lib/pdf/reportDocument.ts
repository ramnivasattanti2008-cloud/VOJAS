/**
 * ReportDocument — the drawing engine behind every VOJAS PDF.
 *
 * Wraps jsPDF + jspdf-autotable in a small, typed, React-free builder:
 * a branded masthead, a running header and a provenance footer on every page,
 * a strict 4pt vertical rhythm, and tables that paginate instead of clipping.
 *
 * jsPDF is loaded with a dynamic import so ~400KB of PDF machinery stays out of
 * the initial client bundle and never runs during server rendering.
 */

import type { jsPDF, TextOptionsLight } from 'jspdf';
import type { CellHookData, HookData, Styles, UserOptions } from 'jspdf-autotable';

import {
  NOT_AVAILABLE,
  formatTimestamp,
  formatValue,
  isNonEmptyString,
  sanitizeForPdf,
} from './format';
import {
  PDF_COLORS,
  PDF_LAYOUT,
  PDF_TYPE,
  cloneColor,
  riskLevelColor,
  toneColor,
  type Rgb,
} from './theme';
import type {
  ReportDefinition,
  ReportMeta,
  ReportMetric,
  ReportSection,
  ReportTableSpec,
} from './types';

type AutoTableFn = (doc: jsPDF, options: UserOptions) => void;
type FontStyle = 'normal' | 'bold' | 'italic';

/**
 * Printed on every page. An AI risk score is evidence for human verification,
 * never proof of fraud — a report that leaves this out can be misread as an
 * accusation, so it is not configurable away.
 */
export const AI_DISCLAIMER =
  'AI risk scores and anomaly findings in this report are indicators that require human verification. ' +
  'They are not proof of fraud or wrongdoing. Verify against official MPLADS records before acting.';

const WORDMARK = 'VOJAS';
const WORDMARK_TAGLINE = 'MPLADS ANOMALY & FRAUD DETECTION';

export interface ParagraphOptions {
  size?: number;
  color?: Rgb;
  style?: FontStyle;
  /** Extra space after the paragraph. Defaults to the small gap. */
  spaceAfter?: number;
  indent?: number;
}

export class ReportDocument {
  private readonly doc: jsPDF;
  private readonly autoTable: AutoTableFn;
  private readonly meta: ReportMeta;
  private readonly generatedAt: Date;

  private readonly pageWidth: number;
  private readonly pageHeight: number;
  private readonly left: number;
  private readonly right: number;
  private readonly contentWidth: number;
  private readonly contentBottom: number;

  private cursorY: number;
  private finalized = false;

  /** @internal Use {@link createReportDocument}. */
  constructor(doc: jsPDF, autoTable: AutoTableFn, meta: ReportMeta) {
    this.doc = doc;
    this.autoTable = autoTable;
    this.meta = meta;
    this.generatedAt = meta.generatedAt ?? new Date();

    this.pageWidth = doc.internal.pageSize.getWidth();
    this.pageHeight = doc.internal.pageSize.getHeight();
    this.left = PDF_LAYOUT.marginX;
    this.right = this.pageWidth - PDF_LAYOUT.marginX;
    this.contentWidth = this.right - this.left;
    this.contentBottom = this.pageHeight - PDF_LAYOUT.footerZone;
    this.cursorY = PDF_LAYOUT.firstPageTop;

    this.doc.setProperties({
      title: `${meta.title} — VOJAS ${meta.documentKind}`,
      subject: meta.subtitle ?? meta.documentKind,
      author: 'VOJAS',
      creator: 'VOJAS — MPLADS anomaly and fraud detection',
      keywords: ['VOJAS', 'MPLADS', meta.documentKind].join(', '),
    });
  }

  // ── Cursor and pagination ───────────────────────────────────────────────────

  get y(): number {
    return this.cursorY;
  }

  get width(): number {
    return this.contentWidth;
  }

  /** Remaining drawable height on the current page. */
  private get remaining(): number {
    return this.contentBottom - this.cursorY;
  }

  addPage(): void {
    this.doc.addPage();
    this.cursorY = PDF_LAYOUT.runningPageTop;
  }

  /** Breaks to a new page when `height` would not fit in the content area. */
  ensureSpace(height: number): void {
    if (this.remaining < height) this.addPage();
  }

  spacer(height: number): void {
    this.cursorY += height;
  }

  divider(): void {
    this.ensureSpace(PDF_LAYOUT.gap.md);
    this.doc.setDrawColor(...PDF_COLORS.hairline);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.left, this.cursorY, this.right, this.cursorY);
    this.cursorY += PDF_LAYOUT.gap.md;
  }

  // ── Text primitives ─────────────────────────────────────────────────────────

  private setType(size: number, style: FontStyle, color: Rgb): void {
    this.doc.setFont('helvetica', style);
    this.doc.setFontSize(size);
    this.doc.setTextColor(color[0], color[1], color[2]);
  }

  /** Every string drawn passes through the sanitizer, so no glyph can garble. */
  private write(text: string, x: number, y: number, options?: TextOptionsLight): void {
    this.doc.text(sanitizeForPdf(text), x, y, { baseline: 'top', ...options });
  }

  private wrap(text: string, maxWidth: number): string[] {
    // jsPDF types splitTextToSize as `any`; normalise it to a real string[].
    const result: unknown = this.doc.splitTextToSize(sanitizeForPdf(text), maxWidth);
    if (Array.isArray(result)) return (result as unknown[]).map((line) => String(line));
    return [String(result)];
  }

  private measure(text: string, charSpace = 0): number {
    const raw = sanitizeForPdf(text);
    return this.doc.getTextWidth(raw) + charSpace * Math.max(0, raw.length - 1);
  }

  private truncateToWidth(text: string, maxWidth: number, charSpace = 0): string {
    if (this.measure(text, charSpace) <= maxWidth) return text;
    let candidate = text;
    while (candidate.length > 1 && this.measure(`${candidate}...`, charSpace) > maxWidth) {
      candidate = candidate.slice(0, -1);
    }
    return `${candidate.trimEnd()}...`;
  }

  /** Shrinks the font (never below `minSize`) so a value fits its column. */
  private fittedSize(text: string, maxWidth: number, baseSize: number, minSize: number): number {
    let size = baseSize;
    this.doc.setFontSize(size);
    while (size > minSize && this.doc.getTextWidth(sanitizeForPdf(text)) > maxWidth) {
      size -= 0.5;
      this.doc.setFontSize(size);
    }
    return size;
  }

  // ── Blocks ──────────────────────────────────────────────────────────────────

  /** Page-1 title block: eyebrow, title, subtitle, rule. */
  beginDocument(): void {
    const { meta } = this;
    this.cursorY = PDF_LAYOUT.firstPageTop;

    if (isNonEmptyString(meta.scopeLabel)) {
      this.setType(PDF_TYPE.label, 'bold', cloneColor(PDF_COLORS.accent));
      this.write(this.truncateToWidth(meta.scopeLabel.toUpperCase(), this.contentWidth, 0.8), this.left, this.cursorY, {
        charSpace: 0.8,
      });
      this.cursorY += PDF_TYPE.label + 7;
    }

    this.setType(PDF_TYPE.title, 'bold', cloneColor(PDF_COLORS.ink));
    for (const line of this.wrap(meta.title, this.contentWidth)) {
      this.ensureSpace(PDF_TYPE.title * 1.32);
      this.setType(PDF_TYPE.title, 'bold', cloneColor(PDF_COLORS.ink));
      this.write(line, this.left, this.cursorY);
      this.cursorY += PDF_TYPE.title * 1.32;
    }

    if (isNonEmptyString(meta.subtitle)) {
      this.cursorY += PDF_LAYOUT.gap.xs;
      this.setType(PDF_TYPE.subtitle, 'normal', cloneColor(PDF_COLORS.muted));
      for (const line of this.wrap(meta.subtitle, this.contentWidth)) {
        this.ensureSpace(PDF_TYPE.subtitle * 1.4);
        this.setType(PDF_TYPE.subtitle, 'normal', cloneColor(PDF_COLORS.muted));
        this.write(line, this.left, this.cursorY);
        this.cursorY += PDF_TYPE.subtitle * 1.4;
      }
    }

    this.cursorY += PDF_LAYOUT.gap.md;
    this.doc.setDrawColor(...PDF_COLORS.hairline);
    this.doc.setLineWidth(0.75);
    this.doc.line(this.left, this.cursorY, this.right, this.cursorY);
    this.cursorY += PDF_LAYOUT.gap.lg;
  }

  sectionHeading(title: string, note?: string | null): void {
    // Pull the heading to the next page rather than orphaning it at the bottom.
    this.ensureSpace(PDF_LAYOUT.gap.xl + 40);

    const headingTop = this.cursorY;
    this.setType(PDF_TYPE.sectionHeading, 'bold', cloneColor(PDF_COLORS.ink));
    const noteWidth = isNonEmptyString(note) ? this.contentWidth * 0.38 : 0;
    const titleWidth = this.contentWidth - noteWidth - (noteWidth > 0 ? PDF_LAYOUT.gap.md : 0);
    this.write(this.truncateToWidth(title.toUpperCase(), titleWidth, 0.6), this.left, headingTop, {
      charSpace: 0.6,
    });

    if (isNonEmptyString(note)) {
      this.setType(PDF_TYPE.small, 'normal', cloneColor(PDF_COLORS.muted));
      this.write(this.truncateToWidth(note, noteWidth), this.right, headingTop + 1, { align: 'right' });
    }

    this.cursorY = headingTop + PDF_TYPE.sectionHeading + 7;
    this.doc.setDrawColor(...PDF_COLORS.ink);
    this.doc.setLineWidth(1);
    this.doc.line(this.left, this.cursorY, this.left + 28, this.cursorY);
    this.doc.setDrawColor(...PDF_COLORS.hairline);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.left + 28, this.cursorY, this.right, this.cursorY);
    this.cursorY += PDF_LAYOUT.gap.md;
  }

  paragraph(text: string, options?: ParagraphOptions): void {
    const size = options?.size ?? PDF_TYPE.body;
    const style = options?.style ?? 'normal';
    const color = options?.color ?? cloneColor(PDF_COLORS.inkSoft);
    const indent = options?.indent ?? 0;
    const lineHeight = size * 1.45;

    this.setType(size, style, color);
    const lines = this.wrap(text, this.contentWidth - indent);
    for (const line of lines) {
      this.ensureSpace(lineHeight);
      this.setType(size, style, color);
      this.write(line, this.left + indent, this.cursorY);
      this.cursorY += lineHeight;
    }
    this.cursorY += options?.spaceAfter ?? PDF_LAYOUT.gap.sm;
  }

  /** Small uppercase label followed by a wrapped value. Missing text is explicit. */
  labelledParagraph(label: string, text: string | null | undefined): void {
    this.ensureSpace(28);
    this.setType(PDF_TYPE.label, 'bold', cloneColor(PDF_COLORS.muted));
    this.write(label.toUpperCase(), this.left, this.cursorY, { charSpace: 0.5 });
    this.cursorY += PDF_TYPE.label + 5;
    const present = isNonEmptyString(text);
    this.paragraph(present ? text.trim() : NOT_AVAILABLE, {
      size: PDF_TYPE.small,
      style: present ? 'normal' : 'italic',
      color: present ? cloneColor(PDF_COLORS.inkSoft) : cloneColor(PDF_COLORS.faint),
      spaceAfter: PDF_LAYOUT.gap.md,
    });
  }

  /**
   * Headline tiles. Values that are unavailable are rendered in italic grey
   * "Not available" — never as a zero, which would read as a real measurement.
   */
  metrics(items: ReportMetric[], columns = 4): void {
    if (items.length === 0) return;

    const columnCount = Math.max(1, Math.min(columns, items.length));
    const gap = 10;
    const tileWidth = (this.contentWidth - gap * (columnCount - 1)) / columnCount;
    const hasCaption = items.some((item) => isNonEmptyString(item.caption));
    const tileHeight = hasCaption ? 64 : 52;

    for (let index = 0; index < items.length; index += columnCount) {
      const row = items.slice(index, index + columnCount);
      this.ensureSpace(tileHeight + gap);
      const top = this.cursorY;

      row.forEach((item, columnIndex) => {
        const x = this.left + columnIndex * (tileWidth + gap);
        this.doc.setFillColor(...PDF_COLORS.surface);
        this.doc.setDrawColor(...PDF_COLORS.hairline);
        this.doc.setLineWidth(0.5);
        this.doc.roundedRect(x, top, tileWidth, tileHeight, 5, 5, 'FD');

        const innerWidth = tileWidth - 20;
        this.setType(PDF_TYPE.label, 'bold', cloneColor(PDF_COLORS.muted));
        this.write(this.truncateToWidth(item.label.toUpperCase(), innerWidth, 0.4), x + 10, top + 10, {
          charSpace: 0.4,
        });

        const text = formatValue(item.value, item.format);
        const unavailable = text === NOT_AVAILABLE;
        const valueColor = unavailable ? cloneColor(PDF_COLORS.faint) : toneColor(item.tone);
        this.setType(PDF_TYPE.metricValue, unavailable ? 'italic' : 'bold', valueColor);
        const size = this.fittedSize(text, innerWidth, PDF_TYPE.metricValue, 8);
        this.setType(size, unavailable ? 'italic' : 'bold', valueColor);
        this.write(this.truncateToWidth(text, innerWidth), x + 10, top + 24);

        if (isNonEmptyString(item.caption)) {
          this.setType(PDF_TYPE.micro, 'normal', cloneColor(PDF_COLORS.faint));
          this.write(this.truncateToWidth(item.caption, innerWidth), x + 10, top + 46);
        }
      });

      this.cursorY = top + tileHeight + gap;
    }

    this.cursorY += PDF_LAYOUT.gap.xs;
  }

  /** Two-column label/value list. Paginates through autoTable. */
  definitions(items: ReportDefinition[]): void {
    if (items.length === 0) return;
    this.table(
      {
        columns: [
          { key: 'label', header: 'Field', width: 148 },
          { key: 'value', header: 'Value' },
        ],
        rows: items.map((item) => ({
          label: item.label,
          value: formatValue(item.value, item.format),
        })),
      },
      { showHead: false, labelColumn: 0 }
    );
  }

  /**
   * Data table. Empty input renders an honest empty state instead of a
   * zero-filled table; long tables repeat the header and break across pages.
   */
  table(
    spec: ReportTableSpec,
    options?: { showHead?: boolean; labelColumn?: number }
  ): void {
    const columns = spec.columns ?? [];
    const rows = spec.rows ?? [];

    if (columns.length === 0 || rows.length === 0) {
      this.emptyState(spec.emptyMessage ?? 'No data available', spec.emptyDetail);
      if (isNonEmptyString(spec.note)) this.tableNote(spec.note);
      return;
    }

    const showHead = options?.showHead !== false;
    const labelColumn = options?.labelColumn;

    const head = showHead ? [columns.map((column) => sanitizeForPdf(column.header))] : undefined;
    const body = rows.map((row) =>
      columns.map((column) => sanitizeForPdf(formatValue(row[column.key], column.format)))
    );

    const columnStyles: Record<string, Partial<Styles>> = {};
    columns.forEach((column, index) => {
      const style: Partial<Styles> = {};
      if (typeof column.width === 'number') style.cellWidth = column.width;
      if (column.align) style.halign = column.align;
      if (index === labelColumn) {
        style.textColor = cloneColor(PDF_COLORS.muted);
      }
      if (Object.keys(style).length > 0) columnStyles[String(index)] = style;
    });

    // Leave room for the header plus at least one row before starting.
    this.ensureSpace(72);

    let finalY = this.cursorY;

    this.autoTable(this.doc, {
      head,
      body,
      startY: this.cursorY,
      theme: 'striped',
      pageBreak: 'auto',
      rowPageBreak: 'avoid',
      margin: {
        top: PDF_LAYOUT.runningPageTop,
        bottom: PDF_LAYOUT.footerZone,
        left: this.left,
        right: PDF_LAYOUT.marginX,
      },
      tableWidth: this.contentWidth,
      styles: {
        font: 'helvetica',
        fontSize: PDF_TYPE.tableBody,
        textColor: cloneColor(PDF_COLORS.ink),
        lineWidth: 0,
        cellPadding: { top: 6, right: 8, bottom: 6, left: 8 },
        overflow: 'linebreak',
        valign: 'middle',
      },
      headStyles: {
        fillColor: cloneColor(PDF_COLORS.navy),
        textColor: cloneColor(PDF_COLORS.white),
        fontStyle: 'bold',
        fontSize: PDF_TYPE.tableHead,
        cellPadding: { top: 7, right: 8, bottom: 7, left: 8 },
      },
      alternateRowStyles: { fillColor: cloneColor(PDF_COLORS.zebra) },
      columnStyles,
      didParseCell: (data: CellHookData) => {
        if (data.section !== 'body') return;
        const column = columns[data.column.index];
        const text = data.cell.text.join(' ').trim();
        if (text === NOT_AVAILABLE) {
          data.cell.styles.textColor = cloneColor(PDF_COLORS.faint);
          data.cell.styles.fontStyle = 'italic';
          return;
        }
        if (!column) return;
        if (column.emphasis === 'risk') {
          data.cell.styles.textColor = riskLevelColor(text);
          data.cell.styles.fontStyle = 'bold';
        } else if (column.emphasis === 'strong') {
          data.cell.styles.fontStyle = 'bold';
        }
      },
      didDrawCell: (data: CellHookData) => {
        finalY = data.cell.y + data.cell.height;
      },
      didDrawPage: (data: HookData) => {
        if (data.cursor) finalY = data.cursor.y;
      },
    });

    this.cursorY = finalY + PDF_LAYOUT.gap.md;
    if (isNonEmptyString(spec.note)) this.tableNote(spec.note);
  }

  private tableNote(note: string): void {
    this.paragraph(note, {
      size: PDF_TYPE.micro,
      color: cloneColor(PDF_COLORS.faint),
      spaceAfter: PDF_LAYOUT.gap.md,
    });
  }

  /** The honest alternative to a padded table. */
  emptyState(message: string, detail?: string | null): void {
    const height = isNonEmptyString(detail) ? 58 : 44;
    this.ensureSpace(height + PDF_LAYOUT.gap.sm);
    const top = this.cursorY;

    this.doc.setFillColor(...PDF_COLORS.surface);
    this.doc.setDrawColor(...PDF_COLORS.hairline);
    this.doc.setLineWidth(0.75);
    this.doc.setLineDashPattern([3, 3], 0);
    this.doc.roundedRect(this.left, top, this.contentWidth, height, 5, 5, 'FD');
    this.doc.setLineDashPattern([], 0);

    const centerX = this.left + this.contentWidth / 2;
    this.setType(PDF_TYPE.small, 'bold', cloneColor(PDF_COLORS.muted));
    this.write(this.truncateToWidth(message, this.contentWidth - 32), centerX, top + 14, {
      align: 'center',
    });

    if (isNonEmptyString(detail)) {
      this.setType(PDF_TYPE.micro, 'normal', cloneColor(PDF_COLORS.faint));
      this.write(this.truncateToWidth(detail, this.contentWidth - 32), centerX, top + 32, {
        align: 'center',
      });
    }

    this.cursorY = top + height + PDF_LAYOUT.gap.md;
  }

  /** Accent-barred note block — used for caveats, limitations and disclaimers. */
  callout(options: { title?: string; body: string; tone?: ReportMetric['tone'] }): void {
    const accent = toneColor(options.tone ?? 'accent');
    const padding = 12;
    const bodySize = PDF_TYPE.small;
    const bodyLineHeight = bodySize * 1.45;
    const innerWidth = this.contentWidth - padding * 2 - 3;

    this.setType(bodySize, 'normal', cloneColor(PDF_COLORS.inkSoft));
    const lines = this.wrap(options.body, innerWidth);
    const titleHeight = isNonEmptyString(options.title) ? PDF_TYPE.label + 6 : 0;
    const height = padding * 2 + titleHeight + lines.length * bodyLineHeight;

    const usable = this.contentBottom - PDF_LAYOUT.runningPageTop;
    if (height > usable) {
      // Too tall to box without clipping — degrade to plain text, never clip.
      if (isNonEmptyString(options.title)) {
        this.labelledParagraph(options.title, options.body);
      } else {
        this.paragraph(options.body, { size: bodySize, color: cloneColor(PDF_COLORS.inkSoft) });
      }
      return;
    }

    this.ensureSpace(height + PDF_LAYOUT.gap.sm);
    const top = this.cursorY;

    this.doc.setFillColor(...PDF_COLORS.surface);
    this.doc.rect(this.left, top, this.contentWidth, height, 'F');
    this.doc.setFillColor(accent[0], accent[1], accent[2]);
    this.doc.rect(this.left, top, 3, height, 'F');

    let textTop = top + padding;
    if (isNonEmptyString(options.title)) {
      this.setType(PDF_TYPE.label, 'bold', accent);
      this.write(this.truncateToWidth(options.title.toUpperCase(), innerWidth, 0.5), this.left + padding + 3, textTop, {
        charSpace: 0.5,
      });
      textTop += titleHeight;
    }

    this.setType(bodySize, 'normal', cloneColor(PDF_COLORS.inkSoft));
    for (const line of lines) {
      this.write(line, this.left + padding + 3, textTop);
      textTop += bodyLineHeight;
    }

    this.cursorY = top + height + PDF_LAYOUT.gap.md;
  }

  /** Renders a declarative section: heading, prose, tiles, definitions, table. */
  section(section: ReportSection): void {
    this.sectionHeading(section.title, section.headingNote);
    if (isNonEmptyString(section.description)) {
      this.paragraph(section.description, {
        size: PDF_TYPE.small,
        color: cloneColor(PDF_COLORS.muted),
        spaceAfter: PDF_LAYOUT.gap.md,
      });
    }
    if (section.metrics && section.metrics.length > 0) this.metrics(section.metrics);
    if (section.definitions && section.definitions.length > 0) this.definitions(section.definitions);
    if (section.table) this.table(section.table);
    if (isNonEmptyString(section.note)) {
      this.paragraph(section.note, {
        size: PDF_TYPE.micro,
        color: cloneColor(PDF_COLORS.faint),
        spaceAfter: PDF_LAYOUT.gap.md,
      });
    }
    this.cursorY += PDF_LAYOUT.gap.sm;
  }

  // ── Page chrome ─────────────────────────────────────────────────────────────

  private drawMasthead(): void {
    this.doc.setFillColor(...PDF_COLORS.navy);
    this.doc.rect(0, 0, this.pageWidth, PDF_LAYOUT.mastheadHeight, 'F');
    this.doc.setFillColor(...PDF_COLORS.accent);
    this.doc.rect(0, PDF_LAYOUT.mastheadHeight, this.pageWidth, PDF_LAYOUT.accentBarHeight, 'F');

    // Mark: an accent tile carrying the initial, drawn from primitives only.
    this.doc.setFillColor(...PDF_COLORS.accent);
    this.doc.roundedRect(this.left, 26, 20, 20, 5, 5, 'F');
    this.setType(11, 'bold', cloneColor(PDF_COLORS.white));
    this.doc.text('V', this.left + 10, 36.5, { align: 'center', baseline: 'middle' });

    const textLeft = this.left + 30;
    this.setType(PDF_TYPE.wordmark, 'bold', cloneColor(PDF_COLORS.white));
    this.write(WORDMARK, textLeft, 26, { charSpace: 2 });

    this.setType(PDF_TYPE.label, 'normal', cloneColor(PDF_COLORS.faint));
    this.write(WORDMARK_TAGLINE, textLeft, 50, { charSpace: 0.7 });

    this.setType(PDF_TYPE.documentKind, 'bold', cloneColor(PDF_COLORS.accentOnDark));
    this.write(this.meta.documentKind.toUpperCase(), this.right, 28, {
      align: 'right',
      charSpace: 1.2,
    });

    this.setType(PDF_TYPE.label, 'normal', cloneColor(PDF_COLORS.faint));
    this.write(`Generated ${formatTimestamp(this.generatedAt)}`, this.right, 50, { align: 'right' });
  }

  private drawRunningHeader(): void {
    this.setType(PDF_TYPE.body, 'bold', cloneColor(PDF_COLORS.navy));
    this.write(WORDMARK, this.left, 34, { charSpace: 1.4 });

    this.setType(PDF_TYPE.small, 'normal', cloneColor(PDF_COLORS.muted));
    const label = `${this.meta.documentKind} — ${this.meta.title}`;
    this.write(this.truncateToWidth(label, this.contentWidth * 0.7), this.right, 35, {
      align: 'right',
    });

    this.doc.setDrawColor(...PDF_COLORS.hairline);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.left, 54, this.right, 54);
  }

  private drawFooter(pageNumber: number, pageCount: number): void {
    const ruleY = this.pageHeight - 58;
    this.doc.setDrawColor(...PDF_COLORS.hairline);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.left, ruleY, this.right, ruleY);

    const source = isNonEmptyString(this.meta.dataSource)
      ? this.meta.dataSource.trim()
      : 'Not specified';

    this.setType(PDF_TYPE.footer, 'normal', cloneColor(PDF_COLORS.muted));
    const pageLabel = `Page ${pageNumber} of ${pageCount}`;
    const pageLabelWidth = this.measure(pageLabel);
    this.write(
      this.truncateToWidth(`Source: ${source}`, this.contentWidth - pageLabelWidth - 16),
      this.left,
      ruleY + 8
    );
    this.write(pageLabel, this.right, ruleY + 8, { align: 'right' });

    this.setType(PDF_TYPE.micro, 'normal', cloneColor(PDF_COLORS.faint));
    const lines = this.wrap(AI_DISCLAIMER, this.contentWidth).slice(0, 2);
    let y = ruleY + 20;
    for (const line of lines) {
      this.write(line, this.left, y);
      y += PDF_TYPE.micro * 1.35;
    }
  }

  /** Draws the masthead, running headers and footers across every page, once. */
  private finalize(): void {
    if (this.finalized) return;
    this.finalized = true;

    const pageCount = this.doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      this.doc.setPage(page);
      if (page === 1) {
        this.drawMasthead();
      } else {
        this.drawRunningHeader();
      }
      this.drawFooter(page, pageCount);
    }
  }

  // ── Output ──────────────────────────────────────────────────────────────────

  /** Triggers a real browser download. Returns the filename that was used. */
  async save(filename: string): Promise<string> {
    this.finalize();
    await this.doc.save(filename, { returnPromise: true });
    return filename;
  }

  /** For previews or uploads — same bytes, no download. */
  toBlob(): Blob {
    this.finalize();
    return this.doc.output('blob');
  }
}

/**
 * Creates a report document with page chrome ready and the cursor parked below
 * the page-1 masthead. jsPDF is imported lazily, so this must be called from a
 * browser context (a click handler, not a server component).
 */
export async function createReportDocument(meta: ReportMeta): Promise<ReportDocument> {
  const [jspdfModule, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jspdfModule.jsPDF({
    unit: 'pt',
    format: 'a4',
    orientation: meta.orientation === 'landscape' ? 'landscape' : 'portrait',
    compress: true,
  });

  const report = new ReportDocument(doc, autoTableModule.default, meta);
  report.beginDocument();
  return report;
}
