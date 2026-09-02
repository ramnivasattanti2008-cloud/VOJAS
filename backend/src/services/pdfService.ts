/**
 * PDF Report Service (Phase 13).
 * Generates a structured project status report as a PDF using pdfkit.
 * The report covers: project metadata, financial summary, risk score,
 * anomaly overview, and timeline.
 */

import PDFDocument from "pdfkit";
import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";
import type { Readable } from "stream";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtINR(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)} K`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

function fmtDate(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function section(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.8);
  doc.fontSize(13).font("Helvetica-Bold").fillColor("#1e293b")
    .text(title, { underline: true });
  doc.moveDown(0.3);
}

function row(doc: PDFKit.PDFDocument, label: string, value: string) {
  doc.fontSize(10).font("Helvetica-Bold").fillColor("#64748b")
    .text(`${label}:`, { continued: true });
  doc.font("Helvetica").fillColor("#334155")
    .text(` ${value}`);
}

function badge(doc: PDFKit.PDFDocument, label: string, color: string) {
  doc.rect(doc.x, doc.y, label.length * 5 + 8, 14)
    .fill(color);
  doc.fillColor("#fff").fontSize(8).font("Helvetica-Bold")
    .text(label, doc.x + 4, doc.y + 3);
  doc.x += label.length * 5 + 16;
}

// ── Main Generator ──────────────────────────────────────────────────────────

export async function generateProjectPDF(projectId: string): Promise<Buffer> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      expenditures: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      anomalies: {
        orderBy: { createdAt: "desc" },
      },
      risk: true,
      satelliteObservations: {
        orderBy: { observationDate: "desc" },
        take: 5,
      },
      progressObservations: {
        where: { reportSource: "VOJAS_VERIFICATION" },
        orderBy: { reportDate: "desc" },
        take: 3,
      },
    },
  });

  if (!project) {
    throw new AppError(404, "NOT_FOUND", "Project not found");
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const buffers: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    // ── Header ────────────────────────────────────────────────────────────────
    const pageW = doc.page.width - 100;

    doc.rect(50, 50, pageW, 60).fill("#0f172a");
    doc.fontSize(20).font("Helvetica-Bold").fillColor("#fff")
      .text("VOJAS", 60, 65);
    doc.fontSize(10).font("Helvetica").fillColor("#94a3b8")
      .text("Project Status Report", 60, 88);
    doc.fontSize(8).fillColor("#64748b")
      .text(`Generated: ${fmtDate(new Date())}`, pageW - 160, 65);

    doc.moveDown(4);

    // ── Project Identity ──────────────────────────────────────────────────────
    section(doc, "Project Information");
    doc.fontSize(10).font("Helvetica").fillColor("#334155");
    row(doc, "Name", project.name);
    row(doc, "Sector", project.sector.replace(/_/g, " "));
    row(doc, "District", project.district);
    row(doc, "State", project.state);
    if (project.constituency) row(doc, "Constituency", project.constituency);
    row(doc, "Status", project.status.replace(/_/g, " "));
    if (project.contractor) row(doc, "Contractor", project.contractor);
    row(doc, "Created", fmtDate(project.createdAt));

    // ── Financial Summary ─────────────────────────────────────────────────────
    section(doc, "Financial Summary");

    const utilization = project.approvedAmount > 0
      ? Math.round((project.spentAmount / project.approvedAmount) * 100)
      : 0;
    const remaining = project.approvedAmount - project.spentAmount;

    doc.fontSize(11).font("Helvetica-Bold").fillColor("#0f172a");
    doc.text("Budget Overview:", { continued: true });
    doc.font("Helvetica").fillColor("#334155")
      .text(` Approved: ${fmtINR(project.approvedAmount)}  |  Spent: ${fmtINR(project.spentAmount)}  |  Remaining: ${fmtINR(remaining)}  |  Utilized: ${utilization}%`);

    doc.moveDown(0.5);
    // Utilization bar (text-based)
    const barLen = 50;
    const filled = Math.round((utilization / 100) * barLen);
    const bar = "█".repeat(filled) + "░".repeat(barLen - filled);
    doc.fontSize(9).font("Courier").fillColor(utilization > 100 ? "#ef4444" : "#10b981")
      .text(`[${bar}] ${utilization}%`, 50, doc.y, { continued: false });

    doc.moveDown(0.5);
    if (project.startDate) row(doc, "Start Date", fmtDate(project.startDate));
    if (project.expectedEndDate) row(doc, "Expected Completion", fmtDate(project.expectedEndDate));
    if (project.completedAt) row(doc, "Completed", fmtDate(project.completedAt));

    // ── Expenditures ─────────────────────────────────────────────────────────
    if (project.expenditures.length > 0) {
      section(doc, `Recent Expenditures (${project.expenditures.length})`);
      doc.fontSize(9).font("Helvetica");

      for (const exp of project.expenditures.slice(0, 10)) {
        const date = fmtDate(exp.paidOn ?? exp.createdAt);
        doc.fillColor("#334155")
          .text(`${fmtINR(exp.amount)}  ${exp.category.replace(/_/g, " ")}  ${exp.description}  ${date}`, {
            continued: false,
          });
      }
    }

    // ── Anomalies ───────────────────────────────────────────────────────────
    if (project.anomalies.length > 0) {
      section(doc, `Anomaly Overview (${project.anomalies.length} detected)`);

      const open = project.anomalies.filter(a => ["OPEN", "ACKNOWLEDGED", "UNDER_INVESTIGATION"].includes(a.status)).length;
      const critical = project.anomalies.filter(a => a.severity === "CRITICAL").length;

      row(doc, "Open", String(open));
      row(doc, "Critical", String(critical));
      doc.moveDown(0.3);

      doc.fontSize(9).font("Helvetica").fillColor("#334155");
      for (const anomaly of project.anomalies.slice(0, 8)) {
        doc.text(`• [${anomaly.severity}] ${anomaly.category.replace(/_/g, " ")}: ${anomaly.title}`, {
          continued: false,
        });
      }
    }

    // ── Risk Score ──────────────────────────────────────────────────────────
    if (project.risk) {
      section(doc, "Risk Assessment");
      const r = project.risk;
      const levelColor = r.riskLevel === "CRITICAL" ? "#ef4444"
        : r.riskLevel === "HIGH" ? "#f97316"
        : r.riskLevel === "MEDIUM" ? "#eab308"
        : "#10b981";

      row(doc, "Overall Score", `${r.overallScore} / 100`);
      row(doc, "Risk Level", r.riskLevel);
      doc.fontSize(10).font("Helvetica-Bold").fillColor(levelColor)
        .text(`  ${r.riskLevel}`, { continued: false });

      if (r.factors) {
        try {
          const factors = JSON.parse(r.factors) as Array<{ code: string; label: string; points: number }>;
          doc.moveDown(0.3);
          for (const f of factors) {
            doc.fontSize(9).font("Helvetica").fillColor("#64748b")
              .text(`  ${f.label}: +${f.points} pts`);
          }
        } catch { /* ignore parse errors */ }
      }
    }

    // ── Satellite / Earth Observation ────────────────────────────────────────
    if (project.satelliteObservations.length > 0) {
      section(doc, "Satellite Monitoring (Sentinel-2 L2A)");

      const latestObs = project.satelliteObservations[0];
      if (latestObs) {
        row(doc, "Latest Observation", fmtDate(latestObs.observationDate));
        row(doc, "Cloud Cover", `${latestObs.cloudCover}%`);
        row(doc, "Source", latestObs.sourceName ?? "CDSE");
        if (latestObs.ndvi !== null) row(doc, "NDVI", latestObs.ndvi.toFixed(3));
        if (latestObs.ndbii !== null) row(doc, "NDBI", latestObs.ndbii.toFixed(3));
        if (latestObs.builtUpArea !== null) row(doc, "Built-up Area", `${(latestObs.builtUpArea / 1000).toFixed(1)}K m²`);
        if (latestObs.constructionScore !== null) row(doc, "Construction Score", `${latestObs.constructionScore}/100`);
      }

      doc.moveDown(0.4);
      doc.fontSize(9).font("Helvetica").fillColor("#64748b")
        .text(`Total observations available: ${project.satelliteObservations.length}. Latest observation: ${fmtDate(latestObs.observationDate)}.`, {
          continued: false,
        });
    }

    // ── Verification Results ───────────────────────────────────────────────────
    if (project.progressObservations.length > 0) {
      section(doc, "Verification History (VOJAS Rule Engine)");

      for (const verification of project.progressObservations.slice(0, 3)) {
        const statusColor = verification.verificationResult === "CONSISTENT" ? "#10b981"
          : verification.verificationResult === "POTENTIAL_DISCREPANCY" ? "#ef4444"
          : "#64748b";
        doc.fontSize(10).font("Helvetica-Bold").fillColor(statusColor)
          .text(`  ${verification.verificationResult ?? "—"}`, { continued: false });
        doc.fontSize(9).font("Helvetica").fillColor("#64748b");
        if (verification.confidenceLevel) doc.text(`  Confidence: ${verification.confidenceLevel}`);
        if (verification.explanation) {
          // Truncate to 200 chars to fit in PDF
          const truncated = verification.explanation.slice(0, 200) + (verification.explanation.length > 200 ? "…" : "");
          doc.text(`  ${truncated}`);
        }
        doc.moveDown(0.3);
      }
    }
    doc.moveDown(2);
    doc.fontSize(8).font("Helvetica").fillColor("#94a3b8")
      .text("VOJAS — Accountability Platform for MPLAD Scheme", { align: "center" });
    doc.text("This report is generated automatically. AI scores indicate risk potential, not fraud.", { align: "center" });

    doc.end();
  });
}
