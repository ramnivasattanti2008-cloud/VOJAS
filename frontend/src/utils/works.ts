/**
 * Client-side works breakdown derivation.
 * Mirrors the logic in backend/src/services/projectService.ts:parseWorks.
 * Do not change this logic — it must stay in sync with the backend.
 */

export interface WorkPhase {
  name: string;
  status: "completed" | "active" | "pending" | "delayed" | "skipped";
  pct: number;
}

const templates: Record<string, string[]> = {
  CONSTRUCTION: ["Site Survey & Clearance", "Foundation & Excavation", "Superstructure", "Roofing & Finishing", "Handover & Inspection"],
  WATER:       ["Survey & Design", "Pipeline Laying", "Tank / Structure", "Testing & Flushing", "Commissioning"],
  EDUCATION:   ["Site Preparation", "Foundation", "Building Structure", "Electrification & Plumbing", "Furnishing & Handover"],
  HEALTH:      ["Site & Permits", "Foundation", "Building Structure", "Equipment Installation", "Handover"],
  TRANSPORT:   ["Survey & Marking", "Earthwork & Embankment", "Base Course", "Surface & Marking", "Handover"],
  ENERGY:      ["Survey & DPR", "Material Procurement", "Installation", "Testing & Grid Tie", "Commissioning"],
  AGRICULTURE: ["Site Survey", "Land Preparation", "Infrastructure", "Planting / Equipment", "Handover"],
  HOUSING:     ["Beneficiary Selection", "Foundation", "Superstructure", "Finishing & Amenities", "Handover"],
  DEFAULT:     ["Planning & Approval", "Procurement", "Execution", "Quality Check", "Handover"],
};

const sectorToCategory: Record<string, keyof typeof templates> = {
  PUBLIC_INFRASTRUCTURE: "CONSTRUCTION",
  HOUSING:              "HOUSING",
  HEALTH:               "HEALTH",
  EDUCATION:            "EDUCATION",
  TRANSPORT:            "TRANSPORT",
  WATER_SANITATION:     "WATER",
  ENERGY:               "ENERGY",
  AGRICULTURE:          "AGRICULTURE",
};

const statusPct: Record<string, number> = {
  PROPOSED: 5,
  UNSANCTIONED: 0,
  APPROVED: 15,
  IN_PROGRESS: 50,
  COMPLETED: 90,
  VERIFIED: 100,
  CANCELLED: 0,
};

export function deriveWorks(project: {
  sector: string;
  status: string;
  startDate?: string | null;
  expectedEndDate?: string | null;
  completedAt?: string | null;
}): WorkPhase[] {
  const category = sectorToCategory[project.sector] ?? "DEFAULT";
  const phaseNames = templates[category] ?? templates.DEFAULT;

  const overallPct = statusPct[project.status] ?? 0;
  const activePhaseIdx = Math.min(4, Math.floor(overallPct / 20));
  const withinPhasePct = overallPct - activePhaseIdx * 20;

  const isDelayed = project.expectedEndDate
    ? project.status !== "COMPLETED" &&
      project.status !== "VERIFIED" &&
      new Date(project.expectedEndDate) < new Date()
    : false;

  return phaseNames.map((name, i) => {
    let status: WorkPhase["status"];
    let pct: number;

    if (project.status === "CANCELLED") {
      status = "skipped";
      pct = 0;
    } else if (i < activePhaseIdx) {
      status = "completed";
      pct = 100;
    } else if (i === activePhaseIdx) {
      if (isDelayed && withinPhasePct < 20) {
        status = "delayed";
        pct = withinPhasePct;
      } else {
        status = "active";
        pct = withinPhasePct;
      }
    } else {
      status = "pending";
      pct = 0;
    }

    return { name, status, pct };
  });
}
