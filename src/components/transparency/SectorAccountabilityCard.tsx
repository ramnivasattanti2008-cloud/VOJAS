'use client';

import { CheckCircle2, Eye, EyeOff, AlertTriangle, ShieldCheck, UserCheck } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ProjectSector } from '@vojas/shared';

interface SectorGuideline {
  title: string;
  vojasChecks: string[];
  satelliteChecks: string[];
  satelliteCannotCheck: string[];
  citizenCanReport: string[];
}

const SECTOR_GUIDELINES: Record<string, SectorGuideline> = {
  [ProjectSector.EDUCATION]: {
    title: 'Education Infrastructure',
    vojasChecks: [
      'Official administrative sanctions and fund allocations',
      'Reported expenditure vs sanctioned budget milestones',
      'Contractor assignment and work order details',
    ],
    satelliteChecks: [
      'Physical facility/building footprint existence',
      'Macro structural progress and roof/slab addition',
      'Visible site disturbance and surrounding land clearance',
    ],
    satelliteCannotCheck: [
      'Classroom desks, laboratory equipment, or book distribution',
      'Teacher or staff attendance and operational status',
      'Internal construction quality, wiring, or contractor kickbacks',
    ],
    citizenCanReport: [
      'Locked gates or abandoned school buildings',
      'Lack of basic furniture, running water, or functional toilets',
      'Substandard plastering, structural cracks, or fake completion claims',
    ],
  },
  [ProjectSector.HEALTH]: {
    title: 'Healthcare Infrastructure',
    vojasChecks: [
      'Health department sanction and hospital/clinic budget',
      'Fund disbursement and expenditure records',
      'Contractor attribution and completion certificates',
    ],
    satelliteChecks: [
      'Health sub-center or clinic building existence',
      'Physical foundation and structure progression',
      'All-weather road connectivity to the medical facility',
    ],
    satelliteCannotCheck: [
      'Medical equipment delivery (beds, monitors, diagnostics)',
      'Doctor/nurse staffing, medicine availability, and operating hours',
      'Sanitary hygiene compliance or pharmaceutical procurement fraud',
    ],
    citizenCanReport: [
      'Health center closed during designated dispensary hours',
      'Absent medical officers or unsupplied medicine stocks',
      'Incomplete wards reported as fully commissioned in records',
    ],
  },
  [ProjectSector.TRANSPORT]: {
    title: 'Roads & Transport',
    vojasChecks: [
      'Sanctioned road length, width, and sanctioned amounts',
      'Milestone-linked contractor payment releases',
      'Public Works Department (PWD) inspection logs',
    ],
    satelliteChecks: [
      'Linear corridor earthworks and road alignment opening',
      'Surface spectral reflectance change (bitumen paving/asphalt vs raw earth)',
      'Vegetation clearing along approved right-of-way',
    ],
    satelliteCannotCheck: [
      'Bitumen layer thickness or sub-base material compaction density',
      'Culvert reinforcement strength and concrete curing quality',
      'Kickback payments or invoice inflation by contractors',
    ],
    citizenCanReport: [
      'Potholes and bitumen wash-off within months of construction',
      'Missing culverts, unpaved stretches, or substandard gravel',
      'Ghost road segments where no physical work was ever executed',
    ],
  },
  [ProjectSector.WATER_SANITATION]: {
    title: 'Water & Sanitation Infrastructure',
    vojasChecks: [
      'Water scheme budget, tank capacity, and pipeline sanction',
      'Gram Panchayat / Jal Nigam contractor agreements',
      'Recorded project expenditures and timeline milestones',
    ],
    satelliteChecks: [
      'Overhead tank (OHT) tower structural erection',
      'Surface water reservoir or treatment plant excavation footprint',
      'Major above-ground civil structure installation',
    ],
    satelliteCannotCheck: [
      'Subsurface underground pipeline laying and joint sealing',
      'Tap water potability, fluoride/arsenic levels, and water pressure',
      'Daily pump motor operation and functional valve integrity',
    ],
    citizenCanReport: [
      'Dry tap connections with zero water flow',
      'Broken or leaking underground water supply lines',
      'Missing pump sets or non-functional overhead storage tanks',
    ],
  },
  [ProjectSector.RURAL_DEVELOPMENT]: {
    title: 'Rural Development & Community Facilities',
    vojasChecks: [
      'Sports ground or community center sanctioned allocation',
      'Municipal or Panchayat developmental expenditure tracking',
      'Targeted completion deadlines',
    ],
    satelliteChecks: [
      'Playfield ground leveling, boundary wall, and perimeter alignment',
      'Pavilion, shed, or community hall building construction',
      'Major soil/turf land-cover surface transitions',
    ],
    satelliteCannotCheck: [
      'Synthetic turf quality or athletic track grading standards',
      'Sports gear disbursement, interior lighting, and equipment',
      'Community hall accessibility and maintenance fraud',
    ],
    citizenCanReport: [
      'Encroached or overgrown sports grounds unfit for athletic use',
      'Community hall locked or used for private unauthorized storage',
      'Cracked pavilion structures or unfinished boundary fencing',
    ],
  },
  [ProjectSector.ENVIRONMENT]: {
    title: 'Environment & Natural Resources',
    vojasChecks: [
      'Afforestation, check-dam, or nursery fund sanctions',
      'Forest department milestone disbursements',
      'Approved plantation area in hectares',
    ],
    satelliteChecks: [
      'Multispectral vegetation index shifts (NDVI increase/decrease)',
      'Check-dam water retention and impoundment surface area',
      'Tree canopy and green cover macro transitions over multi-year baselines',
    ],
    satelliteCannotCheck: [
      'Individual sapling survival rate or species biodiversity',
      'Underground aquifer replenishment depth',
      'Organic soil treatment compliance or fence theft',
    ],
    citizenCanReport: [
      'Widespread sapling mortality due to zero maintenance or watering',
      'Fake plantation claims on lands that were never seeded',
      'Damaged or breached check-dam structures causing soil erosion',
    ],
  },
  [ProjectSector.PUBLIC_INFRASTRUCTURE]: {
    title: 'Public Infrastructure',
    vojasChecks: [
      'Administrative sanction, approved estimates, and public tenders',
      'Government expenditure reports and fund utilization rate',
      'Contractor assignment and official completion records',
    ],
    satelliteChecks: [
      'Physical site breaking, ground excavation, and footprint geometry',
      'Macro structural progression across temporal satellite passes',
      'Surrounding access clearance and site preparation',
    ],
    satelliteCannotCheck: [
      'Concrete structural load rating or internal steel reinforcement',
      'Electrical, fire safety, and plumbing installation compliance',
      'Contractor financial integrity, accounting fraud, or invoice manipulation',
    ],
    citizenCanReport: [
      'Abandoned concrete frameworks left unfinished for years',
      'Severe structural flaws, peeling plaster, or hazardous wiring',
      'Projects certified complete on paper that remain unused in practice',
    ],
  },
};

const DEFAULT_GUIDELINE: SectorGuideline = {
  title: 'Civic Infrastructure',
  vojasChecks: [
    'Official government sanction, approved cost, and recorded expenditures',
    'Contractor assignment and milestone-linked progress records',
    'Audit trails and data provenance from source portals',
  ],
  satelliteChecks: [
    'Physical footprint existence at verified geographic coordinates',
    'Macro structural progression over time against baseline dates',
    'Visible earthworks and land-cover reflectance alterations',
  ],
  satelliteCannotCheck: [
    'Contractor financial kickbacks, accounting fraud, or invoice validity',
    'Internal architectural quality, fittings, or structural safety ratings',
    'Operational utility, staff availability, or service delivery',
  ],
  citizenCanReport: [
    'Discrepancies between official status and actual ground reality',
    'Substandard construction, abandoned sites, or missing facilities',
    'Incorrect geographic locations or duplicate project entries',
  ],
};

export function SectorAccountabilityCard({ sector }: { sector?: string }) {
  const guideline = (sector && SECTOR_GUIDELINES[sector]) || DEFAULT_GUIDELINE;

  return (
    <Card className="border-slate-200 overflow-hidden shadow-xs">
      <CardHeader className="bg-slate-50 border-b border-slate-200 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Accountability Framework · {guideline.title}
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
            SECTOR VERIFICATION MATRIX
          </span>
        </div>
      </CardHeader>
      <CardBody className="space-y-4 p-5">
        {/* Anti-fabrication disclaimer banner */}
        <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/70 text-xs text-amber-800 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="font-semibold text-amber-900">Truth-in-Evidence Guarantee:</strong> Satellite imagery provides supporting physical context, not conclusive proof of construction quality, financial correctness, or contractor performance. Citizen verification and on-ground inspection remain vital.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Column 1: VOJAS Platform Checks */}
          <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-blue-900 uppercase tracking-wider text-[10px]">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
              What VOJAS Checks (Official Records)
            </div>
            <ul className="space-y-1.5 text-slate-700 pl-4 list-disc">
              {guideline.vojasChecks.map((item, i) => (
                <li key={i} className="leading-relaxed">{item}</li>
              ))}
            </ul>
          </div>

          {/* Column 2: Satellite Capabilities */}
          <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900 uppercase tracking-wider text-[10px]">
              <Eye className="h-3.5 w-3.5 text-emerald-600" />
              What Satellite Can Detect (10m Sentinel-2)
            </div>
            <ul className="space-y-1.5 text-slate-700 pl-4 list-disc">
              {guideline.satelliteChecks.map((item, i) => (
                <li key={i} className="leading-relaxed">{item}</li>
              ))}
            </ul>
          </div>

          {/* Column 3: Satellite Limitations */}
          <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-100 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-rose-900 uppercase tracking-wider text-[10px]">
              <EyeOff className="h-3.5 w-3.5 text-rose-600" />
              What Satellite Cannot Detect
            </div>
            <ul className="space-y-1.5 text-slate-700 pl-4 list-disc">
              {guideline.satelliteCannotCheck.map((item, i) => (
                <li key={i} className="leading-relaxed">{item}</li>
              ))}
            </ul>
          </div>

          {/* Column 4: Citizen Reporting */}
          <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-100 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-purple-900 uppercase tracking-wider text-[10px]">
              <UserCheck className="h-3.5 w-3.5 text-purple-600" />
              What Citizens Can Verify &amp; Report
            </div>
            <ul className="space-y-1.5 text-slate-700 pl-4 list-disc">
              {guideline.citizenCanReport.map((item, i) => (
                <li key={i} className="leading-relaxed">{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
