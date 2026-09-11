import {
  SatelliteObservation,
  ChangeEvent,
  RiskItem,
  InfrastructureProject,
  CitizenReport,
  AlertItem,
  InvestigationCase,
  LocationProfile,
  SystemTelemetry,
  EpistemicSource
} from '../types/civicshield';

import {
  SYSTEM_TELEMETRY,
  SATELLITE_TIMELINE_BENGALURU,
  ALL_CHANGE_EVENTS,
  PRIMARY_CHANGE_EVENT,
  ALL_RISKS,
  ALL_PROJECTS,
  ALL_CITIZEN_REPORTS,
  ALL_ALERTS,
  PRIMARY_INVESTIGATION,
  ALL_LOCATION_PROFILES
} from '../data/mockData';

// API Service Layer for CivicShield AI
// Switchable to live backend via NEXT_PUBLIC_API_URL

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function getSystemTelemetry(): Promise<SystemTelemetry> {
  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/telemetry`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Fallback to local telemetry store:', e);
    }
  }
  return { ...SYSTEM_TELEMETRY };
}

export async function getLocations(): Promise<LocationProfile[]> {
  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/locations`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Fallback to local locations data:', e);
    }
  }
  return [...ALL_LOCATION_PROFILES];
}

export async function getLocationById(id: string): Promise<LocationProfile | null> {
  const list = await getLocations();
  return list.find(l => l.id === id || l.district.toLowerCase().includes(id.toLowerCase())) || null;
}

export async function getProjects(filter?: { status?: string; category?: string }): Promise<InfrastructureProject[]> {
  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/projects`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Fallback to local projects data:', e);
    }
  }
  let results = [...ALL_PROJECTS];
  if (filter?.status) {
    results = results.filter(p => p.status === filter.status);
  }
  if (filter?.category) {
    results = results.filter(p => p.category === filter.category);
  }
  return results;
}

export async function getAlerts(severity?: string): Promise<AlertItem[]> {
  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/alerts`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Fallback to local alerts data:', e);
    }
  }
  let alerts = [...ALL_ALERTS];
  if (severity && severity !== 'ALL') {
    alerts = alerts.filter(a => a.severity === severity);
  }
  return alerts;
}

export async function getReports(status?: string): Promise<CitizenReport[]> {
  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/reports`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Fallback to local reports data:', e);
    }
  }
  let reports = [...ALL_CITIZEN_REPORTS];
  if (status && status !== 'ALL') {
    reports = reports.filter(r => r.status === status);
  }
  return reports;
}

export async function submitCitizenReport(payload: {
  title: string;
  issueType: CitizenReport['issueType'];
  description: string;
  locationName: string;
  coordinates: { lat: number; lng: number };
  evidenceName?: string;
}): Promise<CitizenReport> {
  const newReport: CitizenReport = {
    id: `CS-2026-00${Math.floor(1000 + Math.random() * 9000)}`,
    title: payload.title,
    locationName: payload.locationName,
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    coordinates: payload.coordinates,
    issueType: payload.issueType,
    description: payload.description,
    submittedTimeAgo: 'Just now',
    submittedTimestamp: new Date().toLocaleTimeString('en-IN') + ' IST',
    status: 'New',
    upvotes: 1,
    evidenceReceived: Boolean(payload.evidenceName),
    locationVerified: true,
    aiTriageSummary: 'Queued for automated geospatial satellite corroboration. Sensor pass scheduled within 4 hours.',
    satelliteCorroborated: false
  };

  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReport)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Fallback to local submission:', e);
    }
  }

  ALL_CITIZEN_REPORTS.unshift(newReport);
  return newReport;
}

export async function getSatelliteTimeline(locationId?: string): Promise<SatelliteObservation[]> {
  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/satellite/timeline?location=${locationId || 'BLR'}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Fallback to local timeline data:', e);
    }
  }
  return [...SATELLITE_TIMELINE_BENGALURU];
}

export async function getChangeDetection(filter?: { category?: string }): Promise<ChangeEvent[]> {
  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/changes`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Fallback to local changes data:', e);
    }
  }
  let changes = [...ALL_CHANGE_EVENTS];
  if (filter?.category && filter.category !== 'All') {
    changes = changes.filter(c => c.category === filter.category);
  }
  return changes;
}

export async function getChangeById(id: string): Promise<ChangeEvent | null> {
  const changes = await getChangeDetection();
  return changes.find(c => c.id === id) || null;
}

export async function getRiskAnalysis(): Promise<RiskItem[]> {
  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/risks`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Fallback to local risks data:', e);
    }
  }
  return [...ALL_RISKS];
}

export async function getInvestigation(caseId: string = 'CS-1042'): Promise<InvestigationCase> {
  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/investigations/${caseId}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Fallback to local investigation case:', e);
    }
  }
  return { ...PRIMARY_INVESTIGATION };
}

export async function runAIAnalysis(targetId: string, type: 'CHANGE' | 'PROJECT' | 'RISK'): Promise<{
  finding: string;
  evidence: { type: EpistemicSource; text: string }[];
  confidence: number;
  potentialExplanation: string;
  recommendedAction: string;
}> {
  // Simulates an explainable AI synthesis request
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        finding: 'Rapid ground grading and canopy stripping detected across 28,400 m² between 31 Aug and 08 Sep 2026.',
        evidence: [
          { type: 'SATELLITE_OBSERVATION', text: 'Multi-spectral surface reflectance drop in Red Edge band B5 (-28%).' },
          { type: 'GOVERNMENT_DATA', text: 'Municipal Gazette #BBMP-883 corridor specification exceeds plan by 45 meters.' },
          { type: 'CITIZEN_REPORT', text: 'Night-time dump truck transit logged with photo evidence #CS-2026-001482.' }
        ],
        confidence: 94,
        potentialExplanation: 'Commercial plot grading occurring under cover of legitimate municipal road widening operations.',
        recommendedAction: 'Issue immediate Stop-Work directive to zonal ward office and deploy total station survey team.'
      });
    }, 600);
  });
}
