import { 
  SatelliteObservation, 
  ChangeEvent, 
  RiskItem, 
  InfrastructureProject, 
  CitizenReport, 
  AlertItem, 
  InvestigationCase, 
  LocationProfile, 
  SystemTelemetry 
} from '../types/civicshield';

export const SYSTEM_TELEMETRY: SystemTelemetry = {
  satelliteFeedStatus: 'ONLINE',
  aiEngineStatus: 'OPERATIONAL',
  gisTileServices: 'OPERATIONAL',
  databaseSync: 'SYNCHRONIZED',
  lastSatelliteSync: '13:42 IST (12 mins ago)',
  monitoredLocationsCount: 12842,
  activeAlertsCount: 37,
  changesDetectedCount: 142,
  citizenReportsCount: 319,
  criticalAlertsCount: 7,
};

export const SATELLITE_TIMELINE_BENGALURU: SatelliteObservation[] = [
  {
    id: 'S2-BLR-20260114',
    date: '14 Jan 2026',
    timeIst: '10:48 IST',
    sensor: 'Sentinel-2B MSI',
    resolutionMeters: 10,
    cloudCoveragePercent: 2,
    ndviAverage: 0.58,
    thumbnailUrl: '/sat/blr-jan.jpg',
    fullImageUrl: '/sat/blr-jan-full.jpg',
    status: 'ARCHIVED'
  },
  {
    id: 'S2-BLR-20260228',
    date: '28 Feb 2026',
    timeIst: '10:45 IST',
    sensor: 'Sentinel-2A MSI',
    resolutionMeters: 10,
    cloudCoveragePercent: 3,
    ndviAverage: 0.54,
    thumbnailUrl: '/sat/blr-feb.jpg',
    fullImageUrl: '/sat/blr-feb-full.jpg',
    status: 'ARCHIVED'
  },
  {
    id: 'S2-BLR-20260412',
    date: '12 Apr 2026',
    timeIst: '10:52 IST',
    sensor: 'Sentinel-2B MSI',
    resolutionMeters: 10,
    cloudCoveragePercent: 5,
    ndviAverage: 0.49,
    thumbnailUrl: '/sat/blr-apr.jpg',
    fullImageUrl: '/sat/blr-apr-full.jpg',
    status: 'ARCHIVED'
  },
  {
    id: 'S2-BLR-20260608',
    date: '08 Jun 2026',
    timeIst: '10:47 IST',
    sensor: 'Sentinel-2A MSI',
    resolutionMeters: 10,
    cloudCoveragePercent: 12,
    ndviAverage: 0.52,
    thumbnailUrl: '/sat/blr-jun.jpg',
    fullImageUrl: '/sat/blr-jun-full.jpg',
    status: 'ARCHIVED'
  },
  {
    id: 'S2-BLR-20260720',
    date: '20 Jul 2026',
    timeIst: '10:50 IST',
    sensor: 'Sentinel-2B MSI',
    resolutionMeters: 10,
    cloudCoveragePercent: 8,
    ndviAverage: 0.46,
    thumbnailUrl: '/sat/blr-jul.jpg',
    fullImageUrl: '/sat/blr-jul-full.jpg',
    status: 'ARCHIVED'
  },
  {
    id: 'S2-BLR-20260831',
    date: '31 Aug 2026',
    timeIst: '10:49 IST',
    sensor: 'Sentinel-2A MSI',
    resolutionMeters: 10,
    cloudCoveragePercent: 6,
    ndviAverage: 0.42,
    thumbnailUrl: '/sat/blr-aug.jpg',
    fullImageUrl: '/sat/blr-aug-full.jpg',
    status: 'ARCHIVED'
  },
  {
    id: 'S2-BLR-20260908',
    date: '08 Sep 2026',
    timeIst: '10:51 IST',
    sensor: 'Sentinel-2B MSI',
    resolutionMeters: 10,
    cloudCoveragePercent: 4,
    ndviAverage: 0.38,
    thumbnailUrl: '/sat/blr-sep.jpg',
    fullImageUrl: '/sat/blr-sep-full.jpg',
    status: 'ONLINE'
  }
];

export const PRIMARY_CHANGE_EVENT: ChangeEvent = {
  id: 'CS-1042',
  title: 'Road construction anomaly & unauthorized soil excavation',
  locationName: 'Bellandur-Outer Ring Road Corridor',
  district: 'Bengaluru Urban',
  state: 'Karnataka',
  coordinates: { lat: 12.9352, lng: 77.6946 },
  detectedDate: '08 Sep 2026',
  previousObservationDate: '31 Aug 2026',
  intervalDays: 8,
  confidenceScore: 94,
  areaHectares: 2.84,
  category: 'Construction',
  severity: 'HIGH',
  summary: 'Substantial ground surface modification and heavy earth-moving footprint detected outside designated BBMP urban arterial road widening boundary.',
  detailedExplanation: 'Multi-spectral satellite comparison between 31 Aug and 08 Sep 2026 demonstrates an abrupt loss of surface vegetation index (NDVI decreased by 0.31) and extensive exposed compacted soil consistent with rapid grading and excavation. This activity deviates from the Municipal Work Order #BBMP-ENG-2025-883 corridor perimeter by approximately 45 meters towards the protected lake retention buffer zone.',
  evidenceItems: [
    {
      type: 'SATELLITE_OBSERVATION',
      title: 'Sentinel-2 MSI Multi-spectral Bands (B4, B3, B2 + NIR B8)',
      detail: 'Surface reflectance shifts confirm 28,400 sq.m of newly stripped topsoil and gravel compaction within an 8-day interval.',
      verified: true
    },
    {
      type: 'GOVERNMENT_DATA',
      title: 'BBMP Smart City Project Master Tender Specification #BBMP-883',
      detail: 'Approved road median widening width is 32.0m; observed footprint spans 78.5m encroaching on parcel survey #114.',
      verified: true
    },
    {
      type: 'CITIZEN_REPORT',
      title: 'Citizen Report #CS-2026-001482 with Geotagged Media',
      detail: 'Night excavation and heavy dump truck convoy reported on 04 Sep 2026 with acoustic and dust complaints.',
      verified: true
    },
    {
      type: 'AI_INFERENCE',
      title: 'Deep Residual Neural Land-Cover Classifier v4.2',
      detail: 'Classified as unauthorized commercial lot grading rather than scheduled municipal utility trenching with 94.2% statistical confidence.',
      verified: false
    }
  ],
  polygon: [
    [12.9365, 77.6925],
    [12.9372, 77.6955],
    [12.9340, 77.6968],
    [12.9332, 77.6938]
  ],
  beforeImageUrl: '',
  afterImageUrl: ''
};

export const ALL_CHANGE_EVENTS: ChangeEvent[] = [
  PRIMARY_CHANGE_EVENT,
  {
    id: 'CS-1043',
    title: 'Rapid aquaculture wetland encroachment',
    locationName: 'Nellore Coastal Basin',
    district: 'SPSR Nellore',
    state: 'Andhra Pradesh',
    coordinates: { lat: 14.4426, lng: 79.9865 },
    detectedDate: '07 Sep 2026',
    previousObservationDate: '25 Aug 2026',
    intervalDays: 13,
    confidenceScore: 91,
    areaHectares: 6.12,
    category: 'Water change',
    severity: 'MODERATE',
    summary: 'Conversion of natural mangrove buffer into artificial commercial prawn pond bunds without CRZ environmental clearance.',
    evidenceItems: [
      {
        type: 'SATELLITE_OBSERVATION',
        title: 'NDWI (Normalized Difference Water Index) Anomaly',
        detail: 'Distinct rectangular water retention impoundments identified with high spectral water absorption.',
        verified: true
      },
      {
        type: 'AI_INFERENCE',
        title: 'Hydrological Perimeter Detector',
        detail: '91% probability of commercial brackish water impoundment construction.',
        verified: false
      }
    ],
    polygon: [
      [14.4450, 79.9820],
      [14.4465, 79.9890],
      [14.4400, 79.9910],
      [14.4385, 79.9840]
    ],
    beforeImageUrl: '',
    afterImageUrl: ''
  },
  {
    id: 'CS-1044',
    title: 'Riverbank buffer encroachment & debris dumping',
    locationName: 'Musi River Floodplain East',
    district: 'Hyderabad',
    state: 'Telangana',
    coordinates: { lat: 17.3850, lng: 78.4867 },
    detectedDate: '08 Sep 2026',
    previousObservationDate: '01 Sep 2026',
    intervalDays: 7,
    confidenceScore: 89,
    areaHectares: 1.45,
    category: 'Land-use change',
    severity: 'HIGH',
    summary: 'Illegal landfilling and debris elevation within 50-year maximum flood contour boundary.',
    evidenceItems: [
      {
        type: 'SATELLITE_OBSERVATION',
        title: 'Copernicus DEM elevation delta & Landsat thermal anomaly',
        detail: 'Ground elevation artificially raised by 2.1m over 14,500 sq.m riverside buffer.',
        verified: true
      },
      {
        type: 'CITIZEN_REPORT',
        title: 'Resident Ward Committee Grievance #HYD-9912',
        detail: 'Unlicensed construction debris dumping observed during late night hours.',
        verified: true
      }
    ],
    polygon: [
      [17.3865, 78.4840],
      [17.3875, 78.4890],
      [17.3830, 78.4900],
      [17.3820, 78.4855]
    ],
    beforeImageUrl: '',
    afterImageUrl: ''
  },
  {
    id: 'CS-1045',
    title: 'Green buffer strip tree felling for highway expansion',
    locationName: 'Delhi-NCR Yamuna Expressway Junction',
    district: 'Gautam Buddha Nagar',
    state: 'Uttar Pradesh',
    coordinates: { lat: 28.5355, lng: 77.3910 },
    detectedDate: '06 Sep 2026',
    previousObservationDate: '28 Aug 2026',
    intervalDays: 9,
    confidenceScore: 96,
    areaHectares: 4.30,
    category: 'Vegetation loss',
    severity: 'MODERATE',
    summary: 'Linear clearcutting of 1,200+ mature roadside trees along state highway perimeter.',
    evidenceItems: [
      {
        type: 'SATELLITE_OBSERVATION',
        title: 'Vegetation Continuous Fields (VCF) Canopy Drop',
        detail: 'Canopy density dropped from 74% to 11% along a 2.4 km linear transportation strip.',
        verified: true
      }
    ],
    polygon: [
      [28.5380, 77.3880],
      [28.5395, 77.3940],
      [28.5320, 77.3950],
      [28.5310, 77.3890]
    ],
    beforeImageUrl: '',
    afterImageUrl: ''
  },
  {
    id: 'CS-1046',
    title: 'Stormwater culvert structural obstruction',
    locationName: 'Velachery Drainage Basin',
    district: 'Chennai',
    state: 'Tamil Nadu',
    coordinates: { lat: 12.9815, lng: 80.2180 },
    detectedDate: '05 Sep 2026',
    previousObservationDate: '26 Aug 2026',
    intervalDays: 10,
    confidenceScore: 88,
    areaHectares: 0.92,
    category: 'Infrastructure change',
    severity: 'CRITICAL',
    summary: 'Critical monsoon runoff culvert partially blocked by temporary fabrication staging platform.',
    evidenceItems: [
      {
        type: 'SATELLITE_OBSERVATION',
        title: 'Optical High-Res Shadow and Water Pooling Detection',
        detail: 'Runoff velocity bottleneck identified upstream of radial canal mouth.',
        verified: true
      }
    ],
    polygon: [
      [12.9830, 80.2160],
      [12.9840, 80.2200],
      [12.9800, 80.2210],
      [12.9790, 80.2170]
    ],
    beforeImageUrl: '',
    afterImageUrl: ''
  }
];

export const ALL_RISKS: RiskItem[] = [
  {
    id: 'RISK-01',
    title: 'Corridor Construction Anomaly & Wetland Encroachment',
    location: 'Bengaluru · Karnataka',
    state: 'Karnataka',
    severity: 'CRITICAL',
    confidenceScore: 94,
    regionType: 'Urban Ecological Buffer',
    detectedTimeAgo: '8 min ago',
    whyItMatters: 'Displacement of natural drainage basin creates severe flash flood exposure for 42,000 residents across adjacent tech corridors during upcoming monsoon cycles.',
    evidence: [
      { type: 'SATELLITE_OBSERVATION', text: 'Sentinel-2 multi-spectral scan identifies 2.84 ha topsoil removal.' },
      { type: 'GOVERNMENT_DATA', text: 'Tender specification BBMP-883 limit violated by 45m.' },
      { type: 'CITIZEN_REPORT', text: '3 verified ground citizen complaints with geotagged photography.' }
    ],
    aiAssessment: 'High probability of unauthorized commercial developer grading exploiting ongoing municipal road works as physical cover.',
    recommendedAction: 'Dispatch BBMP Special Enforcement Cell with GPS surveying gear to issue stop-work injunction.'
  },
  {
    id: 'RISK-02',
    title: 'Riverbank Inundation Risk & Debris Elevation',
    location: 'Hyderabad · Telangana',
    state: 'Telangana',
    severity: 'HIGH',
    confidenceScore: 89,
    regionType: 'Riverine Floodplain',
    detectedTimeAgo: '24 min ago',
    whyItMatters: 'Narrowing of Musi flood discharge throat will back up urban stormwater trunks in Old City wards.',
    evidence: [
      { type: 'SATELLITE_OBSERVATION', text: 'Copernicus DEM 2.1m artificial elevation increase.' },
      { type: 'CITIZEN_REPORT', text: 'Resident ward grievance report logged with GHMC.' }
    ],
    aiAssessment: 'Artificial embankment creation violates Central Water Commission 100-year flood line directives.',
    recommendedAction: 'Issue immediate show-cause notice to local zonal engineering officer.'
  },
  {
    id: 'RISK-03',
    title: 'Coastal Mangrove Salinization & CRZ Violation',
    location: 'Nellore · Andhra Pradesh',
    state: 'Andhra Pradesh',
    severity: 'MODERATE',
    confidenceScore: 91,
    regionType: 'Coastal Regulation Zone I',
    detectedTimeAgo: '1 hr ago',
    whyItMatters: 'Destruction of mangrove fringe degrades natural storm surge barrier protecting 4 coastal fishing villages.',
    evidence: [
      { type: 'SATELLITE_OBSERVATION', text: 'Rapid rectangular water pond excavation visible in NDWI.' }
    ],
    aiAssessment: 'Illegal aquaculture conversion operating without Andhra Pradesh Pollution Control Board consent.',
    recommendedAction: 'Coordinate with District Forest Officer and Coastal Aquaculture Authority.'
  },
  {
    id: 'RISK-04',
    title: 'Culvert Monsoon Vulnerability Bottleneck',
    location: 'Chennai · Tamil Nadu',
    state: 'Tamil Nadu',
    severity: 'CRITICAL',
    confidenceScore: 96,
    regionType: 'Stormwater Critical Node',
    detectedTimeAgo: '2 hrs ago',
    whyItMatters: 'High precipitation forecast within 72 hours could induce 1.5m street level flooding across 6 IT campus access arteries.',
    evidence: [
      { type: 'SATELLITE_OBSERVATION', text: 'Surface drainage impedance detected at primary discharge junction.' },
      { type: 'GOVERNMENT_DATA', text: 'Greater Chennai Corporation monsoon contingency registry.' }
    ],
    aiAssessment: 'Temporary staging scaffolding not cleared prior to NE Monsoon readiness deadline.',
    recommendedAction: 'Emergency deployment of hydraulic clearing equipment within 12 hours.'
  },
  {
    id: 'RISK-05',
    title: 'Forest Canopy Fragmentation',
    location: 'Delhi-NCR · Uttar Pradesh',
    state: 'Uttar Pradesh',
    severity: 'MODERATE',
    confidenceScore: 92,
    regionType: 'Protected Green Belt',
    detectedTimeAgo: '4 hrs ago',
    whyItMatters: 'Accelerates local particulate smog suspension and removes microclimate cooling buffer.',
    evidence: [
      { type: 'SATELLITE_OBSERVATION', text: '4.30 ha continuous canopy reduction measured via VCF.' }
    ],
    aiAssessment: 'Tree felling pace significantly outpaces documented afforestation offset commitments.',
    recommendedAction: 'Audit compensatory afforestation bank registry compliance.'
  }
];

export const ALL_PROJECTS: InfrastructureProject[] = [
  {
    id: 'PRJ-BLR-883',
    name: 'ORR Smart Arterial Corridor & Drainage Improvement',
    category: 'Roads',
    location: 'Outer Ring Road (Silk Board to Marathahalli)',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    coordinates: { lat: 12.9352, lng: 77.6946 },
    status: 'UNDER_CONSTRUCTION',
    budgetCr: 412.5,
    contractor: 'Apex InfraTech Consortium Ltd',
    startDate: 'Jan 2025',
    expectedCompletion: 'Dec 2026',
    officialProgressPct: 68,
    aiSatelliteProgressEstimatePct: 49,
    confidenceScore: 86,
    satelliteObservationStatus: 'Anomaly detected',
    lastObservedDate: '08 Sep 2026',
    delayMonths: 4,
    notes: 'Ground satellite surface progression shows 19% lag compared to official contractor milestone submissions. Perimeter expansion anomaly detected.'
  },
  {
    id: 'PRJ-HYD-402',
    name: 'Musi Riverfront Promenade & Ecological Riparian Filter',
    category: 'Drainage',
    location: 'Chaderghat to Nagole Stretch',
    district: 'Hyderabad',
    state: 'Telangana',
    coordinates: { lat: 17.3850, lng: 78.4867 },
    status: 'UNDER_CONSTRUCTION',
    budgetCr: 650.0,
    contractor: 'Deccan GeoCivil Engineering',
    startDate: 'Mar 2025',
    expectedCompletion: 'Aug 2027',
    officialProgressPct: 35,
    aiSatelliteProgressEstimatePct: 31,
    confidenceScore: 92,
    satelliteObservationStatus: 'Activity detected',
    lastObservedDate: '08 Sep 2026',
    delayMonths: 1,
    notes: 'Earthworks progressing according to primary schedule. Silt accumulation at bridge pilings requires routine dredging.'
  },
  {
    id: 'PRJ-MUM-119',
    name: 'Coastal Road Marine Underpass Package 2',
    category: 'Roads',
    location: 'Worli to Bandra Connector',
    district: 'Mumbai City',
    state: 'Maharashtra',
    coordinates: { lat: 18.9438, lng: 72.8231 },
    status: 'UNDER_CONSTRUCTION',
    budgetCr: 1280.0,
    contractor: 'Larsen & Toubro Heavy Civil',
    startDate: 'Jun 2023',
    expectedCompletion: 'Oct 2026',
    officialProgressPct: 88,
    aiSatelliteProgressEstimatePct: 85,
    confidenceScore: 95,
    satelliteObservationStatus: 'Activity detected',
    lastObservedDate: '07 Sep 2026',
    delayMonths: 0,
    notes: 'Surface asphalt paving and gantry installation verified by high-resolution optical passes.'
  },
  {
    id: 'PRJ-CHE-310',
    name: 'Velachery-Pallikaranai Integrated Stormwater Trunk Canal',
    category: 'Water',
    location: 'South Chennai Drainage Basin',
    district: 'Chennai',
    state: 'Tamil Nadu',
    coordinates: { lat: 12.9815, lng: 80.2180 },
    status: 'DELAYED',
    budgetCr: 195.4,
    contractor: 'Kaveri Hydro Solutions JV',
    startDate: 'Feb 2024',
    expectedCompletion: 'Jun 2026',
    officialProgressPct: 75,
    aiSatelliteProgressEstimatePct: 52,
    confidenceScore: 89,
    satelliteObservationStatus: 'Anomaly detected',
    lastObservedDate: '05 Sep 2026',
    delayMonths: 6,
    notes: 'Critical culvert bottlenecks identified. Unfinished masonry sections pose immediate pre-monsoon waterlogging threat.'
  },
  {
    id: 'PRJ-DEL-705',
    name: 'East Delhi Model Senior Secondary Campus & Eco-Park',
    category: 'Schools',
    location: 'Mayur Vihar Phase 3',
    district: 'East Delhi',
    state: 'Delhi',
    coordinates: { lat: 28.6080, lng: 77.3320 },
    status: 'AWAITING_ANALYSIS',
    budgetCr: 48.2,
    contractor: 'National Building Construction Corp',
    startDate: 'Oct 2025',
    expectedCompletion: 'Feb 2027',
    officialProgressPct: 22,
    aiSatelliteProgressEstimatePct: null,
    confidenceScore: null,
    satelliteObservationStatus: 'Awaiting analysis',
    lastObservedDate: '02 Sep 2026',
    notes: 'Cloud cover in recent orbits prevented sub-meter optical structural analysis. Scheduled for next clear sky pass.'
  }
];

export const ALL_CITIZEN_REPORTS: CitizenReport[] = [
  {
    id: 'CS-2026-001482',
    title: 'Heavy night excavation encroaching lake buffer zone',
    locationName: 'Bellandur Lake Southern Bund',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    coordinates: { lat: 12.9348, lng: 77.6952 },
    issueType: 'Construction',
    description: 'Bulldozers and 10-wheel tippers operating between 11 PM and 4 AM dumping excavated quarry dust into the protected catchment swale. Tree roots exposed along 100m embankment.',
    submittedTimeAgo: '41 min ago',
    submittedTimestamp: '11 Sep 2026 13:04 IST',
    status: 'Verified',
    upvotes: 48,
    evidenceReceived: true,
    locationVerified: true,
    aiTriageSummary: 'High correlation with detected satellite surface reflectance change CS-1042. High veracity index.',
    satelliteCorroborated: true,
    photoUrl: '/reports/night-excavation.jpg'
  },
  {
    id: 'CS-2026-001481',
    title: 'Primary stormwater drain choked with plastic & construction rubble',
    locationName: 'Marathahalli Multiplex Underpass',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    coordinates: { lat: 12.9560, lng: 77.7010 },
    issueType: 'Drainage',
    description: 'Rubble from nearby flyover pillar casting was dumped directly into the SWD storm drain culvert mouth. Standing water level already 2 feet during yesterday light drizzle.',
    submittedTimeAgo: '1 hr ago',
    submittedTimestamp: '11 Sep 2026 12:45 IST',
    status: 'Reviewing',
    upvotes: 27,
    evidenceReceived: true,
    locationVerified: true,
    aiTriageSummary: 'Verified geotag coordinates correspond to BBMP SWD primary discharge network. Dispatched to Ward 150 officer.',
    satelliteCorroborated: false
  },
  {
    id: 'CS-2026-001480',
    title: 'Freshwater wetland being sectioned by earthen dykes',
    locationName: 'Nellore Buckingham Canal North',
    district: 'SPSR Nellore',
    state: 'Andhra Pradesh',
    coordinates: { lat: 14.4410, lng: 79.9850 },
    issueType: 'Encroachment',
    description: 'Private farm operators have erected high mud bunds cutting off natural tidal flushing. Mangrove saplings cleared over 5 acres.',
    submittedTimeAgo: '3 hrs ago',
    submittedTimestamp: '11 Sep 2026 10:45 IST',
    status: 'Verified',
    upvotes: 62,
    evidenceReceived: true,
    locationVerified: true,
    aiTriageSummary: 'Matches NDWI satellite surface water anomaly CS-1043 with 98% spatial overlap.',
    satelliteCorroborated: true
  },
  {
    id: 'CS-2026-001479',
    title: 'Severe road subsidence following water pipe burst',
    locationName: 'Worli Sea Face Link Road',
    district: 'Mumbai City',
    state: 'Maharashtra',
    coordinates: { lat: 18.9980, lng: 72.8150 },
    issueType: 'Road',
    description: 'Road surface dropped by nearly 30cm creating hazardous pothole crater on northbound carriageway.',
    submittedTimeAgo: '5 hrs ago',
    submittedTimestamp: '11 Sep 2026 08:45 IST',
    status: 'Resolved',
    upvotes: 89,
    evidenceReceived: true,
    locationVerified: true,
    aiTriageSummary: 'BMC Emergency road crew dispatched; steel plate cold-asphalt patch installed at 11:20 AM.',
    satelliteCorroborated: false
  }
];

export const ALL_ALERTS: AlertItem[] = [
  {
    id: 'ALT-1092',
    title: 'Potential Infrastructure Anomaly & Unauthorized Excavation',
    severity: 'CRITICAL',
    location: 'Bengaluru · Karnataka',
    state: 'Karnataka',
    coordinates: { lat: 12.9352, lng: 77.6946 },
    detectedTimeAgo: '8 min ago',
    timestamp: '11 Sep 2026 13:37 IST',
    confidence: 94,
    category: 'Construction',
    description: 'Multi-spectral satellite sensor detected 2.84 ha ground clearance deviation from authorized BBMP corridor limits.',
    status: 'ACTIVE'
  },
  {
    id: 'ALT-1091',
    title: 'Culvert Monsoon Vulnerability Bottleneck',
    severity: 'CRITICAL',
    location: 'Chennai · Tamil Nadu',
    state: 'Tamil Nadu',
    coordinates: { lat: 12.9815, lng: 80.2180 },
    detectedTimeAgo: '42 min ago',
    timestamp: '11 Sep 2026 13:03 IST',
    confidence: 96,
    category: 'Infrastructure',
    description: 'Major stormwater trunk outlet obstructed by temporary civil staging prior to heavy rainfall alert window.',
    status: 'ACTIVE'
  },
  {
    id: 'ALT-1090',
    title: 'Riverbank Inundation Buffer Degradation',
    severity: 'HIGH',
    location: 'Hyderabad · Telangana',
    state: 'Telangana',
    coordinates: { lat: 17.3850, lng: 78.4867 },
    detectedTimeAgo: '1 hr ago',
    timestamp: '11 Sep 2026 12:45 IST',
    confidence: 89,
    category: 'Land-use change',
    description: 'Artificial debris fill elevation detected inside 50-year maximum high-flood plain.',
    status: 'ACTIVE'
  },
  {
    id: 'ALT-1089',
    title: 'Coastal Mangrove Salinization & CRZ Violation',
    severity: 'MEDIUM',
    location: 'Nellore · Andhra Pradesh',
    state: 'Andhra Pradesh',
    coordinates: { lat: 14.4426, lng: 79.9865 },
    detectedTimeAgo: '3 hrs ago',
    timestamp: '11 Sep 2026 10:45 IST',
    confidence: 91,
    category: 'Water change',
    description: 'Rapid rectangular water impoundment development outside approved coastal zone bounds.',
    status: 'INVESTIGATING',
    assignedTo: 'Officer R. Sharma (AP-CRZ)'
  },
  {
    id: 'ALT-1088',
    title: 'Linear Highway Canopy Fragmentation',
    severity: 'LOW',
    location: 'Delhi-NCR · Uttar Pradesh',
    state: 'Uttar Pradesh',
    coordinates: { lat: 28.5355, lng: 77.3910 },
    detectedTimeAgo: '5 hrs ago',
    timestamp: '11 Sep 2026 08:45 IST',
    confidence: 92,
    category: 'Vegetation loss',
    description: 'Tree felling pace exceeds documented compensatory planting schedule.',
    status: 'WATCHING'
  }
];

export const PRIMARY_INVESTIGATION: InvestigationCase = {
  id: 'CS-1042',
  title: 'Bellandur-ORR Corridor Infrastructure & Wetland Encroachment',
  location: 'Bellandur / Outer Ring Road Corridor',
  district: 'Bengaluru Urban',
  state: 'Karnataka',
  status: 'OPEN',
  priority: 'CRITICAL',
  openedAt: '08 Sep 2026 14:15 IST',
  lastUpdated: '11 Sep 2026 13:40 IST',
  assignedOfficer: 'Dr. Anita Rao, Joint Commissioner (Civic Vigilance)',
  summary: 'Investigation initiated upon multi-spectral Sentinel-2 change detection algorithm flagging 2.84 hectares of unapproved soil grading in sensitive lake retention buffer. Corroborated with high veracity citizen reports of night trucking.',
  observedData: [
    'Sentinel-2 optical multi-spectral pass on 08 Sep 2026 indicates surface NDVI dropped from 0.54 to 0.23.',
    'Surface footprint spans 28,400 sq. meters with distinctive heavy earthwork tire compression tracks.',
    'Municipal project tender BBMP-883 limits width to 32.0m; actual physical clearing spans 78.5m.',
    '3 independent citizen submissions with verified EXIF timestamps and GPS telemetry between 04 Sep and 08 Sep.'
  ],
  aiInferences: [
    'Deep ResNet Land-Cover Model predicts 94.2% likelihood of unauthorized commercial staging or private developer encroachment.',
    'Hydrological runoff simulation estimates 38% increase in peak discharge velocity during next 50mm rainfall event.',
    'Project timeline comparison indicates 19% lag between reported contractor progress (68%) and physical earthwork reality (49%).'
  ],
  confidenceScore: 94,
  potentialExplanations: [
    'Primary hypothesis: Commercial plot promoter operating without approvals under cover of BBMP road widening project.',
    'Secondary hypothesis: Contractor dumping unapproved cut-and-fill spoil material into adjacent low-lying swale to minimize haulage costs.',
    'Alternative hypothesis: Unannounced emergency drainage diversion works commissioned without updating central GIS registry.'
  ],
  recommendedVerification: [
    'Conduct total station survey of cadastral boundaries between survey #114 and government road parcel.',
    'Summon Project Engineer BBMP Road Infrastructure Division for physical site diary audit.',
    'Issue stop-work notice on all non-median earth movement east of chainage 14+200.',
    'Request commercial drone photogrammetry pass for sub-decimeter elevation digital terrain modeling.'
  ],
  evidenceFiles: [
    {
      id: 'EV-01',
      type: 'Satellite Before/After',
      title: 'Sentinel-2 MSI 8-Day Split Comparison (31 Aug vs 08 Sep 2026)',
      timestamp: '08 Sep 2026 10:51 IST'
    },
    {
      id: 'EV-02',
      type: 'Citizen Report',
      title: 'Citizen Report #CS-2026-001482 with 4k Geotagged Night Photo',
      timestamp: '11 Sep 2026 13:04 IST'
    },
    {
      id: 'EV-03',
      type: 'Tender Document',
      title: 'Government Tender Specification Gazette #BBMP-ENG-2025-883',
      timestamp: '14 Jan 2025'
    },
    {
      id: 'EV-04',
      type: 'Field Inspector Log',
      title: 'Initial Spot Verification by Ward 150 Assistant Executive Engineer',
      timestamp: '10 Sep 2026 17:30 IST'
    }
  ],
  timeline: [
    {
      time: '13:40 IST',
      date: '11 Sep 2026',
      event: 'Citizen Report #CS-2026-001482 linked to investigation docket by AI Triage Engine.',
      source: 'AI_INFERENCE'
    },
    {
      time: '17:30 IST',
      date: '10 Sep 2026',
      event: 'Field Inspector preliminary memo logged: "Unauthorized grading observed beyond chainage 14+200".',
      source: 'GOVERNMENT_DATA'
    },
    {
      time: '14:15 IST',
      date: '08 Sep 2026',
      event: 'Automated satellite change anomaly CS-1042 triggered Critical Alert #ALT-1092.',
      source: 'SATELLITE_OBSERVATION'
    },
    {
      time: '10:51 IST',
      date: '08 Sep 2026',
      event: 'Sentinel-2B pass completed with 4% cloud cover, ingestion into CivicShield GIS tile cache.',
      source: 'SATELLITE_OBSERVATION'
    }
  ],
  notes: [
    {
      author: 'Dr. Anita Rao',
      time: '10 Sep 2026 18:45 IST',
      content: 'Inspection officer confirmed ground deviation. Notice is being drafted for BBMP Commissioner review.'
    },
    {
      author: 'GIS Analysis Unit',
      time: '08 Sep 2026 15:20 IST',
      content: 'Spectral difference map confirmed high probability of topsoil removal rather than temporary storage.'
    }
  ]
};

export const BENGALURU_LOCATION_PROFILE: LocationProfile = {
  id: 'LOC-BLR',
  name: 'Bengaluru Urban District',
  district: 'Bengaluru Urban',
  state: 'Karnataka',
  coordinates: { lat: 12.9716, lng: 77.5946 },
  riskLevel: 'MODERATE',
  activeAlertsCount: 12,
  changesDetectedCount: 47,
  citizenReportsCount: 83,
  projectsMonitoredCount: 128,
  lastSatellitePass: '08 Sep 2026 (Sentinel-2B)',
  overviewSummary: 'Major technology and urban agglomeration undergoing rapid infrastructure expansion along Outer Ring Road, Suburban Rail, and Peripheral Ring Road corridors. High sensitivity in valley zones and catchment areas.',
  aiCivicHealthScore: 74
};

export const ALL_LOCATION_PROFILES: LocationProfile[] = [
  BENGALURU_LOCATION_PROFILE,
  {
    id: 'LOC-HYD',
    name: 'Hyderabad Metropolitan Area',
    district: 'Hyderabad',
    state: 'Telangana',
    coordinates: { lat: 17.3850, lng: 78.4867 },
    riskLevel: 'HIGH',
    activeAlertsCount: 8,
    changesDetectedCount: 34,
    citizenReportsCount: 52,
    projectsMonitoredCount: 94,
    lastSatellitePass: '08 Sep 2026 (Sentinel-2A)',
    overviewSummary: 'Intensive river revitalization initiatives along Musi River corridor with ongoing floodplain elevation monitoring.',
    aiCivicHealthScore: 68
  },
  {
    id: 'LOC-NEL',
    name: 'Nellore Coastal District',
    district: 'SPSR Nellore',
    state: 'Andhra Pradesh',
    coordinates: { lat: 14.4426, lng: 79.9865 },
    riskLevel: 'MODERATE',
    activeAlertsCount: 5,
    changesDetectedCount: 19,
    citizenReportsCount: 24,
    projectsMonitoredCount: 42,
    lastSatellitePass: '07 Sep 2026 (Sentinel-2B)',
    overviewSummary: 'Vulnerable coastal wetlands and aquaculture growth zones under continuous CRZ compliance monitoring.',
    aiCivicHealthScore: 81
  },
  {
    id: 'LOC-MUM',
    name: 'Mumbai City & Suburban',
    district: 'Mumbai',
    state: 'Maharashtra',
    coordinates: { lat: 18.9438, lng: 72.8231 },
    riskLevel: 'LOW',
    activeAlertsCount: 4,
    changesDetectedCount: 22,
    citizenReportsCount: 95,
    projectsMonitoredCount: 112,
    lastSatellitePass: '07 Sep 2026 (Sentinel-2A)',
    overviewSummary: 'Dense coastal corridor monitoring focusing on Coastal Road reclamation and high-density stormwater outfalls.',
    aiCivicHealthScore: 86
  }
];

export const ANALYTICS_DATA = {
  changesOverTime: [
    { month: 'Apr 2026', construction: 18, vegetation: 12, water: 4, landuse: 8 },
    { month: 'May 2026', construction: 24, vegetation: 19, water: 7, landuse: 11 },
    { month: 'Jun 2026', construction: 29, vegetation: 25, water: 14, landuse: 16 },
    { month: 'Jul 2026', construction: 35, vegetation: 31, water: 22, landuse: 19 },
    { month: 'Aug 2026', construction: 42, vegetation: 38, water: 18, landuse: 24 },
    { month: 'Sep 2026', construction: 48, vegetation: 44, water: 16, landuse: 34 }
  ],
  riskDistribution: [
    { name: 'Critical', value: 7, color: '#ef4444' },
    { name: 'High', value: 18, color: '#f97316' },
    { name: 'Moderate', value: 39, color: '#eab308' },
    { name: 'Low', value: 64, color: '#06b6d4' },
    { name: 'Verified Normal', value: 142, color: '#10b981' }
  ],
  categoryBreakdown: [
    { category: 'Construction', count: 48, pct: 33.8 },
    { category: 'Vegetation Loss', count: 44, pct: 31.0 },
    { category: 'Land-Use Shifts', count: 34, pct: 23.9 },
    { category: 'Water Changes', count: 16, pct: 11.3 }
  ],
  reportsTriageStats: [
    { name: 'Verified & Actioned', count: 184, color: '#10b981' },
    { name: 'Under Review', count: 72, color: '#38bdf8' },
    { name: 'New Ingest', count: 45, color: '#f59e0b' },
    { name: 'Rejected / Inconclusive', count: 18, color: '#64748b' }
  ]
};
