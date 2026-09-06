'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface IndiaMapProps {
  stateData?: Record<string, { projectCount: number; completed: number; delayed: number; sanctioned: number }>;
  selectedState?: string;
  onStateClick?: (state: string) => void;
  className?: string;
}

const STATES: Record<string, { name: string; path: string; center: [number, number] }> = {
  RJ: {
    name: 'Rajasthan',
    path: 'M 60 40 L 120 30 L 180 50 L 200 90 L 190 140 L 150 160 L 100 150 L 60 120 Z',
    center: [130, 95],
  },
  GJ: {
    name: 'Gujarat',
    path: 'M 60 150 L 100 150 L 120 180 L 110 220 L 70 240 L 40 220 L 30 180 Z',
    center: [75, 195],
  },
  MP: {
    name: 'Madhya Pradesh',
    path: 'M 120 160 L 180 150 L 240 180 L 250 230 L 230 280 L 170 290 L 120 260 L 100 210 Z',
    center: [175, 215],
  },
  MH: {
    name: 'Maharashtra',
    path: 'M 150 260 L 200 250 L 240 290 L 230 350 L 190 380 L 140 360 L 120 310 L 130 270 Z',
    center: [185, 315],
  },
  KA: {
    name: 'Karnataka',
    path: 'M 140 360 L 200 360 L 230 400 L 220 450 L 180 470 L 130 450 L 120 400 Z',
    center: [175, 410],
  },
  KL: {
    name: 'Kerala',
    path: 'M 160 460 L 190 460 L 200 510 L 180 530 L 160 510 Z',
    center: [180, 490],
  },
  TN: {
    name: 'Tamil Nadu',
    path: 'M 170 460 L 210 450 L 230 500 L 210 560 L 170 570 L 150 530 Z',
    center: [190, 510],
  },
  AP: {
    name: 'Andhra Pradesh',
    path: 'M 200 360 L 260 350 L 290 400 L 270 450 L 220 450 L 200 410 Z',
    center: [245, 400],
  },
  TS: {
    name: 'Telangana',
    path: 'M 220 310 L 280 300 L 300 340 L 290 390 L 240 390 L 220 350 Z',
    center: [260, 345],
  },
  OR: {
    name: 'Odisha',
    path: 'M 280 250 L 340 240 L 370 280 L 360 340 L 310 350 L 280 310 Z',
    center: [325, 295],
  },
  WB: {
    name: 'West Bengal',
    path: 'M 310 180 L 360 160 L 390 190 L 370 240 L 330 250 L 300 230 Z',
    center: [345, 205],
  },
  JH: {
    name: 'Jharkhand',
    path: 'M 280 210 L 330 200 L 350 230 L 340 260 L 290 265 L 270 240 Z',
    center: [310, 235],
  },
  BR: {
    name: 'Bihar',
    path: 'M 280 160 L 330 150 L 350 180 L 340 210 L 290 215 L 270 190 Z',
    center: [310, 182],
  },
  UP: {
    name: 'Uttar Pradesh',
    path: 'M 180 60 L 280 50 L 320 90 L 310 150 L 260 165 L 200 155 L 160 120 Z',
    center: [240, 110],
  },
  UK: {
    name: 'Uttarakhand',
    path: 'M 200 30 L 250 25 L 270 50 L 260 80 L 220 85 L 195 60 Z',
    center: [232, 55],
  },
  HR: {
    name: 'Haryana',
    path: 'M 160 60 L 200 55 L 215 80 L 200 100 L 170 100 L 155 80 Z',
    center: [182, 78],
  },
  PB: {
    name: 'Punjab',
    path: 'M 140 20 L 180 15 L 200 40 L 190 60 L 160 65 L 135 50 Z',
    center: [168, 40],
  },
  HP: {
    name: 'Himachal Pradesh',
    path: 'M 170 0 L 210 0 L 220 25 L 205 40 L 180 40 L 165 25 Z',
    center: [193, 20],
  },
  JK: {
    name: 'Jammu & Kashmir',
    path: 'M 140 -20 L 200 -25 L 215 0 L 200 25 L 160 20 L 135 0 Z',
    center: [175, -5],
  },
  CG: {
    name: 'Chhattisgarh',
    path: 'M 240 250 L 290 240 L 320 270 L 310 320 L 260 330 L 230 295 Z',
    center: [275, 285],
  },
  AS: {
    name: 'Assam',
    path: 'M 370 140 L 420 130 L 440 160 L 420 190 L 380 195 L 360 170 Z',
    center: [400, 162],
  },
};

function getIntensityColor(
  projectCount: number,
  isSelected: boolean,
  isHovered: boolean
): string {
  if (isSelected) return 'fill-vojas-600';
  if (isHovered) return 'fill-vojas-300';
  if (projectCount === 0) return 'fill-slate-100 hover:fill-slate-200';
  if (projectCount < 10) return 'fill-blue-100 hover:fill-blue-200';
  if (projectCount < 50) return 'fill-blue-300 hover:fill-blue-400';
  if (projectCount < 200) return 'fill-blue-400 hover:fill-blue-500';
  return 'fill-blue-600 hover:fill-blue-700';
}

export function IndiaMap({
  stateData = {},
  selectedState,
  onStateClick,
  className,
}: IndiaMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const handleClick = useCallback(
    (stateKey: string) => {
      onStateClick?.(stateKey);
    },
    [onStateClick]
  );

  const maxProjects = Math.max(1, ...Object.values(stateData).map((s) => s.projectCount));

  return (
    <div className={cn('relative', className)}>
      <svg
        viewBox="-20 -30 490 600"
        className="w-full h-auto"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="India political map"
      >
        {/* Background */}
        <rect x="-20" y="-30" width="490" height="600" fill="transparent" />

        {/* Sea/background */}
        <rect x="-20" y="-30" width="490" height="600" fill="#f0f9ff" rx="8" />

        {/* State paths */}
        {Object.entries(STATES).map(([key, state]) => {
          const data = stateData[key] ?? { projectCount: 0, completed: 0, delayed: 0, sanctioned: 0 };
          const isSelected = selectedState === key;
          const isHovered = hovered === key;
          const fillClass = getIntensityColor(data.projectCount, isSelected, isHovered);

          return (
            <g key={key}>
              <path
                d={state.path}
                className={cn(
                  'stroke-white stroke-[1.5] transition-colors duration-200 cursor-pointer',
                  fillClass
                )}
                onClick={() => handleClick(key)}
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(null)}
              />
              {/* State label */}
              {data.projectCount > 0 && (
                <text
                  x={state.center[0]}
                  y={state.center[1]}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={cn(
                    'text-[7px] font-semibold pointer-events-none select-none',
                    isSelected || isHovered ? 'fill-white' : 'fill-slate-700'
                  )}
                >
                  {data.projectCount}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div className="absolute top-2 right-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg p-3 min-w-[160px] z-10">
          <p className="font-semibold mb-1">{STATES[hovered]?.name ?? hovered}</p>
          {stateData[hovered] ? (
            <>
              <p className="text-slate-300">Projects: <span className="text-white font-medium">{stateData[hovered].projectCount}</span></p>
              <p className="text-slate-300">Completed: <span className="text-emerald-400 font-medium">{stateData[hovered].completed}</span></p>
              <p className="text-slate-300">Delayed: <span className="text-amber-400 font-medium">{stateData[hovered].delayed}</span></p>
            </>
          ) : (
            <p className="text-slate-400">No data available</p>
          )}
          <p className="text-slate-500 mt-1 text-[10px]">Click to select</p>
        </div>
      )}
    </div>
  );
}
