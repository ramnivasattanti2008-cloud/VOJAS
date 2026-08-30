// ─────────────────────────────────────────────────────────────────────────────
// Demo Tour Steps — 5-minute pitch walkthrough
// ─────────────────────────────────────────────────────────────────────────────

import type { LucideIcon } from "lucide-react";
import { Map, Shield, AlertTriangle, FileText } from "lucide-react";

export interface TourStep {
  id: string;
  /** Short title shown in the step card */
  title: string;
  /** Body copy shown below the title */
  body: string;
  /** Route to navigate to when the step is active */
  route: string;
  /** Lucide icon for this step */
  Icon: LucideIcon;
  /** Color token name (CSS var) */
  color: string;
  /** What to click on the page */
  callToAction: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "map",
    title: "Live Map — All 8 Projects",
    body: "Every MPLAD project in the demo dataset is plotted on a live Leaflet map with OpenStreetMap tiles. Zoom in to see individual markers. Use the risk filter chips to highlight only HIGH or CRITICAL projects. Click any marker to jump directly to the project detail.",
    route: "/map",
    Icon: Map,
    color: "text-electric-400",
    callToAction: "Click the Risk filter → HIGH to see flagged projects pulse in amber.",
  },
  {
    id: "risk",
    title: "4-Signal Risk Dashboard",
    body: "Each project gets a composite risk score built from four independent signals: Anomaly detection (40 pts), Financial analysis (25 pts), Citizen reports (20 pts), and Timeline evaluation (15 pts). Click 'Recalculate' on first load to populate all scores from live data.",
    route: "/risk",
    Icon: Shield,
    color: "text-red-400",
    callToAction: "Click 'Recalculate All' once. Then click any project row to see the 4-signal breakdown.",
  },
  {
    id: "anomalies",
    title: "6-Rule Anomaly Engine",
    body: "VOJAS runs six detection rules on every project: Duplicate projects, Cost outliers, Budget overruns, Timeline anomalies, Stalled work, and Geographic inconsistencies. Each flagged anomaly includes a full AI Verdict — confidence score, contributing factors, and an investigative recommendation.",
    route: "/anomalies",
    Icon: AlertTriangle,
    color: "text-amber-400",
    callToAction: "Click any anomaly row → scroll to 'AI Verdict' panel to see the confidence ring and contributing factors.",
  },
  {
    id: "reports",
    title: "Citizen Reporting with PII Redaction",
    body: "Citizens submit reports at /citizens — no login required. Each report can include JPEG, PNG, WebP, or PDF attachments. Reporter PII is auto-redacted in the UI for all roles except ADMIN. Officers can view original data on a documented investigation context.",
    route: "/reports",
    Icon: FileText,
    color: "text-saffron-400",
    callToAction: "Click any report to see the AI classification panel — keywords, corruption signals, sentiment.",
  },
];
