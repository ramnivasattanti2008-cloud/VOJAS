/**
 * Satellite Imagery Types — VOJAS
 */

export interface SatelliteCapture {
  id: string;
  projectId: string;
  date: string;
  lat: number;
  lng: number;
  imageUrl: string;
  thumbnailUrl: string;
  provider: "CDSE" | "NONE" | "esri" | "sentinel" | "mock"; // CDSE = real Sentinel-2 from Copernicus; NONE = no tile available
  cloudCover: number;
  analysis: {
    developmentScore: number; // 0–100
    builtUpArea: number; // sq meters
    vegetationCover: number; // 0–100
    changeFromPrevious: number;
    constructionDetected: boolean;
    statusLabel: "No Activity" | "Site Cleared" | "Foundation" | "Structure" | "Near Complete" | "Completed";
  };
}

export interface TimelinePoint {
  date: string;
  developmentScore: number;
  builtUpArea: number;
  vegetationCover: number;
  changeFromPrevious: number;
}

export interface SatelliteAnomaly {
  type: "PROGRESS_HALT" | "ACCELERATION" | "VEGETATION_LOSS" | "OVERRUN" | "SUSPICIOUS_DORMANCY";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  detectedDate: string;
}

export interface TimelineInsight {
  period: string;
  developmentScore: number;
  delta: number;
  insights: string;
}

export interface SatelliteAssessment {
  id: string;
  projectId: string;
  generatedAt: string;
  overallScore: number;
  progressSummary: string;
  keyObservations: string[];
  anomalies: SatelliteAnomaly[];
  confidence: number;
  nextSteps: string[];
  timelineAnalysis: TimelineInsight[];
  statistics: {
    earliestCapture: string;
    latestCapture: string;
    totalCaptures: number;
    avgCloudCover: number;
    averageDevelopmentRate: number;
    peakDevelopmentWeek: string;
    constructionActive: boolean;
  };
}

export const STATUS_COLORS: Record<SatelliteCapture["analysis"]["statusLabel"], string> = {
  "No Activity": "text-gray-400",
  "Site Cleared": "text-yellow-500",
  "Foundation": "text-orange-500",
  "Structure": "text-blue-500",
  "Near Complete": "text-emerald-500",
  "Completed": "text-green-500",
};

export const ANOMALY_COLORS: Record<SatelliteAnomaly["severity"], string> = {
  LOW: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  MEDIUM: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};
