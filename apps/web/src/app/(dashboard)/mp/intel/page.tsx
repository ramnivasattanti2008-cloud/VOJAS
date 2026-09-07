'use client';

/**
 * MP Sector Intelligence — M14
 * 16-sector overview for constituency with per-sector status.
 */

import Link from 'next/link';
import {
  Layers, Building2, CheckCircle2, Clock, AlertTriangle,
  TrendingUp, ArrowRight, MapPin, BarChart3
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useSectorOverview } from '@/hooks/useSectors';
import { useAuth } from '@/hooks/useAuth';
import { cn, formatCurrency } from '@/lib/utils';
import type { ProjectSector } from '@vojas/shared';

const SECTOR_LABELS: Record<string, string> = {
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
  PUBLIC_ADMIN: 'Public Administration',
  FINANCE_PROCUREMENT: 'Finance & Procurement',
  JUSTICE: 'Justice',
  LEGISLATIVE: 'Legislative',
  PUBLIC_SAFETY: 'Public Safety',
};

const SECTOR_ICONS: Record<string, string> = {
  PUBLIC_INFRASTRUCTURE: '🏗️',
  WATER_SANITATION: '🚰',
  EDUCATION: '📚',
  HEALTH: '🏥',
  AGRICULTURE: '🌾',
  ENVIRONMENT: '🌿',
  TRANSPORT: '🛣️',
  ENERGY: '⚡',
  HOUSING: '🏠',
  RURAL_DEVELOPMENT: '🏡',
  SOCIAL_WELFARE: '🤝',
  PUBLIC_ADMIN: '🏛️',
  FINANCE_PROCUREMENT: '💰',
  JUSTICE: '⚖️',
  LEGISLATIVE: '📜',
  PUBLIC_SAFETY: '🚔',
};

// Mock sector data for MP constituency
const mockSectorData: Record<string, {
  projectCount: number;
  completed: number;
  inProgress: number;
  delayed: number;
  totalAmount: number;
  spentAmount: number;
  attentionNeeded: boolean;
  trend: 'up' | 'down' | 'stable';
}> = {
  PUBLIC_INFRASTRUCTURE: { projectCount: 28, completed: 18, inProgress: 7, delayed: 3, totalAmount: 85000000, spentAmount: 68000000, attentionNeeded: true, trend: 'up' },
  WATER_SANITATION: { projectCount: 24, completed: 15, inProgress: 6, delayed: 3, totalAmount: 62000000, spentAmount: 43400000, attentionNeeded: true, trend: 'stable' },
  EDUCATION: { projectCount: 32, completed: 22, inProgress: 8, delayed: 2, totalAmount: 48000000, spentAmount: 38400000, attentionNeeded: false, trend: 'up' },
  HEALTH: { projectCount: 18, completed: 10, inProgress: 5, delayed: 3, totalAmount: 75000000, spentAmount: 45000000, attentionNeeded: true, trend: 'down' },
  AGRICULTURE: { projectCount: 15, completed: 9, inProgress: 4, delayed: 2, totalAmount: 35000000, spentAmount: 24500000, attentionNeeded: false, trend: 'stable' },
  ENVIRONMENT: { projectCount: 12, completed: 6, inProgress: 4, delayed: 2, totalAmount: 28000000, spentAmount: 14000000, attentionNeeded: true, trend: 'down' },
  TRANSPORT: { projectCount: 22, completed: 12, inProgress: 8, delayed: 2, totalAmount: 95000000, spentAmount: 71250000, attentionNeeded: false, trend: 'up' },
  ENERGY: { projectCount: 14, completed: 8, inProgress: 4, delayed: 2, totalAmount: 42000000, spentAmount: 29400000, attentionNeeded: false, trend: 'stable' },
  HOUSING: { projectCount: 20, completed: 8, inProgress: 6, delayed: 6, totalAmount: 120000000, spentAmount: 60000000, attentionNeeded: true, trend: 'down' },
  RURAL_DEVELOPMENT: { projectCount: 25, completed: 15, inProgress: 8, delayed: 2, totalAmount: 68000000, spentAmount: 47600000, attentionNeeded: false, trend: 'up' },
  SOCIAL_WELFARE: { projectCount: 16, completed: 10, inProgress: 4, delayed: 2, totalAmount: 38000000, spentAmount: 26600000, attentionNeeded: false, trend: 'stable' },
  PUBLIC_ADMIN: { projectCount: 8, completed: 5, inProgress: 2, delayed: 1, totalAmount: 25000000, spentAmount: 17500000, attentionNeeded: false, trend: 'stable' },
  FINANCE_PROCUREMENT: { projectCount: 6, completed: 4, inProgress: 1, delayed: 1, totalAmount: 15000000, spentAmount: 10500000, attentionNeeded: false, trend: 'stable' },
  JUSTICE: { projectCount: 5, completed: 3, inProgress: 1, delayed: 1, totalAmount: 18000000, spentAmount: 12600000, attentionNeeded: false, trend: 'stable' },
  LEGISLATIVE: { projectCount: 3, completed: 2, inProgress: 1, delayed: 0, totalAmount: 8000000, spentAmount: 6000000, attentionNeeded: false, trend: 'stable' },
  PUBLIC_SAFETY: { projectCount: 10, completed: 6, inProgress: 3, delayed: 1, totalAmount: 32000000, spentAmount: 22400000, attentionNeeded: false, trend: 'up' },
};

export default function MPIntelPage() {
  const { user } = useAuth();
  const { data: overview } = useSectorOverview();

  const sectors = Object.entries(SECTOR_LABELS);

  // Calculate totals
  const totals = Object.values(mockSectorData).reduce(
    (acc, s) => ({
      projectCount: acc.projectCount + s.projectCount,
      completed: acc.completed + s.completed,
      inProgress: acc.inProgress + s.inProgress,
      delayed: acc.delayed + s.delayed,
      totalAmount: acc.totalAmount + s.totalAmount,
      spentAmount: acc.spentAmount + s.spentAmount,
      attentionNeeded: acc.attentionNeeded || s.attentionNeeded,
    }),
    { projectCount: 0, completed: 0, inProgress: 0, delayed: 0, totalAmount: 0, spentAmount: 0, attentionNeeded: false }
  );

  const overallUtilization = totals.totalAmount > 0
    ? ((totals.spentAmount / totals.totalAmount) * 100).toFixed(1)
    : '0';

  // Sort sectors: attention needed first, then by project count
  const sortedSectors = [...sectors].sort(([, labelA], [, labelB]) => {
    const a = mockSectorData[Object.keys(SECTOR_LABELS).find(k => SECTOR_LABELS[k] === labelA)!];
    const b = mockSectorData[Object.keys(SECTOR_LABELS).find(k => SECTOR_LABELS[k] === labelB)!];
    if (a?.attentionNeeded && !b?.attentionNeeded) return -1;
    if (!a?.attentionNeeded && b?.attentionNeeded) return 1;
    return (b?.projectCount ?? 0) - (a?.projectCount ?? 0);
  });

  // Sectors needing attention
  const attentionSectors = sectors.filter(([code]) => mockSectorData[code]?.attentionNeeded);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Layers className="h-4 w-4" />
            <span>My Constituency</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Sector Intelligence</h1>
          <p className="text-sm text-slate-500 mt-1">
            16-sector performance overview for your constituency
          </p>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="h-4 w-4 text-vojas-600" />
              <span className="text-xs text-slate-500">Total Sectors</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{sectors.length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-slate-500">Total Projects</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{totals.projectCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-xs text-slate-500">Completed</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{totals.completed}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-xs text-slate-500">Needs Attention</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{attentionSectors.length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-slate-500">Utilization</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{overallUtilization}%</p>
          </CardBody>
        </Card>
      </div>

      {/* Attention Needed Alert */}
      {attentionSectors.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardBody>
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">Sectors Needing Attention</p>
                <p className="text-sm text-red-700 mt-1">
                  The following sectors have delayed projects or low utilization:
                  {attentionSectors.map(([code, label]) => (
                    <span key={code}> {label}{code !== attentionSectors[attentionSectors.length - 1][0] && ','}</span>
                  ))}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Sector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedSectors.map(([code, label]) => {
          const data = mockSectorData[code];
          if (!data) return null;

          const utilization = data.totalAmount > 0
            ? ((data.spentAmount / data.totalAmount) * 100)
            : 0;

          return (
            <Card
              key={code}
              className={cn(
                'transition-all hover:shadow-md',
                data.attentionNeeded && 'border-red-200'
              )}
            >
              <CardBody className="p-5">
                {/* Sector Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{SECTOR_ICONS[code]}</span>
                    <div>
                      <h3 className="font-semibold text-slate-900">{label}</h3>
                      <p className="text-xs text-slate-400">{data.projectCount} projects</p>
                    </div>
                  </div>
                  {data.attentionNeeded && (
                    <Badge variant="danger">Attention</Badge>
                  )}
                </div>

                {/* Stats */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Completed</span>
                    <span className="font-medium text-emerald-600">{data.completed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">In Progress</span>
                    <span className="font-medium text-blue-600">{data.inProgress}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Delayed</span>
                    <span className={cn('font-medium', data.delayed > 0 ? 'text-red-600' : 'text-slate-600')}>
                      {data.delayed}
                    </span>
                  </div>
                </div>

                {/* Utilization Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Utilization</span>
                    <span className={cn(
                      'font-medium',
                      utilization >= 70 ? 'text-emerald-600' :
                      utilization >= 40 ? 'text-amber-600' : 'text-red-600'
                    )}>
                      {utilization.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        utilization >= 70 ? 'bg-emerald-500' :
                        utilization >= 40 ? 'bg-amber-500' : 'bg-red-500'
                      )}
                      style={{ width: `${Math.min(utilization, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Amount */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">Total Sanctioned</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {formatCurrency(data.totalAmount)}
                  </span>
                </div>

                {/* CTA */}
                <Link href={`/sectors/${code}`} className="mt-4 block">
                  <Button variant="secondary" size="sm" className="w-full" rightIcon={<ArrowRight className="h-3 w-3" />}>
                    View Details
                  </Button>
                </Link>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Framework Note */}
      <Card>
        <CardBody>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-700">About Sector Intelligence</p>
              <p className="text-xs text-slate-500 mt-1">
                This intelligence is scoped to projects in your constituency. Indicators marked as AI-INTERPRETED are
                AI-generated and may not reflect official data. Click &quot;View Details&quot; for comprehensive sector analysis.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
