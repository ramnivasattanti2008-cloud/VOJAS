export type EpistemicSource = 
  | 'SATELLITE_OBSERVATION' 
  | 'AI_INFERENCE' 
  | 'CITIZEN_REPORT' 
  | 'GOVERNMENT_DATA' 
  | 'VERIFIED';

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'VERIFIED' | 'NEGLIGIBLE';

export type ChangeCategory = 
  | 'Construction' 
  | 'Road expansion' 
  | 'Vegetation loss' 
  | 'Water change' 
  | 'Land-use change' 
  | 'Infrastructure change' 
  | 'Possible demolition' 
  | 'Flooding' 
  | 'Unknown';

export type ProjectStatus = 
  | 'UNDER_CONSTRUCTION' 
  | 'APPROVED' 
  | 'STALLED' 
  | 'DELAYED' 
  | 'COMPLETED' 
  | 'AWAITING_ANALYSIS';

export type ReportStatus = 'New' | 'Reviewing' | 'Verified' | 'Resolved' | 'Rejected';

export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface SatelliteObservation {
  id: string;
  date: string;
  timeIst: string;
  sensor: string; // e.g. 'Sentinel-2 MSI' or 'Landsat 9 OLI-2'
  resolutionMeters: number;
  cloudCoveragePercent: number;
  ndviAverage?: number;
  spectralIndex?: string;
  thumbnailUrl: string;
  fullImageUrl: string;
  status: 'ONLINE' | 'ARCHIVED' | 'PROCESSING';
}

export interface ChangePolygon {
  id: string;
  coordinates: [number, number][];
  hectares: number;
  category: ChangeCategory;
  severity: RiskLevel;
  confidence: number;
  description: string;
}

export interface ChangeEvent {
  id: string;
  title: string;
  locationName: string;
  district: string;
  state: string;
  coordinates: Coordinates;
  detectedDate: string;
  previousObservationDate: string;
  intervalDays: number;
  confidenceScore: number;
  areaHectares: number;
  category: ChangeCategory;
  severity: RiskLevel;
  summary: string;
  detailedExplanation?: string;
  evidenceItems: {
    type: EpistemicSource;
    title: string;
    detail: string;
    verified: boolean;
  }[];
  polygon: [number, number][];
  beforeImageUrl: string;
  afterImageUrl: string;
}

export interface RiskItem {
  id: string;
  title: string;
  location: string;
  state: string;
  severity: RiskLevel;
  confidenceScore: number;
  regionType: string;
  detectedTimeAgo: string;
  whyItMatters: string;
  evidence: {
    type: EpistemicSource;
    text: string;
  }[];
  aiAssessment: string;
  recommendedAction: string;
}

export interface InfrastructureProject {
  id: string;
  name: string;
  category: 'Roads' | 'Bridges' | 'Schools' | 'Hospitals' | 'Water' | 'Drainage' | 'Government Projects';
  location: string;
  district: string;
  state: string;
  coordinates: Coordinates;
  status: ProjectStatus;
  budgetCr: number;
  contractor: string;
  startDate: string;
  expectedCompletion: string;
  officialProgressPct: number;
  aiSatelliteProgressEstimatePct?: number | null; // null represents 'Awaiting analysis'
  confidenceScore?: number | null;
  satelliteObservationStatus: 'Activity detected' | 'No activity' | 'Awaiting analysis' | 'Anomaly detected';
  lastObservedDate: string;
  delayMonths?: number;
  notes: string;
}

export interface CitizenReport {
  id: string; // e.g. 'CS-2026-001482'
  title: string;
  locationName: string;
  district: string;
  state: string;
  coordinates: Coordinates;
  issueType: 'Road' | 'Drainage' | 'Waste' | 'Construction' | 'Flooding' | 'Encroachment' | 'Other';
  description: string;
  submittedTimeAgo: string;
  submittedTimestamp: string;
  status: ReportStatus;
  upvotes: number;
  evidenceReceived: boolean;
  locationVerified: boolean;
  aiTriageSummary: string;
  satelliteCorroborated: boolean;
  photoUrl?: string;
}

export interface AlertItem {
  id: string;
  title: string;
  severity: AlertSeverity;
  location: string;
  state: string;
  coordinates: Coordinates;
  detectedTimeAgo: string;
  timestamp: string;
  confidence: number;
  category: ChangeCategory | 'Infrastructure' | 'Encroachment';
  description: string;
  status: 'ACTIVE' | 'INVESTIGATING' | 'DISMISSED' | 'WATCHING';
  assignedTo?: string;
}

export interface InvestigationCase {
  id: string; // e.g. 'CS-1042'
  title: string;
  location: string;
  district: string;
  state: string;
  status: 'OPEN' | 'IN_REVIEW' | 'VERIFIED' | 'ESCALATED' | 'CLOSED';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  openedAt: string;
  lastUpdated: string;
  assignedOfficer: string;
  summary: string;
  observedData: string[];
  aiInferences: string[];
  confidenceScore: number;
  potentialExplanations: string[];
  recommendedVerification: string[];
  evidenceFiles: {
    id: string;
    type: 'Satellite Before/After' | 'Citizen Report' | 'Tender Document' | 'Field Inspector Log';
    title: string;
    timestamp: string;
    url?: string;
  }[];
  timeline: {
    time: string;
    date: string;
    event: string;
    source: EpistemicSource;
  }[];
  notes: {
    author: string;
    time: string;
    content: string;
  }[];
}

export interface LocationProfile {
  id: string;
  name: string;
  district: string;
  state: string;
  coordinates: Coordinates;
  riskLevel: RiskLevel;
  activeAlertsCount: number;
  changesDetectedCount: number;
  citizenReportsCount: number;
  projectsMonitoredCount: number;
  lastSatellitePass: string;
  overviewSummary: string;
  aiCivicHealthScore: number; // 0-100
}

export interface SystemTelemetry {
  satelliteFeedStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  aiEngineStatus: 'OPERATIONAL' | 'BUSY' | 'DEGRADED';
  gisTileServices: 'OPERATIONAL' | 'DEGRADED';
  databaseSync: 'SYNCHRONIZED' | 'SYNCING';
  lastSatelliteSync: string;
  monitoredLocationsCount: number;
  activeAlertsCount: number;
  changesDetectedCount: number;
  citizenReportsCount: number;
  criticalAlertsCount: number;
}
