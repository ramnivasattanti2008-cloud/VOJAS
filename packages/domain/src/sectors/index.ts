/**
 * M13: 16-Sector Intelligence Framework
 *
 * Unified configuration for all 16 VOJAS sectors.
 * Each sector defines: indicators, risk rules, map layers, data sources,
 * AI context, and workflow configuration.
 *
 * This is NOT 16 separate apps — it's ONE configurable framework.
 */

import type { ProjectSector } from '@vojas/shared';

// ── Core Types ────────────────────────────────────────────────────────────────

export type DataAvailability =
  | 'AVAILABLE'
  | 'PARTIAL'
  | 'STALE'
  | 'UNAVAILABLE'
  | 'REQUIRES_AUTH'
  | 'NOT_APPLICABLE';

export type IndicatorType =
  | 'DIRECT'           // Directly sourced value
  | 'DERIVED'          // Calculated from source data
  | 'SATELLITE'        // From Earth-observation data
  | 'AI_INTERPRETED'   // Interpretation of structured signals
  | 'HUMAN_VERIFIED';  // Verified by authorized user

export type MapLayerType =
  | 'projects'
  | 'complaints'
  | 'risk'
  | 'satellite'
  | 'environmental'
  | 'financial'
  | 'boundaries'
  | 'hazards'
  | 'facilities';

export type RiskSignalType =
  | 'PROGRESS_SATELLITE_MISMATCH'
  | 'FINANCIAL_ANOMALY'
  | 'DELAY'
  | 'CITIZEN_SIGNAL'
  | 'ENVIRONMENTAL_CHANGE'
  | 'PROCUREMENT_PATTERN'
  | 'COMPLAINT_SPIKE'
  | 'DATA_QUALITY';

export interface SectorMapLayer {
  id: string;
  name: string;
  type: MapLayerType;
  description: string;
  color: string;
  dataAvailability: DataAvailability;
  dataNote?: string;
}

export interface SectorIndicator {
  id: string;
  name: string;
  description: string;
  unit: string;
  type: IndicatorType;
  source: string;
  frequency: string;
  calculation?: string;
  dataAvailability: DataAvailability;
  dataNote?: string;
}

export interface SectorRiskRule {
  id: string;
  name: string;
  description: string;
  signals: RiskSignalType[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dataRequirements: string[];
  dataAvailability: DataAvailability;
}

export interface SectorDataSource {
  id: string;
  name: string;
  officialSource: string;
  dataset: string;
  url?: string;
  department: string;
  updateFrequency: string;
  apiAvailable: boolean;
  dataAvailability: DataAvailability;
  accessMethod: string;
  dataNote?: string;
}

export interface SectorSection {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface SectorConfig {
  code: ProjectSector;
  name: string;
  shortName: string;
  description: string;
  color: string;
  icon: string;
  // Navigation sections
  sections: SectorSection[];
  // Indicators
  indicators: SectorIndicator[];
  // Risk rules
  riskRules: SectorRiskRule[];
  // Map layers
  mapLayers: SectorMapLayer[];
  // Data sources
  dataSources: SectorDataSource[];
  // AI context
  aiContext: {
    description: string;
    keyQuestions: string[];
    availableMetrics: string[];
    typicalAlerts: string[];
  };
  // Data quality dimensions
  dataQualityDimensions: Array<{
    name: string;
    description: string;
    applicable: boolean;
    dataAvailability: DataAvailability;
    dataNote?: string;
  }>;
}

// ── All 16 Sector Configurations ───────────────────────────────────────────

export const SECTOR_CONFIGS: Record<ProjectSector, SectorConfig> = {
  PUBLIC_INFRASTRUCTURE: {
    code: 'PUBLIC_INFRASTRUCTURE' as ProjectSector,
    name: 'Public Infrastructure and Works',
    shortName: 'Infrastructure',
    description: 'Monitoring of public works, construction projects, and infrastructure development across all states and districts.',
    color: '#6366f1',
    icon: '🏗️',
    sections: [
      { id: 'overview', name: 'Overview', description: 'Sector summary and key metrics', enabled: true },
      { id: 'kpis', name: 'KPIs', description: 'Key performance indicators', enabled: true },
      { id: 'map', name: 'Map', description: 'Geographic distribution', enabled: true },
      { id: 'trends', name: 'Trends', description: 'Temporal analysis', enabled: true },
      { id: 'alerts', name: 'Alerts', description: 'Active risk alerts', enabled: true },
      { id: 'citizen', name: 'Citizen Signals', description: 'Complaints and reports', enabled: true },
      { id: 'projects', name: 'Projects', description: 'Project directory', enabled: true },
      { id: 'data-quality', name: 'Data Quality', description: 'Data completeness and freshness', enabled: true },
      { id: 'reports', name: 'Reports', description: 'Sector reports', enabled: true },
      { id: 'ai', name: 'AI Insights', description: 'AI-generated sector analysis', enabled: true },
    ],
    indicators: [
      { id: 'pi-01', name: 'Project Completion Rate', description: 'Percentage of projects completed on time', unit: '%', type: 'DIRECT', source: 'VOJAS Project Registry', frequency: 'Monthly', dataAvailability: 'AVAILABLE' },
      { id: 'pi-02', name: 'Average Project Delay', description: 'Average delay in days from expected completion', unit: 'days', type: 'DERIVED', source: 'VOJAS Project Registry', frequency: 'Monthly', calculation: 'avg(expected_end_date - actual_completion)', dataAvailability: 'AVAILABLE' },
      { id: 'pi-03', name: 'Financial Utilization Rate', description: 'Percentage of approved amount actually spent', unit: '%', type: 'DERIVED', source: 'Financial Records', frequency: 'Quarterly', calculation: 'sum(spent) / sum(approved)', dataAvailability: 'AVAILABLE' },
      { id: 'pi-04', name: 'Citizen Complaint Rate', description: 'Complaints per 100 active projects', unit: 'per 100', type: 'DERIVED', source: 'Citizen Reports', frequency: 'Monthly', calculation: 'count(reports) / count(active_projects) * 100', dataAvailability: 'AVAILABLE' },
      { id: 'pi-05', name: 'Satellite Observable Progress', description: 'Physical progress visible from satellite imagery', unit: '%', type: 'SATELLITE', source: 'Copernicus Sentinel-2 via CDSE', frequency: 'Per observation', dataAvailability: 'PARTIAL', dataNote: 'Available where project boundary is defined' },
      { id: 'pi-06', name: 'Risk-Adjusted Completion', description: 'Completion adjusted for risk signals', unit: '%', type: 'AI_INTERPRETED', source: 'Multi-signal AI analysis', frequency: 'Weekly', dataAvailability: 'AVAILABLE' },
    ],
    riskRules: [
      { id: 'pir-01', name: 'Progress-Satellite Mismatch', description: 'Reported progress significantly ahead of satellite-observable change', signals: ['PROGRESS_SATELLITE_MISMATCH', 'DELAY'], severity: 'HIGH', dataRequirements: ['Project progress reports', 'Satellite observations'], dataAvailability: 'AVAILABLE' },
      { id: 'pir-02', name: 'Financial Anomaly', description: 'High expenditure without corresponding progress', signals: ['FINANCIAL_ANOMALY'], severity: 'CRITICAL', dataRequirements: ['Financial records', 'Progress data'], dataAvailability: 'AVAILABLE' },
      { id: 'pir-03', name: 'Delay Pattern', description: 'Project approaching deadline without completion', signals: ['DELAY', 'CITIZEN_SIGNAL'], severity: 'MEDIUM', dataRequirements: ['Timeline data', 'Citizen reports'], dataAvailability: 'AVAILABLE' },
      { id: 'pir-04', name: 'Citizen Concern Spike', description: 'Unusual increase in citizen complaints', signals: ['CITIZEN_SIGNAL', 'COMPLAINT_SPIKE'], severity: 'MEDIUM', dataRequirements: ['Citizen reports'], dataAvailability: 'AVAILABLE' },
    ],
    mapLayers: [
      { id: 'pml-01', name: 'Projects', type: 'projects', description: 'All projects with status indicators', color: '#6366f1', dataAvailability: 'AVAILABLE' },
      { id: 'pml-02', name: 'Risk Heatmap', type: 'risk', description: 'Projects color-coded by risk level', color: '#ef4444', dataAvailability: 'AVAILABLE' },
      { id: 'pml-03', name: 'Citizen Reports', type: 'complaints', description: 'Complaint clusters and density', color: '#f59e0b', dataAvailability: 'AVAILABLE' },
      { id: 'pml-04', name: 'Satellite Observations', type: 'satellite', description: 'Available satellite imagery footprints', color: '#22c55e', dataAvailability: 'PARTIAL', dataNote: 'Only where imagery is available' },
      { id: 'pml-05', name: 'Project Boundaries', type: 'boundaries', description: 'Verified project boundary polygons', color: '#8b5cf6', dataAvailability: 'PARTIAL', dataNote: 'Available for projects with defined boundaries' },
    ],
    dataSources: [
      { id: 'pds-01', name: 'MPLADS Project Registry', officialSource: 'Ministry of Statistics and Programme Implementation', dataset: 'MPLADS Project Data', department: 'MoSPI', updateFrequency: 'Quarterly', apiAvailable: true, dataAvailability: 'AVAILABLE', accessMethod: 'Official government portal', dataNote: 'Primary source for infrastructure projects' },
      { id: 'pds-02', name: 'CPIS Portal', officialSource: 'Ministry of Statistics and Programme Implementation', dataset: 'Central Sector Projects', department: 'MoSPI', updateFrequency: 'Monthly', apiAvailable: true, dataAvailability: 'AVAILABLE', accessMethod: 'CPIS.nic.in' },
      { id: 'pds-03', name: 'Satellite Imagery', officialSource: 'Copernicus Data Space Ecosystem', dataset: 'Sentinel-2 L2A', department: 'ESA', updateFrequency: '5-day revisit', apiAvailable: true, dataAvailability: 'PARTIAL', accessMethod: 'CDSE API', dataNote: 'Free tier: 10k PU/month' },
      { id: 'pds-04', name: 'OpenCity Data', officialSource: 'OpenCity', dataset: 'Citizen-reported infrastructure issues', department: 'OpenCity', updateFrequency: 'Ongoing', apiAvailable: true, dataAvailability: 'PARTIAL', accessMethod: 'OpenCity API', dataNote: 'City-specific coverage' },
    ],
    aiContext: {
      description: 'Infrastructure sector monitors public works projects, construction progress, financial utilization, and citizen-reported issues.',
      keyQuestions: [
        'What is the status of infrastructure projects in this area?',
        'Are there projects showing progress-satellite mismatch?',
        'Which projects have financial anomalies?',
        'Where are citizen complaints concentrated?',
        'What is the overall completion rate?',
      ],
      availableMetrics: ['Project completion rate', 'Financial utilization', 'Delay rate', 'Risk score', 'Complaint density', 'Satellite evidence count'],
      typicalAlerts: ['Progress-satellite mismatch detected', 'High financial utilization without completion', 'Unusual delay pattern', 'Citizen complaint cluster'],
    },
    dataQualityDimensions: [
      { name: 'Project Data', description: 'Project registry completeness', applicable: true, dataAvailability: 'AVAILABLE' },
      { name: 'Financial Data', description: 'Budget and expenditure records', applicable: true, dataAvailability: 'AVAILABLE' },
      { name: 'Satellite Coverage', description: 'Satellite imagery availability', applicable: true, dataAvailability: 'PARTIAL' },
      { name: 'Citizen Reports', description: 'Community-sourced reports', applicable: true, dataAvailability: 'AVAILABLE' },
      { name: 'Boundary Data', description: 'Project boundary polygons', applicable: true, dataAvailability: 'PARTIAL' },
    ],
  },

  WATER_SANITATION: {
    code: 'WATER_SANITATION' as ProjectSector,
    name: 'Water Resources and Sanitation',
    shortName: 'Water',
    description: 'Monitoring of water infrastructure, sanitation projects, and water-body health using satellite and citizen data.',
    color: '#0ea5e9',
    icon: '💧',
    sections: [
      { id: 'overview', name: 'Overview', description: 'Water sector summary', enabled: true },
      { id: 'kpis', name: 'KPIs', description: 'Key performance indicators', enabled: true },
      { id: 'map', name: 'Map', description: 'Water infrastructure map', enabled: true },
      { id: 'trends', name: 'Trends', description: 'Water-body change analysis', enabled: true },
      { id: 'alerts', name: 'Alerts', description: 'Active water alerts', enabled: true },
      { id: 'citizen', name: 'Citizen Signals', description: 'Water-related complaints', enabled: true },
      { id: 'projects', name: 'Projects', description: 'Water project directory', enabled: true },
      { id: 'data-quality', name: 'Data Quality', description: 'Data completeness', enabled: true },
    ],
    indicators: [
      { id: 'wi-01', name: 'Water Project Completion', description: 'Percentage of water projects completed', unit: '%', type: 'DIRECT', source: 'Project Registry', frequency: 'Monthly', dataAvailability: 'AVAILABLE' },
      { id: 'wi-02', name: 'Water-Body Change', description: 'Change in water body area detected by satellite', unit: 'km²', type: 'SATELLITE', source: 'Copernicus Sentinel-2', frequency: 'Per observation', dataAvailability: 'AVAILABLE', dataNote: 'Derived from NDWI analysis' },
      { id: 'wi-03', name: 'Sanitation Coverage', description: 'Sanitation project coverage rate', unit: '%', type: 'DIRECT', source: 'Project Registry', frequency: 'Quarterly', dataAvailability: 'AVAILABLE' },
      { id: 'wi-04', name: 'Water Complaint Rate', description: 'Water-related complaints per project', unit: 'per project', type: 'DERIVED', source: 'Citizen Reports', frequency: 'Monthly', calculation: 'count(water_complaints) / count(projects)', dataAvailability: 'AVAILABLE' },
    ],
    riskRules: [
      { id: 'wr-01', name: 'Infrastructure vs Satellite Gap', description: 'Reported water infrastructure without corresponding satellite evidence', signals: ['PROGRESS_SATELLITE_MISMATCH', 'DELAY'], severity: 'HIGH', dataRequirements: ['Project data', 'Satellite imagery'], dataAvailability: 'PARTIAL' },
      { id: 'wr-02', name: 'Water Complaint Cluster', description: 'Concentrated citizen complaints about water', signals: ['CITIZEN_SIGNAL', 'COMPLAINT_SPIKE'], severity: 'MEDIUM', dataRequirements: ['Citizen reports'], dataAvailability: 'AVAILABLE' },
    ],
    mapLayers: [
      { id: 'wml-01', name: 'Water Projects', type: 'projects', description: 'Water supply and sanitation projects', color: '#0ea5e9', dataAvailability: 'AVAILABLE' },
      { id: 'wml-02', name: 'Water Bodies', type: 'environmental', description: 'Surface water bodies from satellite', color: '#3b82f6', dataAvailability: 'AVAILABLE' },
      { id: 'wml-03', name: 'Water Complaints', type: 'complaints', description: 'Water-related citizen reports', color: '#f59e0b', dataAvailability: 'AVAILABLE' },
      { id: 'wml-04', name: 'Risk', type: 'risk', description: 'Water infrastructure risk level', color: '#ef4444', dataAvailability: 'AVAILABLE' },
    ],
    dataSources: [
      { id: 'wds-01', name: 'Project Registry', officialSource: 'National Informatics Centre', dataset: 'Water project data', department: 'D/o Water Resources', updateFrequency: 'Quarterly', apiAvailable: false, dataAvailability: 'AVAILABLE', accessMethod: 'Manual ingestion' },
      { id: 'wds-02', name: 'Satellite Imagery', officialSource: 'Copernicus Data Space Ecosystem', dataset: 'Sentinel-2 L2A', department: 'ESA', updateFrequency: '5-day', apiAvailable: true, dataAvailability: 'AVAILABLE', accessMethod: 'CDSE API', dataNote: 'NDWI-derived water extent' },
      { id: 'wds-03', name: 'Citizen Reports', officialSource: 'VOJAS Platform', dataset: 'Water complaints', department: 'Community', updateFrequency: 'Ongoing', apiAvailable: true, dataAvailability: 'AVAILABLE', accessMethod: 'VOJAS API' },
    ],
    aiContext: {
      description: 'Water sector monitors water supply, sanitation infrastructure, and water-body health using satellite imagery and citizen reports.',
      keyQuestions: [
        'What water projects are active in this area?',
        'Has water body extent changed significantly?',
        'Where are water-related complaints concentrated?',
        'What is the sanitation coverage?',
      ],
      availableMetrics: ['Project completion rate', 'Water body change', 'Complaint density', 'Coverage rate'],
      typicalAlerts: ['Significant water body reduction', 'Water complaint cluster', 'Infrastructure-satellite gap'],
    },
    dataQualityDimensions: [
      { name: 'Project Data', description: 'Water project registry', applicable: true, dataAvailability: 'AVAILABLE' },
      { name: 'Satellite Coverage', description: 'Satellite water extent data', applicable: true, dataAvailability: 'AVAILABLE' },
      { name: 'Citizen Reports', description: 'Water complaints', applicable: true, dataAvailability: 'AVAILABLE' },
      { name: 'Water Quality', description: 'Water quality measurements', applicable: false, dataAvailability: 'NOT_APPLICABLE' },
    ],
  },

  EDUCATION: {
    code: 'EDUCATION' as ProjectSector,
    name: 'Education and Learning Services',
    shortName: 'Education',
    description: 'Monitoring of educational infrastructure, school facilities, and learning service delivery.',
    color: '#f59e0b',
    icon: '📚',
    sections: [
      { id: 'overview', name: 'Overview', description: 'Education sector overview', enabled: true },
      { id: 'kpis', name: 'KPIs', description: 'Key education indicators', enabled: true },
      { id: 'map', name: 'Map', description: 'Education infrastructure map', enabled: true },
      { id: 'projects', name: 'Projects', description: 'Education projects', enabled: true },
      { id: 'citizen', name: 'Citizen Signals', description: 'Education complaints', enabled: true },
      { id: 'data-quality', name: 'Data Quality', description: 'Data completeness', enabled: true },
    ],
    indicators: [
      { id: 'ei-01', name: 'School Project Completion', description: 'Education infrastructure projects completed', unit: 'count', type: 'DIRECT', source: 'Project Registry', frequency: 'Quarterly', dataAvailability: 'AVAILABLE' },
      { id: 'ei-02', name: 'Infrastructure Gap Index', description: 'Estimated infrastructure gap from complaints and project data', unit: 'index', type: 'AI_INTERPRETED', source: 'Multi-source analysis', frequency: 'Monthly', dataAvailability: 'PARTIAL', dataNote: 'Derived from complaint clustering + project data' },
      { id: 'ei-03', name: 'Education Complaint Rate', description: 'Education complaints per area', unit: 'per 100k', type: 'DERIVED', source: 'Citizen Reports', frequency: 'Monthly', calculation: 'count(education_reports) / population', dataAvailability: 'AVAILABLE' },
    ],
    riskRules: [
      { id: 'er-01', name: 'School Infrastructure Gap', description: 'Area with high complaints and low project coverage', signals: ['CITIZEN_SIGNAL', 'DELAY'], severity: 'MEDIUM', dataRequirements: ['Project data', 'Citizen reports'], dataAvailability: 'PARTIAL' },
    ],
    mapLayers: [
      { id: 'eml-01', name: 'Education Projects', type: 'projects', description: 'Schools and education infrastructure', color: '#f59e0b', dataAvailability: 'AVAILABLE' },
      { id: 'eml-02', name: 'Education Complaints', type: 'complaints', description: 'Education-related reports', color: '#ef4444', dataAvailability: 'AVAILABLE' },
      { id: 'eml-03', name: 'Satellite Evidence', type: 'satellite', description: 'School building observations', color: '#22c55e', dataAvailability: 'PARTIAL', dataNote: 'Where project boundaries defined' },
    ],
    dataSources: [
      { id: 'eds-01', name: 'Project Registry', officialSource: 'Ministry of Education', dataset: 'Education projects', department: 'MoE', updateFrequency: 'Annual', apiAvailable: false, dataAvailability: 'PARTIAL', accessMethod: 'Manual ingestion', dataNote: 'Aggregated data only' },
      { id: 'eds-02', name: 'Citizen Reports', officialSource: 'VOJAS Platform', dataset: 'Education complaints', department: 'Community', updateFrequency: 'Ongoing', apiAvailable: true, dataAvailability: 'AVAILABLE', accessMethod: 'VOJAS API' },
    ],
    aiContext: {
      description: 'Education sector monitors school infrastructure projects and citizen-reported educational service issues.',
      keyQuestions: ['What education projects are in this area?', 'Where are education complaints concentrated?', 'What infrastructure gaps exist?'],
      availableMetrics: ['Project count', 'Completion rate', 'Complaint density'],
      typicalAlerts: ['Education complaint cluster', 'Infrastructure gap pattern'],
    },
    dataQualityDimensions: [
      { name: 'Project Data', description: 'Education project registry', applicable: true, dataAvailability: 'PARTIAL' },
      { name: 'Student Data', description: 'Student enrollment records', applicable: false, dataAvailability: 'NOT_APPLICABLE', dataNote: 'Protected personal data' },
      { name: 'Satellite Coverage', description: 'School building observations', applicable: true, dataAvailability: 'PARTIAL' },
      { name: 'Citizen Reports', description: 'Education complaints', applicable: true, dataAvailability: 'AVAILABLE' },
    ],
  },

  HEALTH: {
    code: 'HEALTH' as ProjectSector,
    name: 'Public Health and Healthcare Services',
    shortName: 'Health',
    description: 'Monitoring of healthcare infrastructure, health facility projects, and public health service delivery.',
    color: '#ef4444',
    icon: '🏥',
    sections: [
      { id: 'overview', name: 'Overview', description: 'Health sector overview', enabled: true },
      { id: 'kpis', name: 'KPIs', description: 'Health infrastructure KPIs', enabled: true },
      { id: 'map', name: 'Map', description: 'Health facility map', enabled: true },
      { id: 'projects', name: 'Projects', description: 'Health projects', enabled: true },
      { id: 'citizen', name: 'Citizen Signals', description: 'Health complaints', enabled: true },
      { id: 'data-quality', name: 'Data Quality', description: 'Data completeness', enabled: true },
    ],
    indicators: [
      { id: 'hi-01', name: 'Health Project Completion', description: 'Healthcare infrastructure projects completed', unit: 'count', type: 'DIRECT', source: 'Project Registry', frequency: 'Quarterly', dataAvailability: 'AVAILABLE' },
      { id: 'hi-02', name: 'Health Facility Gap Index', description: 'Estimated facility gap from complaints', unit: 'index', type: 'AI_INTERPRETED', source: 'Complaint analysis', frequency: 'Monthly', dataAvailability: 'PARTIAL' },
      { id: 'hi-03', name: 'Health Complaint Rate', description: 'Health service complaints per area', unit: 'per 100k', type: 'DERIVED', source: 'Citizen Reports', frequency: 'Monthly', calculation: 'count(health_reports) / population', dataAvailability: 'AVAILABLE' },
    ],
    riskRules: [
      { id: 'hr-01', name: 'Health Infrastructure Gap', description: 'Area with high health complaints and low project coverage', signals: ['CITIZEN_SIGNAL', 'DELAY'], severity: 'HIGH', dataRequirements: ['Project data', 'Citizen reports'], dataAvailability: 'PARTIAL' },
    ],
    mapLayers: [
      { id: 'hml-01', name: 'Health Projects', type: 'projects', description: 'Healthcare infrastructure projects', color: '#ef4444', dataAvailability: 'AVAILABLE' },
      { id: 'hml-02', name: 'Health Complaints', type: 'complaints', description: 'Healthcare service reports', color: '#f59e0b', dataAvailability: 'AVAILABLE' },
    ],
    dataSources: [
      { id: 'hds-01', name: 'Project Registry', officialSource: 'Ministry of Health & Family Welfare', dataset: 'NHM projects', department: 'MoHFW', updateFrequency: 'Quarterly', apiAvailable: false, dataAvailability: 'PARTIAL', accessMethod: 'Manual ingestion' },
      { id: 'hds-02', name: 'Citizen Reports', officialSource: 'VOJAS Platform', dataset: 'Health complaints', department: 'Community', updateFrequency: 'Ongoing', apiAvailable: true, dataAvailability: 'AVAILABLE', accessMethod: 'VOJAS API' },
    ],
    aiContext: {
      description: 'Health sector monitors healthcare infrastructure projects and citizen-reported health service issues. Protected health information is never exposed.',
      keyQuestions: ['What health projects are in this area?', 'Where are health complaints concentrated?', 'What facility gaps exist?'],
      availableMetrics: ['Project count', 'Completion rate', 'Complaint density'],
      typicalAlerts: ['Health complaint cluster', 'Infrastructure gap pattern'],
    },
    dataQualityDimensions: [
      { name: 'Project Data', description: 'Health project registry', applicable: true, dataAvailability: 'PARTIAL' },
      { name: 'Patient Data', description: 'Individual patient records', applicable: false, dataAvailability: 'NOT_APPLICABLE', dataNote: 'Protected health information' },
      { name: 'Facility Data', description: 'Health facility inventory', applicable: true, dataAvailability: 'PARTIAL' },
      { name: 'Citizen Reports', description: 'Health complaints', applicable: true, dataAvailability: 'AVAILABLE' },
    ],
  },

  AGRICULTURE: {
    code: 'AGRICULTURE' as ProjectSector,
    name: 'Agriculture and Farmers Welfare',
    shortName: 'Agriculture',
    description: 'Monitoring of agricultural infrastructure, irrigation projects, and agricultural scheme delivery using satellite and field data.',
    color: '#22c55e',
    icon: '🌾',
    sections: [
      { id: 'overview', name: 'Overview', description: 'Agriculture sector overview', enabled: true },
      { id: 'kpis', name: 'KPIs', description: 'Agricultural indicators', enabled: true },
      { id: 'map', name: 'Map', description: 'Agricultural infrastructure map', enabled: true },
      { id: 'trends', name: 'Trends', description: 'Vegetation and land analysis', enabled: true },
      { id: 'projects', name: 'Projects', description: 'Agriculture projects', enabled: true },
      { id: 'citizen', name: 'Citizen Signals', description: 'Agriculture complaints', enabled: true },
      { id: 'data-quality', name: 'Data Quality', description: 'Data completeness', enabled: true },
    ],
    indicators: [
      { id: 'ai-01', name: 'Agriculture Project Completion', description: 'Agricultural infrastructure projects completed', unit: 'count', type: 'DIRECT', source: 'Project Registry', frequency: 'Quarterly', dataAvailability: 'AVAILABLE' },
      { id: 'ai-02', name: 'Vegetation Index Change', description: 'NDVI change indicating crop/vegetation condition', unit: '%', type: 'SATELLITE', source: 'Copernicus Sentinel-2', frequency: 'Monthly', dataAvailability: 'AVAILABLE', dataNote: 'NDVI-derived from satellite imagery' },
      { id: 'ai-03', name: 'Irrigation Coverage', description: 'Irrigation project coverage', unit: '%', type: 'DIRECT', source: 'Project Registry', frequency: 'Annual', dataAvailability: 'PARTIAL' },
      { id: 'ai-04', name: 'Agriculture Complaint Rate', description: 'Agriculture complaints per area', unit: 'per 100k', type: 'DERIVED', source: 'Citizen Reports', frequency: 'Monthly', dataAvailability: 'AVAILABLE' },
    ],
    riskRules: [
      { id: 'ar-01', name: 'Irrigation Gap', description: 'Area with agricultural complaints and insufficient irrigation projects', signals: ['CITIZEN_SIGNAL', 'DELAY'], severity: 'MEDIUM', dataRequirements: ['Project data', 'Citizen reports'], dataAvailability: 'PARTIAL' },
      { id: 'ar-02', name: 'Vegetation Anomaly', description: 'Unusual vegetation change patterns', signals: ['ENVIRONMENTAL_CHANGE'], severity: 'MEDIUM', dataRequirements: ['Satellite NDVI'], dataAvailability: 'AVAILABLE' },
    ],
    mapLayers: [
      { id: 'aml-01', name: 'Agriculture Projects', type: 'projects', description: 'Agricultural infrastructure projects', color: '#22c55e', dataAvailability: 'AVAILABLE' },
      { id: 'aml-02', name: 'Vegetation Index', type: 'environmental', description: 'NDVI vegetation health', color: '#16a34a', dataAvailability: 'AVAILABLE' },
      { id: 'aml-03', name: 'Agriculture Complaints', type: 'complaints', description: 'Agriculture-related reports', color: '#f59e0b', dataAvailability: 'AVAILABLE' },
      { id: 'aml-04', name: 'Irrigation Infrastructure', type: 'projects', description: 'Irrigation projects', color: '#0ea5e9', dataAvailability: 'PARTIAL' },
    ],
    dataSources: [
      { id: 'ads-01', name: 'Project Registry', officialSource: 'Ministry of Agriculture', dataset: 'Agricultural projects', department: 'MoA', updateFrequency: 'Annual', apiAvailable: false, dataAvailability: 'PARTIAL', accessMethod: 'Manual ingestion' },
      { id: 'ads-02', name: 'Satellite Imagery', officialSource: 'Copernicus Data Space Ecosystem', dataset: 'Sentinel-2 NDVI', department: 'ESA', updateFrequency: 'Monthly', apiAvailable: true, dataAvailability: 'AVAILABLE', accessMethod: 'CDSE API', dataNote: 'NDVI and vegetation analysis' },
      { id: 'ads-03', name: 'Citizen Reports', officialSource: 'VOJAS Platform', dataset: 'Agriculture complaints', department: 'Community', updateFrequency: 'Ongoing', apiAvailable: true, dataAvailability: 'AVAILABLE', accessMethod: 'VOJAS API' },
    ],
    aiContext: {
      description: 'Agriculture sector monitors agricultural infrastructure, irrigation projects, and vegetation health using satellite data.',
      keyQuestions: ['What agriculture projects are active?', 'Has vegetation health changed?', 'Where are agriculture complaints concentrated?'],
      availableMetrics: ['Project count', 'NDVI change', 'Complaint density', 'Irrigation coverage'],
      typicalAlerts: ['Vegetation anomaly detected', 'Agriculture complaint cluster'],
    },
    dataQualityDimensions: [
      { name: 'Project Data', description: 'Agriculture project registry', applicable: true, dataAvailability: 'PARTIAL' },
      { name: 'Satellite Coverage', description: 'Vegetation index data', applicable: true, dataAvailability: 'AVAILABLE' },
      { name: 'Crop Data', description: 'Individual crop records', applicable: false, dataAvailability: 'NOT_APPLICABLE' },
      { name: 'Citizen Reports', description: 'Agriculture complaints', applicable: true, dataAvailability: 'AVAILABLE' },
    ],
  },

  ENVIRONMENT: {
    code: 'ENVIRONMENT' as ProjectSector,
    name: 'Environment, Forests and Climate Resilience',
    shortName: 'Environment',
    description: 'Monitoring of environmental change using satellite imagery: vegetation, forests, water bodies, land use, fire, and flood risk.',
    color: '#10b981',
    icon: '🌿',
    sections: [
      { id: 'overview', name: 'Overview', description: 'Environmental monitoring overview', enabled: true },
      { id: 'kpis', name: 'KPIs', description: 'Environmental indicators', enabled: true },
      { id: 'map', name: 'Map', description: 'Environmental change map', enabled: true },
      { id: 'trends', name: 'Trends', description: 'Environmental change trends', enabled: true },
      { id: 'hazards', name: 'Hazards', description: 'Fire and flood risk', enabled: true },
      { id: 'data-quality', name: 'Data Quality', description: 'Environmental data quality', enabled: true },
    ],
    indicators: [
      { id: 'envi-01', name: 'Forest Cover Change', description: 'Change in forest extent detected by satellite', unit: 'km²', type: 'SATELLITE', source: 'Copernicus Sentinel-2', frequency: 'Per observation', dataAvailability: 'AVAILABLE', dataNote: 'NDVI-derived vegetation density change' },
      { id: 'envi-02', name: 'Water Body Change', description: 'Change in surface water extent', unit: 'km²', type: 'SATELLITE', source: 'Copernicus Sentinel-2', frequency: 'Per observation', dataAvailability: 'AVAILABLE', dataNote: 'NDWI-derived water extent change' },
      { id: 'envi-03', name: 'Land Use Change', description: 'Changes in land use categories', unit: 'km²', type: 'SATELLITE', source: 'Copernicus Sentinel-2', frequency: 'Annual', dataAvailability: 'PARTIAL', dataNote: 'Requires classification analysis' },
      { id: 'envi-04', name: 'Vegetation Health', description: 'NDVI vegetation condition index', unit: 'index', type: 'SATELLITE', source: 'Copernicus Sentinel-2', frequency: 'Monthly', dataAvailability: 'AVAILABLE' },
      { id: 'envi-05', name: 'Fire Risk Index', description: 'Fire risk based on vegetation and climate factors', unit: 'index', type: 'AI_INTERPRETED', source: 'Satellite + meteorological data', frequency: 'Daily', dataAvailability: 'PARTIAL', dataNote: 'Model-based estimate' },
    ],
    riskRules: [
      { id: 'envr-01', name: 'Significant Vegetation Loss', description: 'Rapid vegetation cover reduction in monitored area', signals: ['ENVIRONMENTAL_CHANGE'], severity: 'HIGH', dataRequirements: ['NDVI time series'], dataAvailability: 'AVAILABLE' },
      { id: 'envr-02', name: 'Water Body Reduction', description: 'Significant decrease in water body extent', signals: ['ENVIRONMENTAL_CHANGE'], severity: 'MEDIUM', dataRequirements: ['NDWI time series'], dataAvailability: 'AVAILABLE' },
      { id: 'envr-03', name: 'Unplanned Land Use Change', description: 'Change in land use without corresponding project', signals: ['ENVIRONMENTAL_CHANGE', 'DELAY'], severity: 'MEDIUM', dataRequirements: ['Land use data', 'Project data'], dataAvailability: 'PARTIAL' },
    ],
    mapLayers: [
      { id: 'envml-01', name: 'Vegetation Index', type: 'environmental', description: 'NDVI vegetation health map', color: '#22c55e', dataAvailability: 'AVAILABLE' },
      { id: 'envml-02', name: 'Water Bodies', type: 'environmental', description: 'Surface water extent', color: '#3b82f6', dataAvailability: 'AVAILABLE' },
      { id: 'envml-03', name: 'Environmental Projects', type: 'projects', description: 'Environmental protection projects', color: '#10b981', dataAvailability: 'AVAILABLE' },
      { id: 'envml-04', name: 'Hazards', type: 'hazards', description: 'Fire and flood risk zones', color: '#ef4444', dataAvailability: 'PARTIAL', dataNote: 'Model-based risk assessment' },
      { id: 'envml-05', name: 'Environmental Alerts', type: 'risk', description: 'Active environmental alerts', color: '#f59e0b', dataAvailability: 'AVAILABLE' },
    ],
    dataSources: [
      { id: 'envds-01', name: 'Satellite Imagery', officialSource: 'Copernicus Data Space Ecosystem', dataset: 'Sentinel-2 L2A', department: 'ESA', updateFrequency: '5-day', apiAvailable: true, dataAvailability: 'AVAILABLE', accessMethod: 'CDSE API', dataNote: 'Primary source for all environmental analysis' },
      { id: 'envds-02', name: 'ISRO BHUVAN', officialSource: 'ISRO', dataset: 'Remote sensing products', department: 'ISRO', updateFrequency: 'Variable', apiAvailable: true, dataAvailability: 'PARTIAL', accessMethod: 'BHUVAN API', dataNote: 'Requires API key' },
      { id: 'envds-03', name: 'India State of Forest Report', officialSource: 'Forest Survey of India', dataset: 'Forest cover data', department: 'MoEFCC', updateFrequency: 'Biennial', apiAvailable: false, dataAvailability: 'AVAILABLE', accessMethod: 'PDF/report ingestion' },
    ],
    aiContext: {
      description: 'Environment sector monitors vegetation health, forest cover, water bodies, and land use change using satellite imagery. All analysis is satellite-derived.',
      keyQuestions: ['Has vegetation cover changed significantly?', 'Has water body extent changed?', 'Are there environmental alerts?', 'What is the current fire risk level?'],
      availableMetrics: ['NDVI change', 'Water extent change', 'Vegetation health index', 'Fire risk index'],
      typicalAlerts: ['Significant vegetation loss', 'Water body reduction', 'High fire risk', 'Unplanned land use change'],
    },
    dataQualityDimensions: [
      { name: 'Satellite Coverage', description: 'Remote sensing imagery availability', applicable: true, dataAvailability: 'AVAILABLE' },
      { name: 'Ground Truth', description: 'On-ground verification data', applicable: true, dataAvailability: 'PARTIAL' },
      { name: 'Historical Data', description: 'Long-term change baseline', applicable: true, dataAvailability: 'AVAILABLE' },
      { name: 'Groundwater Data', description: 'Groundwater level measurements', applicable: false, dataAvailability: 'NOT_APPLICABLE' },
    ],
  },

  TRANSPORT: {
    code: 'TRANSPORT' as ProjectSector,
    name: 'Transport and Connectivity',
    shortName: 'Transport',
    description: 'Monitoring of roads, bridges, and transport infrastructure using satellite imagery and project data.',
    color: '#8b5cf6',
    icon: '🛣️',
    sections: [
      { id: 'overview', name: 'Overview', description: 'Transport sector overview', enabled: true },
      { id: 'kpis', name: 'KPIs', description: 'Transport indicators', enabled: true },
      { id: 'map', name: 'Map', description: 'Transport infrastructure map', enabled: true },
      { id: 'projects', name: 'Projects', description: 'Transport projects', enabled: true },
      { id: 'citizen', name: 'Citizen Signals', description: 'Transport complaints', enabled: true },
      { id: 'data-quality', name: 'Data Quality', description: 'Data completeness', enabled: true },
    ],
    indicators: [
      { id: 'ti-01', name: 'Road Project Completion', description: 'Road and bridge projects completed', unit: 'count', type: 'DIRECT', source: 'Project Registry', frequency: 'Quarterly', dataAvailability: 'AVAILABLE' },
      { id: 'ti-02', name: 'Connectivity Gap', description: 'Estimated connectivity gap from complaints', unit: 'index', type: 'AI_INTERPRETED', source: 'Multi-source analysis', frequency: 'Monthly', dataAvailability: 'PARTIAL' },
      { id: 'ti-03', name: 'Transport Complaint Rate', description: 'Transport infrastructure complaints', unit: 'per 100k', type: 'DERIVED', source: 'Citizen Reports', frequency: 'Monthly', dataAvailability: 'AVAILABLE' },
    ],
    riskRules: [
      { id: 'tr-01', name: 'Road Construction Delay', description: 'Road project delayed beyond deadline', signals: ['DELAY', 'CITIZEN_SIGNAL'], severity: 'MEDIUM', dataRequirements: ['Project timeline', 'Satellite imagery'], dataAvailability: 'AVAILABLE' },
      { id: 'tr-02', name: 'Connectivity Gap', description: 'Area with high complaints and low coverage', signals: ['CITIZEN_SIGNAL', 'DELAY'], severity: 'MEDIUM', dataRequirements: ['Project data', 'Citizen reports'], dataAvailability: 'PARTIAL' },
    ],
    mapLayers: [
      { id: 'tml-01', name: 'Transport Projects', type: 'projects', description: 'Roads and bridges', color: '#8b5cf6', dataAvailability: 'AVAILABLE' },
      { id: 'tml-02', name: 'Transport Complaints', type: 'complaints', description: 'Transport infrastructure reports', color: '#f59e0b', dataAvailability: 'AVAILABLE' },
      { id: 'tml-03', name: 'Satellite Evidence', type: 'satellite', description: 'Road/bridge construction observations', color: '#22c55e', dataAvailability: 'PARTIAL', dataNote: 'Where project boundaries defined' },
    ],
    dataSources: [
      { id: 'tds-01', name: 'Project Registry', officialSource: 'Ministry of Road Transport', dataset: 'Road projects', department: 'MoRTH', updateFrequency: 'Quarterly', apiAvailable: false, dataAvailability: 'PARTIAL', accessMethod: 'Manual ingestion' },
      { id: 'tds-02', name: 'Satellite Imagery', officialSource: 'Copernicus Data Space Ecosystem', dataset: 'Sentinel-2', department: 'ESA', updateFrequency: '5-day', apiAvailable: true, dataAvailability: 'AVAILABLE', accessMethod: 'CDSE API' },
      { id: 'tds-03', name: 'Citizen Reports', officialSource: 'VOJAS Platform', dataset: 'Transport complaints', department: 'Community', updateFrequency: 'Ongoing', apiAvailable: true, dataAvailability: 'AVAILABLE', accessMethod: 'VOJAS API' },
    ],
    aiContext: {
      description: 'Transport sector monitors road, bridge, and transport infrastructure projects and citizen-reported issues.',
      keyQuestions: ['What transport projects are in progress?', 'Are there road construction delays?', 'Where are connectivity complaints?'],
      availableMetrics: ['Project count', 'Completion rate', 'Complaint density'],
      typicalAlerts: ['Road construction delay', 'Connectivity complaint cluster'],
    },
    dataQualityDimensions: [
      { name: 'Project Data', description: 'Transport project registry', applicable: true, dataAvailability: 'PARTIAL' },
      { name: 'Satellite Coverage', description: 'Road/bridge imagery', applicable: true, dataAvailability: 'PARTIAL' },
      { name: 'Citizen Reports', description: 'Transport complaints', applicable: true, dataAvailability: 'AVAILABLE' },
    ],
  },

  ENERGY: {
    code: 'ENERGY' as ProjectSector,
    name: 'Energy and Power Infrastructure',
    shortName: 'Energy',
    description: 'Monitoring of power infrastructure, renewable energy projects, and electrification programs.',
    color: '#eab308',
    icon: '⚡',
    sections: [
      { id: 'overview', name: 'Overview', description: 'Energy sector overview', enabled: true },
      { id: 'kpis', name: 'KPIs', description: 'Energy indicators', enabled: true },
      { id: 'map', name: 'Map', description: 'Energy infrastructure map', enabled: true },
      { id: 'projects', name: 'Projects', description: 'Energy projects', enabled: true },
      { id: 'citizen', name: 'Citizen Signals', description: 'Energy complaints', enabled: true },
      { id: 'data-quality', name: 'Data Quality', description: 'Data completeness', enabled: true },
    ],
    indicators: [
      { id: 'eni-01', name: 'Energy Project Completion', description: 'Power and energy projects completed', unit: 'count', type: 'DIRECT', source: 'Project Registry', frequency: 'Quarterly', dataAvailability: 'AVAILABLE' },
      { id: 'eni-02', name: 'Renewable Project Rate', description: 'Share of renewable energy projects', unit: '%', type: 'DERIVED', source: 'Project Registry', frequency: 'Annual', dataAvailability: 'AVAILABLE' },
      { id: 'eni-03', name: 'Energy Complaint Rate', description: 'Power supply complaints', unit: 'per 100k', type: 'DERIVED', source: 'Citizen Reports', frequency: 'Monthly', dataAvailability: 'AVAILABLE' },
    ],
    riskRules: [
      { id: 'enr-01', name: 'Energy Project Delay', description: 'Power project delayed beyond expected completion', signals: ['DELAY'], severity: 'MEDIUM', dataRequirements: ['Project timeline'], dataAvailability: 'AVAILABLE' },
    ],
    mapLayers: [
      { id: 'enml-01', name: 'Energy Projects', type: 'projects', description: 'Power and energy projects', color: '#eab308', dataAvailability: 'AVAILABLE' },
      { id: 'enml-02', name: 'Energy Complaints', type: 'complaints', description: 'Power supply reports', color: '#f59e0b', dataAvailability: 'AVAILABLE' },
    ],
    dataSources: [
      { id: 'ends-01', name: 'Project Registry', officialSource: 'Ministry of Power', dataset: 'Power projects', department: 'MoP', updateFrequency: 'Quarterly', apiAvailable: false, dataAvailability: 'PARTIAL', accessMethod: 'Manual ingestion' },
      { id: 'ends-02', name: 'Citizen Reports', officialSource: 'VOJAS Platform', dataset: 'Energy complaints', department: 'Community', updateFrequency: 'Ongoing', apiAvailable: true, dataAvailability: 'AVAILABLE', accessMethod: 'VOJAS API' },
    ],
    aiContext: {
      description: 'Energy sector monitors power infrastructure projects and citizen-reported power supply issues.',
      keyQuestions: ['What energy projects are active?', 'Are there project delays?', 'Where are power complaints concentrated?'],
      availableMetrics: ['Project count', 'Renewable share', 'Complaint density'],
      typicalAlerts: ['Energy project delay', 'Power complaint cluster'],
    },
    dataQualityDimensions: [
      { name: 'Project Data', description: 'Energy project registry', applicable: true, dataAvailability: 'PARTIAL' },
      { name: 'Generation Data', description: 'Power generation statistics', applicable: false, dataAvailability: 'NOT_APPLICABLE' },
      { name: 'Citizen Reports', description: 'Power complaints', applicable: true, dataAvailability: 'AVAILABLE' },
    ],
  },

  HOUSING: {
    code: 'HOUSING' as ProjectSector,
    name: 'Housing and Urban Development',
    shortName: 'Housing',
    description: 'Monitoring of housing projects, urban development schemes, and land use change.',
    color: '#f97316',
    icon: '🏠',
    sections: [
      { id: 'overview', name: 'Overview', description: 'Housing sector overview', enabled: true },
      { id: 'kpis', name: 'KPIs', description: 'Housing indicators', enabled: true },
      { id: 'map', name: 'Map', description: 'Housing map', enabled: true },
      { id: 'trends', name: 'Trends', description: 'Urban change trends', enabled: true },
      { id: 'projects', name: 'Projects', description: 'Housing projects', enabled: true },
      { id: 'citizen', name: 'Citizen Signals', description: 'Housing complaints', enabled: true },
      { id: 'data-quality', name: 'Data Quality', description: 'Data completeness', enabled: true },
    ],
    indicators: [
      { id: 'hoi-01', name: 'Housing Project Completion', description: 'Housing projects completed', unit: 'count', type: 'DIRECT', source: 'Project Registry', frequency: 'Quarterly', dataAvailability: 'AVAILABLE' },
      { id: 'hoi-02', name: 'Urban Expansion', description: 'Urban area change detected by satellite', unit: 'km²', type: 'SATELLITE', source: 'Copernicus Sentinel-2', frequency: 'Annual', dataAvailability: 'AVAILABLE' },
      { id: 'hoi-03', name: 'Housing Complaint Rate', description: 'Housing and urban complaints', unit: 'per 100k', type: 'DERIVED', source: 'Citizen Reports', frequency: 'Monthly', dataAvailability: 'AVAILABLE' },
    ],
    riskRules: [
      { id: 'hor-01', name: 'Housing Project Delay', description: 'Housing project delayed beyond deadline', signals: ['DELAY', 'CITIZEN_SIGNAL'], severity: 'MEDIUM', dataRequirements: ['Project timeline', 'Citizen reports'], dataAvailability: 'AVAILABLE' },
    ],
    mapLayers: [
      { id: 'homl-01', name: 'Housing Projects', type: 'projects', description: 'Housing and urban projects', color: '#f97316', dataAvailability: 'AVAILABLE' },
      { id: 'homl-02', name: 'Urban Extent', type: 'environmental', description: 'Urban area from satellite', color: '#ef4444', dataAvailability: 'AVAILABLE' },
      { id: 'homl-03', name: 'Housing Complaints', type: 'complaints', description: 'Housing-related reports', color: '#f59e0b', dataAvailability: 'AVAILABLE' },
    ],
    dataSources: [
      { id: 'hods-01', name: 'Project Registry', officialSource: 'Ministry of Housing and Urban Affairs', dataset: 'Housing projects', department: 'MoHUA', updateFrequency: 'Quarterly', apiAvailable: false, dataAvailability: 'PARTIAL', accessMethod: 'Manual ingestion' },
      { id: 'hods-02', name: 'Satellite Imagery', officialSource: 'Copernicus Data Space Ecosystem', dataset: 'Sentinel-2', department: 'ESA', updateFrequency: 'Annual', apiAvailable: true, dataAvailability: 'AVAILABLE', accessMethod: 'CDSE API', dataNote: 'Urban extent analysis' },
      { id: 'hods-03', name: 'Citizen Reports', officialSource: 'VOJAS Platform', dataset: 'Housing complaints', department: 'Community', updateFrequency: 'Ongoing', apiAvailable: true, dataAvailability: 'AVAILABLE', accessMethod: 'VOJAS API' },
    ],
    aiContext: {
      description: 'Housing sector monitors housing projects, urban development, and land use change.',
      keyQuestions: ['What housing projects are active?', 'Is urban area expanding?', 'Where are housing complaints?'],
      availableMetrics: ['Project count', 'Urban extent change', 'Complaint density'],
      typicalAlerts: ['Housing project delay', 'Unusual urban expansion'],
    },
    dataQualityDimensions: [
      { name: 'Project Data', description: 'Housing project registry', applicable: true, dataAvailability: 'PARTIAL' },
      { name: 'Satellite Coverage', description: 'Urban extent imagery', applicable: true, dataAvailability: 'AVAILABLE' },
      { name: 'Citizen Reports', description: 'Housing complaints', applicable: true, dataAvailability: 'AVAILABLE' },
    ],
  },

  RURAL_DEVELOPMENT: {
    code: 'RURAL_DEVELOPMENT' as ProjectSector,
    name: 'Rural Development and Panchayati Raj',
    shortName: 'Rural Dev',
    description: 'Monitoring of rural infrastructure, MGNREGA works, village asset mapping, and rural service delivery.',
    color: '#84cc16',
    icon: '🌾',
    sections: [
      { id: 'overview', name: 'Overview', description: 'Rural development overview', enabled: true },
      { id: 'kpis', name: 'KPIs', description: 'Rural indicators', enabled: true },
      { id: 'map', name: 'Map', description: 'Rural infrastructure map', enabled: true },
      { id: 'projects', name: 'Projects', description: 'Rural projects', enabled: true },
      { id: 'citizen', name: 'Citizen Signals', description: 'Rural service complaints', enabled: true },
      { id: 'data-quality', name: 'Data Quality', description: 'Data completeness', enabled: true },
    ],
    indicators: [
      { id: 'rdi-01', name: 'Rural Project Completion', description: 'Rural development projects completed', unit: 'count', type: 'DIRECT', source: 'Project Registry', frequency: 'Quarterly', dataAvailability: 'AVAILABLE' },
      { id: 'rdi-02', name: 'Rural Infrastructure Gap', description: 'Estimated rural infrastructure gap', unit: 'index', type: 'AI_INTERPRETED', source: 'Multi-source analysis', frequency: 'Monthly', dataAvailability: 'PARTIAL' },
      { id: 'rdi-03', name: 'Rural Complaint Rate', description: 'Rural service complaints', unit: 'per 100k', type: 'DERIVED', source: 'Citizen Reports', frequency: 'Monthly', dataAvailability: 'AVAILABLE' },
    ],
    riskRules: [
      { id: 'rdr-01', name: 'Rural Infrastructure Gap', description: 'Area with low project coverage and high complaints', signals: ['CITIZEN_SIGNAL', 'DELAY'], severity: 'MEDIUM', dataRequirements: ['Project data', 'Citizen reports'], dataAvailability: 'PARTIAL' },
    ],
    mapLayers: [
      { id: 'rdml-01', name: 'Rural Projects', type: 'projects', description: 'Rural infrastructure projects', color: '#84cc16', dataAvailability: 'AVAILABLE' },
      { id: 'rdml-02', name: 'Rural Complaints', type: 'complaints', description: 'Rural service reports', color: '#f59e0b', dataAvailability: 'AVAILABLE' },
    ],
    dataSources: [
      { id: 'rdds-01', name: 'Project Registry', officialSource: 'Ministry of Rural Development', dataset: 'Rural projects', department: 'MoRD', updateFrequency: 'Quarterly', apiAvailable: false, dataAvailability: 'PARTIAL', accessMethod: 'Manual ingestion' },
      { id: 'rdds-02', name: 'Citizen Reports', officialSource: 'VOJAS Platform', dataset: 'Rural complaints', department: 'Community', updateFrequency: 'Ongoing', apiAvailable: true, dataAvailability: 'AVAILABLE', accessMethod: 'VOJAS API' },
    ],
    aiContext: {
      description: 'Rural development sector monitors rural infrastructure projects and citizen-reported rural service issues.',
      keyQuestions: ['What rural projects are active?', 'Where are rural service gaps?', 'What is the infrastructure gap?'],
      availableMetrics: ['Project count', 'Completion rate', 'Complaint density'],
      typicalAlerts: ['Rural infrastructure gap', 'Rural complaint cluster'],
    },
    dataQualityDimensions: [
      { name: 'Project Data', description: 'Rural project registry', applicable: true, dataAvailability: 'PARTIAL' },
      { name: 'MGNREGA Data', description: 'MGNREGA work data', applicable: false, dataAvailability: 'NOT_APPLICABLE', dataNote: 'Requires separate authorization' },
      { name: 'Citizen Reports', description: 'Rural complaints', applicable: true, dataAvailability: 'AVAILABLE' },
    ],
  },

  SOCIAL_WELFARE: {
    code: 'SOCIAL_WELFARE' as ProjectSector,
    name: 'Social Welfare and Public Benefits',
    shortName: 'Social Welfare',
    description: 'Monitoring of social welfare schemes, benefit delivery, and public distribution system.',
    color: '#ec4899',
    icon: '🤝',
    sections: [
      { id: 'overview', name: 'Overview', description: 'Social welfare overview', enabled: true },
      { id: 'kpis', name: 'KPIs', description: 'Welfare indicators', enabled: true },
      { id: 'map', name: 'Map', description: 'Welfare delivery map', enabled: true },
      { id: 'citizen', name: 'Citizen Signals', description: 'Benefit delivery complaints', enabled: true },
      { id: 'data-quality', name: 'Data Quality', description: 'Data completeness', enabled: true },
    ],
    indicators: [
      { id: 'swi-01', name: 'Welfare Project Completion', description: 'Social welfare projects completed', unit: 'count', type: 'DIRECT', source: 'Project Registry', frequency: 'Quarterly', dataAvailability: 'AVAILABLE' },
      { id: 'swi-02', name: 'Benefit Delivery Gap', description: 'Estimated benefit delivery gap from complaints', unit: 'index', type: 'AI_INTERPRETED', source: 'Complaint analysis', frequency: 'Monthly', dataAvailability: 'PARTIAL' },
      { id: 'swi-03', name: 'Welfare Complaint Rate', description: 'Benefit delivery complaints', unit: 'per 100k', type: 'DERIVED', source: 'Citizen Reports', frequency: 'Monthly', dataAvailability: 'AVAILABLE' },
    ],
    riskRules: [
      { id: 'swr-01', name: 'Benefit Delivery Gap', description: 'Area with high complaints about benefit non-receipt', signals: ['CITIZEN_SIGNAL'], severity: 'MEDIUM', dataRequirements: ['Citizen reports'], dataAvailability: 'AVAILABLE' },
    ],
    mapLayers: [
      { id: 'swml-01', name: 'Welfare Projects', type: 'projects', description: 'Social welfare projects', color: '#ec4899', dataAvailability: 'AVAILABLE' },
      { id: 'swml-02', name: 'Welfare Complaints', type: 'complaints', description: 'Benefit delivery reports', color: '#f59e0b', dataAvailability: 'AVAILABLE' },
    ],
    dataSources: [
      { id: 'swds-01', name: 'Project Registry', officialSource: 'Ministry of Social Justice', dataset: 'Welfare projects', department: 'MoSJ&E', updateFrequency: 'Annual', apiAvailable: false, dataAvailability: 'PARTIAL', accessMethod: 'Manual ingestion' },
      { id: 'swds-02', name: 'Citizen Reports', officialSource: 'VOJAS Platform', dataset: 'Benefit complaints', department: 'Community', updateFrequency: 'Ongoing', apiAvailable: true, dataAvailability: 'AVAILABLE', accessMethod: 'VOJAS API' },
    ],
    aiContext: {
      description: 'Social welfare sector monitors benefit delivery and citizen-reported welfare scheme issues. Beneficiary personal data is never exposed.',
      keyQuestions: ['Where are welfare delivery complaints concentrated?', 'What is the benefit delivery gap?'],
      availableMetrics: ['Project count', 'Complaint density', 'Gap index'],
      typicalAlerts: ['Benefit delivery complaint cluster', 'Payment delay pattern'],
    },
    dataQualityDimensions: [
      { name: 'Project Data', description: 'Welfare project registry', applicable: true, dataAvailability: 'PARTIAL' },
      { name: 'Beneficiary Data', description: 'Individual beneficiary records', applicable: false, dataAvailability: 'NOT_APPLICABLE', dataNote: 'Protected personal data' },
      { name: 'Citizen Reports', description: 'Welfare complaints', applicable: true, dataAvailability: 'AVAILABLE' },
    ],
  },

  PUBLIC_ADMIN: {
    code: 'PUBLIC_ADMIN' as ProjectSector,
    name: 'Public Administration and Citizen Services',
    shortName: 'Public Admin',
    description: 'Complaint classification, department routing, duplicate detection, and public service delivery analysis.',
    color: '#64748b',
    icon: '🏛️',
    sections: [
      { id: 'overview', name: 'Overview', description: 'Public administration overview', enabled: true },
      { id: 'kpis', name: 'KPIs', description: 'Service delivery indicators', enabled: true },
      { id: 'map', name: 'Map', description: 'Complaint density map', enabled: true },
      { id: 'alerts', name: 'Alerts', description: 'Anomaly alerts', enabled: true },
      { id: 'trends', name: 'Trends', description: 'Complaint trends', enabled: true },
      { id: 'data-quality', name: 'Data Quality', description: 'Data completeness', enabled: true },
    ],
    indicators: [
      { id: 'pai-01', name: 'Complaint Resolution Rate', description: 'Percentage of complaints resolved', unit: '%', type: 'DERIVED', source: 'Citizen Reports', frequency: 'Monthly', calculation: 'count(resolved) / count(total)', dataAvailability: 'AVAILABLE' },
      { id: 'pai-02', name: 'Average Resolution Time', description: 'Average days to resolve complaints', unit: 'days', type: 'DERIVED', source: 'Citizen Reports', frequency: 'Monthly', calculation: 'avg(resolved_at - submitted_at)', dataAvailability: 'AVAILABLE' },
      { id: 'pai-03', name: 'Duplicate Complaint Rate', description: 'Percentage of complaints flagged as duplicates', unit: '%', type: 'DERIVED', source: 'AI triage', frequency: 'Monthly', calculation: 'count(duplicate) / count(total)', dataAvailability: 'AVAILABLE' },
      { id: 'pai-04', name: 'Recurring Problem Index', description: 'AI-interpreted measure of recurring complaint patterns', unit: 'index', type: 'AI_INTERPRETED', source: 'AI triage analysis', frequency: 'Weekly', dataAvailability: 'AVAILABLE' },
    ],
    riskRules: [
      { id: 'par-01', name: 'Resolution Time Anomaly', description: 'Unusually long resolution times in a department', signals: ['CITIZEN_SIGNAL', 'DELAY'], severity: 'MEDIUM', dataRequirements: ['Report timeline'], dataAvailability: 'AVAILABLE' },
      { id: 'par-02', name: 'Recurring Problem Pattern', description: 'Same issue reported repeatedly in same area', signals: ['COMPLAINT_SPIKE', 'CITIZEN_SIGNAL'], severity: 'MEDIUM', dataRequirements: ['Report clustering'], dataAvailability: 'AVAILABLE' },
    ],
    mapLayers: [
      { id: 'paml-01', name: 'Complaint Density', type: 'complaints', description: 'Citizen complaint heatmap', color: '#f59e0b', dataAvailability: 'AVAILABLE' },
      { id: 'paml-02', name: 'Anomaly Alerts', type: 'risk', description: 'Active anomaly alerts', color: '#ef4444', dataAvailability: 'AVAILABLE' },
    ],
    dataSources: [
      { id: 'pads-01', name: 'Citizen Reports', officialSource: 'VOJAS Platform', dataset: 'All citizen complaints', department: 'Community', updateFrequency: 'Ongoing', apiAvailable: true, dataAvailability: 'AVAILABLE', accessMethod: 'VOJAS API' },
      { id: 'pads-02', name: 'M10 AI Triage', officialSource: 'VOJAS AI Engine', dataset: 'AI-analyzed complaints', department: 'VOJAS', updateFrequency: 'Per submission', apiAvailable: true, dataAvailability: 'AVAILABLE', accessMethod: 'VOJAS API', dataNote: 'AI-generated category and priority' },
    ],
    aiContext: {
      description: 'Public administration sector classifies and routes citizen complaints, detects duplicate patterns, and identifies recurring service delivery problems.',
      keyQuestions: ['What are the top complaint categories?', 'Which areas have the longest resolution times?', 'Are there recurring problems?', 'What departments need attention?'],
      availableMetrics: ['Resolution rate', 'Resolution time', 'Duplicate rate', 'Recurring problem index'],
      typicalAlerts: ['Long resolution times', 'Duplicate complaint cluster', 'Recurring problem detected'],
    },
    dataQualityDimensions: [
      { name: 'Citizen Reports', description: 'All citizen complaints', applicable: true, dataAvailability: 'AVAILABLE' },
      { name: 'Department Data', description: 'Internal department metrics', applicable: false, dataAvailability: 'NOT_APPLICABLE' },
    ],
  },

  FINANCE_PROCUREMENT: {
    code: 'FINANCE_PROCUREMENT' as ProjectSector,
    name: 'Public Finance, Procurement and Expenditure',
    shortName: 'Finance',
    description: 'Monitoring of public expenditure, procurement patterns, budget utilization, and financial anomalies.',
    color: '#0d9488',
    icon: '💰',
    sections: [
      { id: 'overview', name: 'Overview', description: 'Financial overview', enabled: true },
      { id: 'kpis', name: 'KPIs', description: 'Financial indicators', enabled: true },
      { id: 'map', name: 'Map', description: 'Financial risk map', enabled: true },
      { id: 'alerts', name: 'Alerts', description: 'Financial anomaly alerts', enabled: true },
      { id: 'data-quality', name: 'Data Quality', description: 'Data completeness', enabled: true },
    ],
    indicators: [
      { id: 'fpi-01', name: 'Overall Fund Utilization', description: 'Percentage of total funds utilized', unit: '%', type: 'DERIVED', source: 'Financial Records', frequency: 'Quarterly', calculation: 'sum(spent) / sum(approved)', dataAvailability: 'AVAILABLE' },
      { id: 'fpi-02', name: 'Financial Anomaly Rate', description: 'Percentage of projects with financial anomalies', unit: '%', type: 'AI_INTERPRETED', source: 'Risk Engine', frequency: 'Weekly', calculation: 'count(anomaly=financial) / count(total)', dataAvailability: 'AVAILABLE' },
      { id: 'fpi-03', name: 'Budget Variance', description: 'Average deviation from budgeted amounts', unit: '%', type: 'DERIVED', source: 'Financial Records', frequency: 'Quarterly', calculation: 'avg(abs(approved - spent) / approved)', dataAvailability: 'AVAILABLE' },
      { id: 'fpi-04', name: 'Procurement Anomaly Score', description: 'AI-detected procurement pattern anomalies', unit: 'index', type: 'AI_INTERPRETED', source: 'Risk Engine', frequency: 'Weekly', dataAvailability: 'AVAILABLE' },
    ],
    riskRules: [
      { id: 'fpr-01', name: 'High Financial Utilization', description: 'Expenditure rate unusually high relative to progress', signals: ['FINANCIAL_ANOMALY'], severity: 'CRITICAL', dataRequirements: ['Financial records', 'Progress data'], dataAvailability: 'AVAILABLE' },
      { id: 'fpr-02', name: 'Procurement Pattern Anomaly', description: 'Unusual procurement contract patterns', signals: ['FINANCIAL_ANOMALY', 'PROCUREMENT_PATTERN'], severity: 'HIGH', dataRequirements: ['Contract data', 'Vendor data'], dataAvailability: 'PARTIAL' },
      { id: 'fpr-03', name: 'Budget Overrun', description: 'Project significantly exceeding approved budget', signals: ['FINANCIAL_ANOMALY'], severity: 'HIGH', dataRequirements: ['Financial records'], dataAvailability: 'AVAILABLE' },
    ],
    mapLayers: [
      { id: 'fpml-01', name: 'Financial Risk', type: 'risk', description: 'Projects color-coded by financial risk', color: '#ef4444', dataAvailability: 'AVAILABLE' },
      { id: 'fpml-02', name: 'Utilization Heatmap', type: 'financial', description: 'Fund utilization by area', color: '#0d9488', dataAvailability: 'AVAILABLE' },
      { id: 'fpml-03', name: 'Anomaly Alerts', type: 'risk', description: 'Financial anomaly alerts', color: '#f59e0b', dataAvailability: 'AVAILABLE' },
    ],
    dataSources: [
      { id: 'fpds-01', name: 'Financial Records', officialSource: 'CPIS Portal', dataset: 'Project expenditure', department: 'MoSPI', updateFrequency: 'Monthly', apiAvailable: true, dataAvailability: 'AVAILABLE', accessMethod: 'CPIS.nic.in' },
      { id: 'fpds-02', name: 'Risk Engine', officialSource: 'VOJAS AI Engine', dataset: 'Financial anomalies', department: 'VOJAS', updateFrequency: 'Weekly', apiAvailable: true, dataAvailability: 'AVAILABLE', accessMethod: 'VOJAS API', dataNote: 'AI-detected financial patterns' },
    ],
    aiContext: {
      description: 'Finance sector monitors public expenditure, detects financial anomalies, and identifies procurement pattern irregularities.',
      keyQuestions: ['What is the overall fund utilization?', 'Which projects have financial anomalies?', 'Are there procurement pattern irregularities?', 'What is the budget variance?'],
      availableMetrics: ['Fund utilization', 'Anomaly rate', 'Budget variance', 'Procurement anomaly score'],
      typicalAlerts: ['High utilization without completion', 'Budget overrun detected', 'Procurement pattern anomaly', 'Financial risk cluster'],
    },
    dataQualityDimensions: [
      { name: 'Financial Data', description: 'Budget and expenditure records', applicable: true, dataAvailability: 'AVAILABLE' },
      { name: 'Contract Data', description: 'Procurement contract details', applicable: true, dataAvailability: 'PARTIAL' },
      { name: 'Vendor Data', description: 'Vendor relationship data', applicable: true, dataAvailability: 'AVAILABLE' },
    ],
  },

  JUSTICE: {
    code: 'JUSTICE' as ProjectSector,
    name: 'Justice, Judiciary and Legal Services',
    shortName: 'Justice',
    description: 'Monitoring of justice sector service delivery using aggregated administrative data.',
    color: '#7c3aed',
    icon: '⚖️',
    sections: [
      { id: 'overview', name: 'Overview', description: 'Justice sector overview', enabled: true },
      { id: 'kpis', name: 'KPIs', description: 'Justice indicators', enabled: true },
      { id: 'citizen', name: 'Citizen Signals', description: 'Justice service complaints', enabled: true },
      { id: 'data-quality', name: 'Data Quality', description: 'Data completeness', enabled: true },
    ],
    indicators: [
      { id: 'ji-01', name: 'Justice Project Completion', description: 'Justice infrastructure projects completed', unit: 'count', type: 'DIRECT', source: 'Project Registry', frequency: 'Quarterly', dataAvailability: 'AVAILABLE' },
      { id: 'ji-02', name: 'Justice Service Complaint Rate', description: 'Justice service complaints per area', unit: 'per 100k', type: 'DERIVED', source: 'Citizen Reports', frequency: 'Monthly', dataAvailability: 'AVAILABLE' },
    ],
    riskRules: [
      { id: 'jr-01', name: 'Justice Service Gap', description: 'Area with high complaints and low project coverage', signals: ['CITIZEN_SIGNAL'], severity: 'MEDIUM', dataRequirements: ['Citizen reports', 'Project data'], dataAvailability: 'PARTIAL' },
    ],
    mapLayers: [
      { id: 'jml-01', name: 'Justice Projects', type: 'projects', description: 'Court and justice infrastructure', color: '#7c3aed', dataAvailability: 'AVAILABLE' },
      { id: 'jml-02', name: 'Justice Complaints', type: 'complaints', description: 'Justice service reports', color: '#f59e0b', dataAvailability: 'AVAILABLE' },
    ],
    dataSources: [
      { id: 'jds-01', name: 'Project Registry', officialSource: 'Ministry of Law and Justice', dataset: 'Justice projects', department: 'MoLJ', updateFrequency: 'Annual', apiAvailable: false, dataAvailability: 'PARTIAL', accessMethod: 'Manual ingestion' },
      { id: 'jds-02', name: 'Citizen Reports', officialSource: 'VOJAS Platform', dataset: 'Justice complaints', department: 'Community', updateFrequency: 'Ongoing', apiAvailable: true, dataAvailability: 'AVAILABLE', accessMethod: 'VOJAS API' },
    ],
    aiContext: {
      description: 'Justice sector monitors court and legal service infrastructure and citizen-reported justice service issues. Case-level sensitive information is never exposed.',
      keyQuestions: ['What justice infrastructure projects are active?', 'Where are justice service complaints concentrated?'],
      availableMetrics: ['Project count', 'Complaint density'],
      typicalAlerts: ['Justice complaint cluster'],
    },
    dataQualityDimensions: [
      { name: 'Project Data', description: 'Justice project registry', applicable: true, dataAvailability: 'PARTIAL' },
      { name: 'Case Data', description: 'Individual court case records', applicable: false, dataAvailability: 'NOT_APPLICABLE', dataNote: 'Protected judicial records' },
      { name: 'Citizen Reports', description: 'Justice complaints', applicable: true, dataAvailability: 'AVAILABLE' },
    ],
  },

  LEGISLATIVE: {
    code: 'LEGISLATIVE' as ProjectSector,
    name: 'Legislative Affairs and Public Office Integrity',
    shortName: 'Legislative',
    description: 'Public record matching, official document search, and public integrity monitoring.',
    color: '#b45309',
    icon: '🏛️',
    sections: [
      { id: 'overview', name: 'Overview', description: 'Legislative sector overview', enabled: true },
      { id: 'projects', name: 'Projects', description: 'Legislative projects', enabled: true },
      { id: 'data-quality', name: 'Data Quality', description: 'Data completeness', enabled: true },
    ],
    indicators: [
      { id: 'li-01', name: 'Legislative Project Completion', description: 'Parliamentary/legislative infrastructure projects', unit: 'count', type: 'DIRECT', source: 'Project Registry', frequency: 'Quarterly', dataAvailability: 'AVAILABLE' },
    ],
    riskRules: [],
    mapLayers: [
      { id: 'lml-01', name: 'Legislative Projects', type: 'projects', description: 'Parliamentary infrastructure', color: '#b45309', dataAvailability: 'AVAILABLE' },
    ],
    dataSources: [
      { id: 'lds-01', name: 'Project Registry', officialSource: 'Lok Sabha Secretariat', dataset: 'Parliament projects', department: 'Lok Sabha', updateFrequency: 'Annual', apiAvailable: false, dataAvailability: 'PARTIAL', accessMethod: 'Manual ingestion' },
    ],
    aiContext: {
      description: 'Legislative sector monitors parliamentary and legislative infrastructure projects.',
      keyQuestions: ['What legislative projects are active?'],
      availableMetrics: ['Project count', 'Completion rate'],
      typicalAlerts: [],
    },
    dataQualityDimensions: [
      { name: 'Project Data', description: 'Legislative project registry', applicable: true, dataAvailability: 'PARTIAL' },
      { name: 'Case Data', description: 'Individual MP records', applicable: false, dataAvailability: 'NOT_APPLICABLE', dataNote: 'Protected personal data' },
    ],
  },

  PUBLIC_SAFETY: {
    code: 'PUBLIC_SAFETY' as ProjectSector,
    name: 'Public Safety, Policing and Emergency Response',
    shortName: 'Public Safety',
    description: 'Monitoring of public safety infrastructure, emergency response, and hazard zones using satellite and administrative data.',
    color: '#dc2626',
    icon: '🚨',
    sections: [
      { id: 'overview', name: 'Overview', description: 'Public safety overview', enabled: true },
      { id: 'kpis', name: 'KPIs', description: 'Safety indicators', enabled: true },
      { id: 'map', name: 'Map', description: 'Safety infrastructure map', enabled: true },
      { id: 'hazards', name: 'Hazards', description: 'Hazard zones and risk areas', enabled: true },
      { id: 'projects', name: 'Projects', description: 'Safety projects', enabled: true },
      { id: 'citizen', name: 'Citizen Signals', description: 'Safety emergency reports', enabled: true },
      { id: 'data-quality', name: 'Data Quality', description: 'Data completeness', enabled: true },
    ],
    indicators: [
      { id: 'psi-01', name: 'Safety Project Completion', description: 'Public safety infrastructure projects completed', unit: 'count', type: 'DIRECT', source: 'Project Registry', frequency: 'Quarterly', dataAvailability: 'AVAILABLE' },
      { id: 'psi-02', name: 'Flood Risk Area', description: 'Areas identified as flood risk from satellite', unit: 'km²', type: 'SATELLITE', source: 'Satellite analysis', frequency: 'Per observation', dataAvailability: 'PARTIAL', dataNote: 'Model-based flood risk assessment' },
      { id: 'psi-03', name: 'Safety Complaint Rate', description: 'Public safety emergency complaints', unit: 'per 100k', type: 'DERIVED', source: 'Citizen Reports', frequency: 'Monthly', dataAvailability: 'AVAILABLE' },
    ],
    riskRules: [
      { id: 'psr-01', name: 'Safety Infrastructure Gap', description: 'Area with high safety complaints and low coverage', signals: ['CITIZEN_SIGNAL'], severity: 'HIGH', dataRequirements: ['Citizen reports', 'Project data'], dataAvailability: 'PARTIAL' },
    ],
    mapLayers: [
      { id: 'psml-01', name: 'Safety Projects', type: 'projects', description: 'Police and emergency infrastructure', color: '#dc2626', dataAvailability: 'AVAILABLE' },
      { id: 'psml-02', name: 'Hazard Zones', type: 'hazards', description: 'Flood and fire risk areas', color: '#f59e0b', dataAvailability: 'PARTIAL', dataNote: 'Model-based risk assessment' },
      { id: 'psml-03', name: 'Safety Complaints', type: 'complaints', description: 'Emergency and safety reports', color: '#ef4444', dataAvailability: 'AVAILABLE' },
    ],
    dataSources: [
      { id: 'psds-01', name: 'Project Registry', officialSource: 'Ministry of Home Affairs', dataset: 'Police and safety projects', department: 'MHA', updateFrequency: 'Annual', apiAvailable: false, dataAvailability: 'PARTIAL', accessMethod: 'Manual ingestion' },
      { id: 'psds-02', name: 'Satellite Imagery', officialSource: 'Copernicus Data Space Ecosystem', dataset: 'Sentinel-2', department: 'ESA', updateFrequency: 'Per observation', apiAvailable: true, dataAvailability: 'AVAILABLE', accessMethod: 'CDSE API', dataNote: 'Flood extent analysis' },
      { id: 'psds-03', name: 'Citizen Reports', officialSource: 'VOJAS Platform', dataset: 'Safety complaints', department: 'Community', updateFrequency: 'Ongoing', apiAvailable: true, dataAvailability: 'AVAILABLE', accessMethod: 'VOJAS API' },
    ],
    aiContext: {
      description: 'Public safety sector monitors safety infrastructure, hazard zones, and citizen-reported emergency issues. Sensitive operational policing information is never exposed.',
      keyQuestions: ['What safety projects are active?', 'Where are hazard risk areas?', 'Where are safety complaints concentrated?'],
      availableMetrics: ['Project count', 'Hazard area', 'Complaint density'],
      typicalAlerts: ['Safety infrastructure gap', 'Safety complaint cluster'],
    },
    dataQualityDimensions: [
      { name: 'Project Data', description: 'Safety project registry', applicable: true, dataAvailability: 'PARTIAL' },
      { name: 'Operational Data', description: 'Police operational records', applicable: false, dataAvailability: 'NOT_APPLICABLE', dataNote: 'Protected operational data' },
      { name: 'Satellite Coverage', description: 'Hazard zone imagery', applicable: true, dataAvailability: 'PARTIAL' },
      { name: 'Citizen Reports', description: 'Safety complaints', applicable: true, dataAvailability: 'AVAILABLE' },
    ],
  },
};

// ── Convenience helpers ─────────────────────────────────────────────────────

/** Get all sector codes */
export const SECTOR_CODES = Object.keys(SECTOR_CONFIGS) as ProjectSector[];

/** Get sector config by code */
export function getSectorConfig(code: ProjectSector): SectorConfig {
  return SECTOR_CONFIGS[code];
}

/** Get sectors with a specific map layer type */
export function getSectorsWithMapLayer(type: MapLayerType): SectorConfig[] {
  return SECTOR_CODES.filter((code) =>
    SECTOR_CONFIGS[code].mapLayers.some((l) => l.type === type)
  ).map((code) => SECTOR_CONFIGS[code]);
}

/** Get all data sources across all sectors */
export function getAllDataSources(): SectorDataSource[] {
  return SECTOR_CODES.flatMap((code) => SECTOR_CONFIGS[code].dataSources);
}

/** Get indicator type label */
export function indicatorTypeLabel(type: IndicatorType): string {
  switch (type) {
    case 'DIRECT': return 'SOURCE DATA';
    case 'DERIVED': return 'DERIVED';
    case 'SATELLITE': return 'SATELLITE-DERIVED';
    case 'AI_INTERPRETED': return 'AI-INTERPRETED';
    case 'HUMAN_VERIFIED': return 'HUMAN-VERIFIED';
  }
}

/** Get data availability label */
export function dataAvailabilityLabel(avail: DataAvailability): { label: string; color: string } {
  switch (avail) {
    case 'AVAILABLE': return { label: 'AVAILABLE', color: 'text-green-600' };
    case 'PARTIAL': return { label: 'PARTIAL', color: 'text-amber-600' };
    case 'STALE': return { label: 'STALE', color: 'text-red-600' };
    case 'UNAVAILABLE': return { label: 'UNAVAILABLE', color: 'text-slate-400' };
    case 'REQUIRES_AUTH': return { label: 'AUTH REQUIRED', color: 'text-slate-500' };
    case 'NOT_APPLICABLE': return { label: 'N/A', color: 'text-slate-300' };
  }
}
