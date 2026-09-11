'use client';

/**
 * MP Financial Overview — M14
 * Budget and expenditure details for constituency.
 */

import { useMemo } from 'react';
import {
  DollarSign, TrendingUp, PieChart,
  Building2, BarChart3
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { DataUnavailable, ValueUnavailable } from '@/components/ui/DataUnavailable';
import { ExportButton } from '@/components/ui/ExportButton';
import { useMPFinancials } from '@/hooks/useMP';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, cn } from '@/lib/utils';
import type { ProjectSector } from '@vojas/shared';

// Sector labels
const SECTOR_LABELS: Partial<Record<ProjectSector, string>> = {
  PUBLIC_INFRASTRUCTURE: 'Public Infrastructure',
  WATER_SANITATION: 'Water & Sanitation',
  EDUCATION: 'Education',
  HEALTH: 'Health',
  AGRICULTURE: 'Agriculture',
  ENVIRONMENT: 'Environment',
  TRANSPORT: 'Transport',
  ENERGY: 'Energy',
  HOUSING: 'Housing',
  RURAL_DEVELOPMENT: 'Rural Development',
  SOCIAL_WELFARE: 'Social Welfare',
  PUBLIC_ADMIN: 'Public Admin',
  FINANCE_PROCUREMENT: 'Finance',
  JUSTICE: 'Justice',
  LEGISLATIVE: 'Legislative',
  PUBLIC_SAFETY: 'Public Safety',
};

export default function MPFinancePage() {
  const { user } = useAuth();
  const mpId = (user as any)?.mpId ?? 'current-mp';
  const { data: financials, isLoading } = useMPFinancials(mpId);

  const topSectors = useMemo(() => {
    return [...(financials?.bySector ?? [])]
      .sort((a, b) => b.sanctioned - a.sanctioned)
      .slice(0, 6);
  }, [financials?.bySector]);

  const stats = useMemo(() => {
    if (!financials) return [];
    const remainingAmount = financials.totalSanctioned - financials.totalSpent;
    return [
      {
        label: 'Total Sanctioned',
        formatted: formatCurrency(financials.totalSanctioned),
        icon: DollarSign,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
      },
      {
        label: 'Total Released',
        // null when no RELEASE observations exist — shown as unavailable, not
        // silently substituted with the expenditure figure.
        formatted:
          financials.totalReleased === null ? null : formatCurrency(financials.totalReleased),
        icon: TrendingUp,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
      },
      {
        label: 'Total Spent',
        formatted: formatCurrency(financials.totalSpent),
        icon: BarChart3,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
      },
      {
        label: 'Remaining',
        formatted: formatCurrency(remainingAmount),
        icon: Building2,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
      },
    ];
  }, [financials]);

  const totalSanctioned = financials?.totalSanctioned ?? 0;
  const totalReleased = financials?.totalReleased ?? null;
  const totalSpent = financials?.totalSpent ?? 0;
  const utilizationRate = financials?.utilizationPercent ?? 0;
  const remaining = totalSanctioned - totalSpent;

  /**
   * Every insight is derived from figures actually returned by the API and
   * names the sector or month it came from. An insight with no supporting data
   * is omitted rather than asserted.
   */
  const insights = useMemo(() => {
    if (!financials) return [];
    const out: Array<{
      label: string;
      body: string;
      bg: string;
      labelColor: string;
      textColor: string;
    }> = [];

    const sectorsWithBudget = financials.bySector.filter((s) => s.sanctioned > 0);

    if (sectorsWithBudget.length > 0) {
      const best = sectorsWithBudget.reduce((a, b) => (b.utilization > a.utilization ? b : a));
      out.push({
        label: 'Highest utilisation',
        body: `${SECTOR_LABELS[best.sector as ProjectSector] ?? best.sector} at ${best.utilization.toFixed(0)}% of sanctioned funds spent.`,
        bg: 'bg-emerald-50',
        labelColor: 'text-emerald-700',
        textColor: 'text-emerald-800',
      });

      const worst = sectorsWithBudget.reduce((a, b) => (b.utilization < a.utilization ? b : a));
      if (worst.sector !== best.sector) {
        out.push({
          label: 'Lowest utilisation',
          body: `${SECTOR_LABELS[worst.sector as ProjectSector] ?? worst.sector} at ${worst.utilization.toFixed(0)}%. Low utilisation is a prompt to check for delays, not evidence of any wrongdoing.`,
          bg: 'bg-amber-50',
          labelColor: 'text-amber-700',
          textColor: 'text-amber-800',
        });
      }
    }

    if (financials.byMonth.length > 0) {
      const peak = financials.byMonth.reduce((a, b) => (b.spent > a.spent ? b : a));
      if (peak.spent > 0) {
        out.push({
          label: 'Peak expenditure month',
          body: `${peak.month} recorded the highest expenditure at ${formatCurrency(peak.spent)}.`,
          bg: 'bg-blue-50',
          labelColor: 'text-blue-700',
          textColor: 'text-blue-800',
        });
      }
    }

    return out;
  }, [financials]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <DollarSign className="h-4 w-4" />
            <span>My Constituency</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Financial Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Budget allocation and expenditure tracking
          </p>
        </div>
        <ExportButton
          csvEndpoint={`${process.env.NEXT_PUBLIC_API_URL}/api/v1/export/financials`}
          csvParams={{ mpId }}
          filenameHint="mp-financials"
        />
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <CardBody className="p-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-6 w-32" />
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && !financials && (
        <DataUnavailable
          reason="NO_DATA"
          title="No financial records for this constituency"
          detail="No sanctioned, released or expenditure records are linked to projects for this MP. Figures will appear here once official financial data is ingested."
        />
      )}

      {!isLoading && financials && (
        <>
      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardBody className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                  <p className={cn('text-xl font-bold', stat.color)}>
                    {stat.formatted ?? <ValueUnavailable reason="NO_DATA" />}
                  </p>
                </div>
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', stat.bgColor)}>
                  <stat.icon className={cn('h-5 w-5', stat.color)} />
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Utilization Overview */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-vojas-600" />
                  Utilization Overview
                </h2>
                <Badge variant={utilizationRate >= 70 ? 'success' : utilizationRate >= 40 ? 'warning' : 'danger'}>
                  {utilizationRate.toFixed(1)}% Utilized
                </Badge>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Overall Utilization</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(totalSpent)} / {formatCurrency(totalSanctioned)}
                    </span>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-vojas-500 to-vojas-600 rounded-full transition-all"
                      style={{ width: `${Math.min(utilizationRate, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Released vs Sanctioned</span>
                    <span className="font-semibold text-slate-900">
                      {totalReleased === null ? (
                        <ValueUnavailable reason="NO_DATA" />
                      ) : (
                        `${formatCurrency(totalReleased)} / ${formatCurrency(totalSanctioned)}`
                      )}
                    </span>
                  </div>
                  {totalReleased === null ? (
                    <p className="text-xs text-slate-500">
                      No fund-release records are available for this constituency, so the released
                      share cannot be calculated.
                    </p>
                  ) : (
                    <>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-400 rounded-full"
                          style={{
                            width: `${totalSanctioned > 0 ? Math.min((totalReleased / totalSanctioned) * 100, 100) : 0}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {totalSanctioned > 0
                          ? `${((totalReleased / totalSanctioned) * 100).toFixed(1)}% of sanctioned amount released`
                          : 'Sanctioned amount not recorded, so the released share cannot be calculated.'}
                      </p>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">Released</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {totalReleased !== null && totalSanctioned > 0 ? (
                        `${((totalReleased / totalSanctioned) * 100).toFixed(0)}%`
                      ) : (
                        <ValueUnavailable reason="NO_DATA" />
                      )}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">Spent</p>
                    <p className="text-lg font-bold text-vojas-600">
                      {totalReleased !== null && totalReleased > 0 ? (
                        `${((totalSpent / totalReleased) * 100).toFixed(0)}%`
                      ) : (
                        <ValueUnavailable reason="NO_DATA" />
                      )}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">Pending</p>
                    <p className="text-lg font-bold text-amber-600">
                      {formatCurrency(remaining)}
                    </p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Monthly Expenditure</h2>
            </CardHeader>
            <CardBody>
              {financials.byMonth.length === 0 ? (
                <DataUnavailable
                  reason="NO_DATA"
                  variant="inline"
                  title="No dated expenditure records"
                  detail="A monthly series needs financial observations carrying a transaction date. None are recorded for this constituency yet."
                />
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const maxAmount = Math.max(...financials.byMonth.map((m) => m.spent));
                    return financials.byMonth.map((month) => {
                      const percentage = maxAmount > 0 ? (month.spent / maxAmount) * 100 : 0;
                      return (
                        <div key={month.month} className="flex items-center gap-4">
                          <p className="text-sm text-slate-600 w-16 tabular-nums">{month.month}</p>
                          <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden relative">
                            <div
                              className="h-full bg-vojas-500 rounded-lg transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-700">
                              {formatCurrency(month.spent)}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">By Sector</h2>
            </CardHeader>
            <CardBody className="p-0">
              {topSectors.length === 0 && (
                <DataUnavailable
                  reason="NO_DATA"
                  variant="inline"
                  title="No sector breakdown"
                  detail="No projects with recorded amounts are linked to this constituency."
                />
              )}
              <div className="divide-y divide-slate-100">
                {topSectors.map((sector) => {
                  const utilization = sector.utilization;
                  const utilizationColor = utilization >= 70 ? 'text-emerald-600' :
                    utilization >= 40 ? 'text-amber-600' : 'text-red-600';

                  return (
                    <div key={sector.sector} className="px-4 py-3 hover:bg-slate-50">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-slate-900">
                          {SECTOR_LABELS[sector.sector as ProjectSector] ?? sector.sector}
                        </p>
                        <span className={cn('text-sm font-semibold', utilizationColor)}>
                          {utilization.toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mb-1">
                        Sanctioned: {formatCurrency(sector.sanctioned)}
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            utilization >= 70 ? 'bg-emerald-500' :
                            utilization >= 40 ? 'bg-amber-500' : 'bg-red-500'
                          )}
                          style={{ width: `${utilization}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Key Insights</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              {insights.length === 0 ? (
                <DataUnavailable
                  reason="INSUFFICIENT_DATA"
                  variant="inline"
                  title="Not enough data for insights"
                  detail="Insights are derived from recorded sector and expenditure figures. There are none yet for this constituency."
                />
              ) : (
                insights.map((insight) => (
                  <div key={insight.label} className={cn('p-3 rounded-lg', insight.bg)}>
                    <p className={cn('text-xs font-medium mb-1', insight.labelColor)}>{insight.label}</p>
                    <p className={cn('text-sm', insight.textColor)}>{insight.body}</p>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
