'use client';

/**
 * MP Financial Overview — M14
 * Budget and expenditure details for constituency.
 */

import { useMemo } from 'react';
import {
  DollarSign, TrendingUp, PieChart,
  ArrowUpRight, Building2, BarChart3
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
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

  // Default values for demo
  const summary = financials ?? {
    totalSanctioned: 500000000,
    totalReleased: 425000000,
    totalSpent: 312500000,
    utilizationPercent: 62.5,
    bySector: Object.entries(SECTOR_LABELS).map(([key]) => ({
      sector: key,
      sanctioned: Math.floor(Math.random() * 50000000) + 10000000,
      spent: Math.floor(Math.random() * 30000000) + 5000000,
      utilization: Math.floor(Math.random() * 40) + 40,
    })),
    byMonth: [
      { month: 'Jan', sanctioned: 40000000, spent: 28000000 },
      { month: 'Feb', sanctioned: 35000000, spent: 32000000 },
      { month: 'Mar', sanctioned: 45000000, spent: 38000000 },
      { month: 'Apr', sanctioned: 38000000, spent: 29000000 },
      { month: 'May', sanctioned: 42000000, spent: 35000000 },
      { month: 'Jun', sanctioned: 40000000, spent: 42000000 },
      { month: 'Jul', sanctioned: 45000000, spent: 32000000 },
      { month: 'Aug', sanctioned: 40000000, spent: 38500000 },
    ],
  };

  const totalSanctioned = summary.totalSanctioned;
  const totalReleased = summary.totalReleased;
  const totalSpent = summary.totalSpent;
  const utilizationRate = summary.utilizationPercent;
  const remaining = totalSanctioned - totalSpent;

  const topSectors = useMemo(() => {
    return [...(summary.bySector ?? [])]
      .sort((a, b) => b.sanctioned - a.sanctioned)
      .slice(0, 6);
  }, [summary.bySector]);

  const stats = [
    {
      label: 'Total Sanctioned',
      value: totalSanctioned,
      formatted: formatCurrency(totalSanctioned),
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Total Released',
      value: totalReleased,
      formatted: formatCurrency(totalReleased),
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      trend: '+8.2%',
    },
    {
      label: 'Total Spent',
      value: totalSpent,
      formatted: formatCurrency(totalSpent),
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: '+12.5%',
    },
    {
      label: 'Remaining',
      value: remaining,
      formatted: formatCurrency(remaining),
      icon: Building2,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
  ];

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

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardBody className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                  <p className={cn('text-xl font-bold', stat.color)}>
                    {stat.formatted}
                  </p>
                  {stat.trend && (
                    <div className="flex items-center gap-0.5 mt-1 text-xs text-emerald-600">
                      <ArrowUpRight className="h-3 w-3" />
                      <span>{stat.trend} from last period</span>
                    </div>
                  )}
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
                      {formatCurrency(totalReleased)} / {formatCurrency(totalSanctioned)}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-400 rounded-full"
                      style={{ width: `${(totalReleased / totalSanctioned) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {(totalReleased / totalSanctioned * 100).toFixed(1)}% of sanctioned amount released
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">Released</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {((totalReleased / totalSanctioned) * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">Spent</p>
                    <p className="text-lg font-bold text-vojas-600">
                      {((totalSpent / totalReleased) * 100).toFixed(0)}%
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
              <div className="space-y-3">
                {summary.byMonth?.map((month) => {
                  const maxAmount = Math.max(...summary.byMonth.map((m) => m.spent));
                  const percentage = (month.spent / maxAmount) * 100;

                  return (
                    <div key={month.month} className="flex items-center gap-4">
                      <p className="text-sm text-slate-600 w-8">{month.month}</p>
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
                })}
              </div>
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
              <div className="p-3 bg-emerald-50 rounded-lg">
                <p className="text-xs font-medium text-emerald-700 mb-1">Strong Performance</p>
                <p className="text-sm text-emerald-800">
                  Rural Development sector at {topSectors[0]?.utilization.toFixed(0)}% utilization
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <p className="text-xs font-medium text-amber-700 mb-1">Needs Attention</p>
                <p className="text-sm text-amber-800">
                  Housing sector utilization below 50%
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs font-medium text-blue-700 mb-1">Monthly Trend</p>
                <p className="text-sm text-blue-800">
                  August shows highest monthly expenditure
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
