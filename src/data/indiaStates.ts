// Static Indian state data for dashboard and map components
// Extracted from dashboard/page.tsx to reduce bundle size and improve maintainability

export interface IndianState {
  id: string;
  name: string;
}

export interface StateCentroid {
  x: number;
  y: number;
}

export const INDIAN_STATES: IndianState[] = [
  { id: 'RAJASTHAN', name: 'Rajasthan' },
  { id: 'GUJARAT', name: 'Gujarat' },
  { id: 'PUNJAB', name: 'Punjab' },
  { id: 'HARYANA', name: 'Haryana' },
  { id: 'DELHI', name: 'Delhi' },
  { id: 'UTTARAKHAND', name: 'Uttarakhand' },
  { id: 'HIMACHAL_PRADESH', name: 'Himachal Pradesh' },
  { id: 'JAMMU_KASHMIR', name: 'Jammu & Kashmir' },
  { id: 'UTTAR_PRADESH', name: 'Uttar Pradesh' },
  { id: 'BIHAR', name: 'Bihar' },
  { id: 'JHARKHAND', name: 'Jharkhand' },
  { id: 'WEST_BENGAL', name: 'West Bengal' },
  { id: 'ODISHA', name: 'Odisha' },
  { id: 'CHHATTISGARH', name: 'Chhattisgarh' },
  { id: 'MADHYA_PRADESH', name: 'Madhya Pradesh' },
  { id: 'MAHARASHTRA', name: 'Maharashtra' },
  { id: 'ANDHRA_PRADESH', name: 'Andhra Pradesh' },
  { id: 'TELANGANA', name: 'Telangana' },
  { id: 'KARNATAKA', name: 'Karnataka' },
  { id: 'KERALA', name: 'Kerala' },
  { id: 'TAMIL_NADU', name: 'Tamil Nadu' },
  { id: 'GOA', name: 'Goa' },
  { id: 'ASSAM', name: 'Assam' },
  { id: 'SIKKIM', name: 'Sikkim' },
  { id: 'ARUNACHAL_PRADESH', name: 'Arunachal Pradesh' },
  { id: 'NAGALAND', name: 'Nagaland' },
  { id: 'MANIPUR', name: 'Manipur' },
  { id: 'MIZORAM', name: 'Mizoram' },
  { id: 'TRIPURA', name: 'Tripura' },
  { id: 'MEGHALAYA', name: 'Meghalaya' },
];

// Simplified SVG paths for Indian states (viewBox 0 0 1000 1000)
export const STATE_PATHS: Record<string, string> = {
  'RAJASTHAN': 'M200,180 L320,160 L400,180 L450,220 L480,300 L450,380 L420,420 L350,440 L280,460 L220,440 L180,380 L160,300 L170,240 Z',
  'GUJARAT': 'M160,380 L220,360 L280,370 L320,400 L340,450 L320,500 L280,520 L220,530 L180,510 L150,460 L140,420 Z',
  'PUNJAB': 'M380,80 L440,70 L500,80 L520,120 L510,160 L470,170 L420,160 L380,140 L360,100 Z',
  'HARYANA': 'M440,140 L500,130 L550,140 L560,170 L540,200 L500,210 L460,200 L440,170 Z',
  'DELHI': 'M480,180 L520,175 L535,195 L525,215 L490,218 L475,200 Z',
  'UTTARAKHAND': 'M520,120 L560,110 L580,130 L575,160 L550,170 L520,160 Z',
  'HIMACHAL_PRADESH': 'M440,40 L500,30 L540,50 L530,80 L490,85 L440,70 Z',
  'JAMMU_KASHMIR': 'M380,0 L480,0 L540,20 L560,60 L540,90 L480,100 L420,90 L380,60 L360,30 Z',
  'UTTAR_PRADESH': 'M520,170 L620,160 L720,170 L780,200 L800,260 L780,320 L720,340 L640,350 L580,340 L540,310 L520,260 L510,210 Z',
  'BIHAR': 'M720,200 L780,190 L840,200 L860,250 L840,300 L780,320 L720,310 L700,260 Z',
  'JHARKHAND': 'M700,300 L760,290 L820,300 L840,340 L820,380 L760,390 L700,380 L680,340 Z',
  'WEST_BENGAL': 'M680,340 L720,320 L760,330 L800,360 L820,420 L800,480 L740,500 L680,480 L660,420 L670,370 Z',
  'ODISHA': 'M720,380 L780,370 L840,380 L870,420 L860,480 L820,520 L760,530 L700,520 L680,470 L700,420 Z',
  'CHHATTISGARH': 'M640,350 L700,340 L760,350 L780,400 L760,450 L700,460 L640,450 L620,400 Z',
  'MADHYA_PRADESH': 'M420,300 L500,290 L580,300 L640,340 L640,400 L600,440 L520,460 L450,450 L400,420 L380,360 Z',
  'MAHARASHTRA': 'M340,450 L420,440 L480,450 L520,480 L520,540 L480,580 L420,600 L360,600 L300,580 L280,530 L300,480 Z',
  'ANDHRA_PRADESH': 'M520,530 L580,520 L640,530 L680,570 L670,630 L620,660 L560,660 L520,630 L510,580 Z',
  'TELANGANA': 'M520,480 L580,470 L640,480 L660,520 L640,560 L580,570 L520,560 L500,520 Z',
  'KARNATAKA': 'M380,540 L440,530 L500,540 L540,580 L530,640 L480,680 L420,690 L360,680 L340,640 L350,590 Z',
  'KERALA': 'M490,680 L520,680 L540,720 L530,780 L500,810 L470,800 L450,760 L460,720 Z',
  'TAMIL_NADU': 'M520,640 L560,640 L600,680 L610,740 L590,800 L550,830 L510,820 L490,780 L500,730 L520,690 Z',
  'GOA': 'M390,590 L420,588 L425,610 L415,625 L395,623 L385,608 Z',
  'ASSAM': 'M820,240 L880,230 L920,250 L930,290 L910,330 L860,340 L820,320 L810,280 Z',
  'SIKKIM': 'M760,320 L790,315 L800,340 L790,360 L765,355 L755,335 Z',
  'ARUNACHAL_PRADESH': 'M880,180 L940,170 L980,200 L980,260 L940,290 L880,280 L860,240 Z',
  'NAGALAND': 'M900,260 L940,250 L960,270 L950,300 L920,310 L895,295 Z',
  'MANIPUR': 'M910,290 L940,285 L955,310 L945,335 L915,340 L905,315 Z',
  'MIZORAM': 'M880,340 L910,335 L925,365 L915,400 L885,405 L870,375 Z',
  'TRIPURA': 'M860,310 L890,305 L900,330 L888,355 L860,352 L852,330 Z',
  'MEGHALAYA': 'M840,290 L870,285 L885,310 L875,340 L845,345 L830,320 Z',
};

// State centroid positions for SVG label placement (viewBox coordinates)
export const STATE_CENTROIDS: Record<string, StateCentroid> = {
  'RAJASTHAN': { x: 310, y: 290 },
  'GUJARAT': { x: 240, y: 445 },
  'PUNJAB': { x: 445, y: 115 },
  'HARYANA': { x: 495, y: 165 },
  'DELHI': { x: 502, y: 195 },
  'UTTARAKHAND': { x: 548, y: 135 },
  'HIMACHAL_PRADESH': { x: 478, y: 55 },
  'JAMMU_KASHMIR': { x: 458, y: 45 },
  'UTTAR_PRADESH': { x: 655, y: 255 },
  'BIHAR': { x: 775, y: 255 },
  'JHARKHAND': { x: 755, y: 340 },
  'WEST_BENGAL': { x: 735, y: 415 },
  'ODISHA': { x: 775, y: 455 },
  'CHHATTISGARH': { x: 695, y: 400 },
  'MADHYA_PRADESH': { x: 510, y: 375 },
  'MAHARASHTRA': { x: 400, y: 515 },
  'ANDHRA_PRADESH': { x: 595, y: 595 },
  'TELANGANA': { x: 580, y: 515 },
  'KARNATAKA': { x: 438, y: 610 },
  'KERALA': { x: 493, y: 745 },
  'TAMIL_NADU': { x: 555, y: 735 },
  'GOA': { x: 403, y: 607 },
  'ASSAM': { x: 870, y: 285 },
  'SIKKIM': { x: 775, y: 337 },
  'ARUNACHAL_PRADESH': { x: 915, y: 230 },
  'NAGALAND': { x: 925, y: 278 },
  'MANIPUR': { x: 928, y: 312 },
  'MIZORAM': { x: 895, y: 370 },
  'TRIPURA': { x: 875, y: 332 },
  'MEGHALAYA': { x: 857, y: 315 },
};

// States large enough to show labels on the map
export const LABELED_STATES = new Set([
  'RAJASTHAN', 'MAHARASHTRA', 'KARNATAKA', 'MADHYA_PRADESH', 'UTTAR_PRADESH', 'GUJARAT',
]);
