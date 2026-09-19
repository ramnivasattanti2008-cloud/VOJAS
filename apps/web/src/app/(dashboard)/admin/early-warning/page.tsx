'use client';

/**
 * Early Warning Command Center
 *
 * Real HIGH/CRITICAL-scored projects rolled up by state and district, with
 * drill-down to the actual project list. Built on the existing risk engine's
 * real, persisted ProjectRisk scores — no separate "MoSPI/State Nodal
 * Officer/District Authority" role exists in this app (see CLAUDE.md's
 * actual UserRole set), so this view serves that governance function for
 * the roles that do exist and already hold risk.read: ADMIN and OFFICER.
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, ChevronRight, MapPin, ShieldAlert } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  useStateRiskAggregate,
  useDistrictRiskAggregate,
  useEarlyWarningProjects,
} from '@/hooks/useRisk';

export default function EarlyWarningPage() {
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  const { data: stateData, isLoading: statesLoading } = useStateRiskAggregate();
  const { data: districtData, isLoading: districtsLoading } = useDistrictRiskAggregate(selectedState ?? undefined);

  const scope = useMemo(() => {
    if (selectedDistrict) return { type: 'district' as const, value: selectedDistrict };
    if (selectedState) return { type: 'state' as const, value: selectedState };
    return undefined;
  }, [selectedState, selectedDistrict]);

  const { data: warningData, isLoading: projectsLoading } = useEarlyWarningProjects(scope, 25);

  const states = stateData?.states ?? [];
  const districts = districtData?.districts ?? [];
  const projects = warningData?.projects ?? [];

  const nationalHighRisk = states.reduce((sum, s) => sum + s.highRiskCount, 0);
  const nationalFindings = states.reduce((sum, s) => sum + s.activeFindings, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-[#1C1C1E] tracking-[-0.01em] flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-[#FF3B30]" />
          Early Warning Command Center
        </h1>
        <p className="text-[13px] text-[#6E6E73] mt-1">
          Real-time risk rollup from the multi-signal risk engine — {nationalHighRisk} project{nationalHighRisk === 1 ? '' : 's'} currently scored HIGH or CRITICAL, {nationalFindings} open finding{nationalFindings === 1 ? '' : 's'} nationwide.
        </p>
      </div>

      {/* Breadcrumb / drill-down trail */}
      {(selectedState || selectedDistrict) && (
        <div className="flex items-center gap-1.5 text-[13px] text-[#6E6E73]">
          <button
            onClick={() => { setSelectedState(null); setSelectedDistrict(null); }}
            className="flex items-center gap-1 font-semibold text-[#007AFF] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All States
          </button>
          {selectedState && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <button
                onClick={() => setSelectedDistrict(null)}
                className={cn('font-semibold hover:underline', selectedDistrict ? 'text-[#007AFF]' : 'text-[#1C1C1E]')}
              >
                {selectedState}
              </button>
            </>
          )}
          {selectedDistrict && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-[#1C1C1E] font-semibold">{selectedDistrict}</span>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: state or district rollup */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-[15px] font-semibold text-[#1C1C1E]">
                {selectedState ? `Districts in ${selectedState}` : 'By State'}
              </h2>
            </CardHeader>
            <CardBody className="p-0 max-h-[560px] overflow-y-auto">
              {statesLoading || (selectedState && districtsLoading) ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="divide-y divide-black/[0.05]">
                  {(selectedState ? districts : states).map((row) => {
                    const key = selectedState ? (row as typeof districts[number]).district : (row as typeof states[number]).state;
                    const isActive = selectedState ? selectedDistrict === key : selectedState === key;
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          if (selectedState) setSelectedDistrict(selectedDistrict === key ? null : key);
                          else setSelectedState(key);
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-4 py-3 text-left transition-colors',
                          isActive ? 'bg-[#007AFF]/[0.08]' : 'hover:bg-black/[0.02]'
                        )}
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#1C1C1E] truncate">{key}</p>
                          <p className="text-[11px] text-[#8E8E93] mt-0.5">
                            {row.projectCount} project{row.projectCount === 1 ? '' : 's'} in progress · {row.activeFindings} open finding{row.activeFindings === 1 ? '' : 's'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {row.highRiskCount > 0 && (
                            <Badge variant="danger">{row.highRiskCount} high-risk</Badge>
                          )}
                          <span className={cn(
                            'text-[13px] font-bold tabular-nums',
                            row.avgRiskScore >= 60 ? 'text-[#FF3B30]' : row.avgRiskScore >= 35 ? 'text-[#FF9500]' : 'text-[#8E8E93]'
                          )}>
                            {row.avgRiskScore}
                          </span>
                          {!selectedState && <ChevronRight className="h-4 w-4 text-[#C7C7CC]" />}
                        </div>
                      </button>
                    );
                  })}
                  {!statesLoading && (selectedState ? districts : states).length === 0 && (
                    <p className="px-4 py-8 text-center text-[13px] text-[#8E8E93]">No in-progress projects on record here.</p>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right: actual high-risk projects in the selected scope */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <h2 className="text-[15px] font-semibold text-[#1C1C1E] flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#FF9500]" />
                HIGH / CRITICAL Projects{scope ? ` — ${scope.value}` : ' — Nationwide'}
              </h2>
            </CardHeader>
            <CardBody className="p-0 max-h-[560px] overflow-y-auto">
              {projectsLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : projects.length === 0 ? (
                <p className="px-4 py-10 text-center text-[13px] text-[#8E8E93]">
                  No projects currently score HIGH or CRITICAL in this scope.
                </p>
              ) : (
                <div className="divide-y divide-black/[0.05]">
                  {projects.map((p) => (
                    <Link
                      key={p.projectId}
                      href={`/projects/${p.projectId}`}
                      className="block px-4 py-3.5 hover:bg-black/[0.02] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-semibold text-[#1C1C1E] truncate">{p.name}</p>
                          <p className="text-[11.5px] text-[#8E8E93] mt-0.5 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {p.district}, {p.state} · {p.sector.replace(/_/g, ' ')}
                          </p>
                          {p.primaryDriver && (
                            <p className="text-[11.5px] text-[#48484A] mt-1.5 line-clamp-2">{p.primaryDriver}</p>
                          )}
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <Badge variant={p.riskLevel === 'CRITICAL' ? 'danger' : 'warning'}>
                            {p.riskLevel} · {p.riskScore}
                          </Badge>
                          <span className="text-[11px] text-[#8E8E93]">{p.openFindings} finding{p.openFindings === 1 ? '' : 's'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-[#8E8E93] tabular-nums">
                        <span>Sanctioned {formatCurrency(p.approvedAmount)}</span>
                        <span>Spent {formatCurrency(p.spentAmount)}</span>
                        <span>Scored {formatDate(p.lastScoredAt)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
