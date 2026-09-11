'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { usePublicProjects } from '@/hooks/usePublicProjects';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { createProjectsApi, createSectorsApi } from '@vojas/api-client';
import { ProjectSector, ProjectStatus } from '@vojas/shared';
import { AlertTriangle, ArrowUpRight, IndianRupee, Loader2, PiggyBank, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const projectsApi = createProjectsApi(apiClient);
const sectorsApi = createSectorsApi(apiClient);
const PAGE_SIZE = 20;

function utilizationPct(sanctioned: number, spent: number): number | null {
  if (!sanctioned || sanctioned <= 0) return null;
  return (spent / sanctioned) * 100;
}

function UtilizationBadge({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-slate-400">—</span>;
  const color = pct >= 90 ? 'text-emerald-600' : pct >= 50 ? 'text-blue-600' : 'text-amber-600';
  return <span className={`font-semibold tabular-nums ${color}`}>{pct.toFixed(1)}%</span>;
}

export function BudgetTrackerClient() {
  const [state, setState] = useState('');
  const [sector, setSector] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['public-budget-summary'],
    queryFn: () => projectsApi.public.getSummary(),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: stateSummaries,
    isLoading: statesLoading,
    isError: statesError,
    refetch: refetchStates,
  } = useQuery({
    queryKey: ['public-budget-states'],
    queryFn: () => projectsApi.public.getStateSummaries(),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: sectorStats,
    isLoading: sectorsLoading,
    isError: sectorsError,
    refetch: refetchSectors,
  } = useQuery({
    queryKey: ['public-budget-sectors'],
    queryFn: () => sectorsApi.getSummary(),
    staleTime: 5 * 60 * 1000,
  });

  const filters = useMemo(
    () => ({
      state: state || undefined,
      sector: (sector || undefined) as ProjectSector | undefined,
      status: (status || undefined) as ProjectStatus | undefined,
      page,
      limit: PAGE_SIZE,
      sortBy: 'approvedAmount' as const,
      sortOrder: 'desc' as const,
    }),
    [state, sector, status, page]
  );
  const { data: projectPage, isLoading: projectsLoading, isFetching, isError } = usePublicProjects(filters);

  const nationalUtilization = summary
    ? utilizationPct(summary.totalSanctioned, summary.totalSpent)
    : null;

  const sortedStates = [...(stateSummaries ?? [])].sort((a, b) => b.totalSanctioned - a.totalSanctioned);
  const sortedSectors = [...(sectorStats ?? [])]
    .filter((s) => s.total > 0)
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Budget Tracker</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Sanctioned and spent amounts for MPLAD projects, sourced from official government records. Figures
          are reported totals — VOJAS does not fabricate a value where none is tracked.
        </p>
      </div>

      {/* National summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={IndianRupee}
          label="Total Sanctioned"
          value={summaryLoading ? null : formatCurrency(summary?.totalSanctioned)}
          color="text-vojas-600"
          isError={summaryError}
          onRetry={() => refetchSummary()}
        />
        <SummaryCard
          icon={Wallet}
          label="Total Spent"
          value={summaryLoading ? null : formatCurrency(summary?.totalSpent)}
          color="text-emerald-600"
          isError={summaryError}
          onRetry={() => refetchSummary()}
        />
        <SummaryCard
          icon={PiggyBank}
          label="Unspent Balance"
          value={
            summaryLoading || !summary
              ? null
              : formatCurrency(Math.max(summary.totalSanctioned - summary.totalSpent, 0))
          }
          color="text-amber-600"
          isError={summaryError}
          onRetry={() => refetchSummary()}
        />
        <SummaryCard
          icon={ArrowUpRight}
          label="Fund Utilization"
          value={summaryLoading ? null : nationalUtilization != null ? `${nationalUtilization.toFixed(1)}%` : 'Not available'}
          color="text-blue-600"
          isError={summaryError}
          onRetry={() => refetchSummary()}
        />
      </div>

      {/* State breakdown */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-800">By State</h2>
        </CardHeader>
        <CardBody className="p-0">
          {statesLoading ? (
            <div className="py-10 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> Loading state finances…
            </div>
          ) : statesError ? (
            <div className="py-10 text-center text-sm text-red-600">
              <AlertTriangle className="h-5 w-5 text-red-400 mx-auto mb-1.5" />
              Could not load state summaries.
              <button
                type="button"
                onClick={() => refetchStates()}
                className="ml-2 font-semibold underline text-blue-600 hover:text-blue-700"
              >
                Retry
              </button>
            </div>
          ) : sortedStates.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">No state-level data available.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="px-5 py-2.5 font-medium">State</th>
                    <th className="px-5 py-2.5 font-medium text-right">Projects</th>
                    <th className="px-5 py-2.5 font-medium text-right">Sanctioned</th>
                    <th className="px-5 py-2.5 font-medium text-right">Spent</th>
                    <th className="px-5 py-2.5 font-medium text-right">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStates.map((s) => (
                    <tr
                      key={s.state}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setState((cur) => (cur === s.state ? '' : s.state));
                        setPage(1);
                      }}
                    >
                      <td className="px-5 py-2.5 font-medium text-slate-700">{s.state}</td>
                      <td className="px-5 py-2.5 text-right text-slate-500 tabular-nums">{s.totalProjects}</td>
                      <td className="px-5 py-2.5 text-right text-slate-700 tabular-nums">{formatCurrency(s.totalSanctioned)}</td>
                      <td className="px-5 py-2.5 text-right text-slate-700 tabular-nums">{formatCurrency(s.totalSpent)}</td>
                      <td className="px-5 py-2.5 text-right">
                        <UtilizationBadge pct={utilizationPct(s.totalSanctioned, s.totalSpent)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Sector breakdown */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-800">By Sector</h2>
        </CardHeader>
        <CardBody className="p-0">
          {sectorsLoading ? (
            <div className="py-10 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> Loading sector statistics…
            </div>
          ) : sectorsError ? (
            <div className="py-10 text-center text-sm text-red-600">
              <AlertTriangle className="h-5 w-5 text-red-400 mx-auto mb-1.5" />
              Could not load sector statistics.
              <button
                type="button"
                onClick={() => refetchSectors()}
                className="ml-2 font-semibold underline text-blue-600 hover:text-blue-700"
              >
                Retry
              </button>
            </div>
          ) : sortedSectors.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">No sector-level data available.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="px-5 py-2.5 font-medium">Sector</th>
                    <th className="px-5 py-2.5 font-medium text-right">Projects</th>
                    <th className="px-5 py-2.5 font-medium text-right">Sanctioned</th>
                    <th className="px-5 py-2.5 font-medium text-right">Spent</th>
                    <th className="px-5 py-2.5 font-medium text-right">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSectors.map((s) => (
                    <tr
                      key={s.sector}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSector((cur) => (cur === s.sector ? '' : s.sector));
                        setPage(1);
                      }}
                    >
                      <td className="px-5 py-2.5 font-medium text-slate-700">{s.sector.replace(/_/g, ' ')}</td>
                      <td className="px-5 py-2.5 text-right text-slate-500 tabular-nums">{s.total}</td>
                      <td className="px-5 py-2.5 text-right text-slate-700 tabular-nums">{formatCurrency(s.totalAmount)}</td>
                      <td className="px-5 py-2.5 text-right text-slate-700 tabular-nums">{formatCurrency(s.spentAmount)}</td>
                      <td className="px-5 py-2.5 text-right">
                        <UtilizationBadge pct={utilizationPct(s.totalAmount, s.spentAmount)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Project-level table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-800">Project-Level Finance</h2>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={state}
                onChange={(e) => { setState(e.target.value); setPage(1); }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white"
                aria-label="Filter by state"
              >
                <option value="">All states</option>
                {(stateSummaries ?? []).map((s) => (
                  <option key={s.state} value={s.state}>{s.state}</option>
                ))}
              </select>
              <select
                value={sector}
                onChange={(e) => { setSector(e.target.value); setPage(1); }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white"
                aria-label="Filter by sector"
              >
                <option value="">All sectors</option>
                {Object.values(ProjectSector).map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white"
                aria-label="Filter by status"
              >
                <option value="">All statuses</option>
                {Object.values(ProjectStatus).map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
              {(state || sector || status) && (
                <Button variant="ghost" size="sm" onClick={() => { setState(''); setSector(''); setStatus(''); setPage(1); }}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {projectsLoading ? (
            <div className="py-10 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : isError ? (
            <div className="py-10 text-center">
              <AlertTriangle className="h-5 w-5 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-600">Could not load project finance data.</p>
            </div>
          ) : (projectPage?.data.length ?? 0) === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">No projects match these filters.</div>
          ) : (
            <>
              <div className={`overflow-x-auto ${isFetching ? 'opacity-60' : ''}`}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="px-5 py-2.5 font-medium">Project</th>
                      <th className="px-5 py-2.5 font-medium">Location</th>
                      <th className="px-5 py-2.5 font-medium text-right">Sanctioned</th>
                      <th className="px-5 py-2.5 font-medium text-right">Spent</th>
                      <th className="px-5 py-2.5 font-medium text-right">Utilization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(projectPage?.data ?? []).map((p) => (
                      <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                        <td className="px-5 py-2.5">
                          <Link href={`/explore/${p.id}`} className="font-medium text-vojas-700 hover:underline">
                            {p.name}
                          </Link>
                          <p className="text-xs text-slate-400 mt-0.5">{p.sector.replace(/_/g, ' ')}</p>
                        </td>
                        <td className="px-5 py-2.5 text-slate-500">
                          {[p.district, p.state].filter(Boolean).join(', ') || '—'}
                        </td>
                        <td className="px-5 py-2.5 text-right text-slate-700 tabular-nums">{formatCurrency(p.approvedAmount)}</td>
                        <td className="px-5 py-2.5 text-right text-slate-700 tabular-nums">{formatCurrency(p.spentAmount)}</td>
                        <td className="px-5 py-2.5 text-right">
                          <UtilizationBadge pct={utilizationPct(p.approvedAmount, p.spentAmount)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(projectPage?.totalPages ?? 1) > 1 && (
                <div className="flex items-center justify-center gap-3 py-4 border-t border-slate-100">
                  <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Previous
                  </Button>
                  <span className="text-sm text-slate-500">
                    Page {page} of {projectPage?.totalPages ?? 1}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= (projectPage?.totalPages ?? 1)}
                    onClick={() => setPage((p) => Math.min(projectPage?.totalPages ?? 1, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      <p className="text-xs text-slate-400 leading-relaxed">
        VOJAS tracks &ldquo;sanctioned&rdquo; (approved) and &ldquo;spent&rdquo; (expenditure) amounts as reported.
        A separate &ldquo;released&rdquo; figure — funds transferred to implementing agencies ahead of actual
        spending — is not currently tracked and is not shown here.
      </p>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
  isError,
  onRetry,
}: {
  icon: typeof IndianRupee;
  label: string;
  value: string | null | undefined;
  color: string;
  isError?: boolean;
  onRetry?: () => void;
}) {
  return (
    <Card>
      <CardBody className="p-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 mb-2`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        {isError ? (
          <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium py-1">
            <span>Unavailable</span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="underline hover:text-red-700 text-[11px]"
              >
                Retry
              </button>
            )}
          </div>
        ) : value == null ? (
          <div className="h-7 w-24 bg-slate-100 rounded animate-pulse" />
        ) : (
          <p className="text-xl font-bold text-slate-800">{value}</p>
        )}
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </CardBody>
    </Card>
  );
}
