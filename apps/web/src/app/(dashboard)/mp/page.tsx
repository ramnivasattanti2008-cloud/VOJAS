'use client';

/**
 * MP Home / My Constituency — M14
 * Executive overview of the MP's constituency portfolio.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Building2, CheckCircle2, Clock, AlertTriangle, TrendingUp,
  DollarSign, Users, MapPin, ArrowRight, FileText, BarChart3,
  Map, Target, Activity
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useMPConstituency } from '@/hooks/useMP';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, cn } from '@/lib/utils';
import type { ProjectSector } from '@vojas/shared';

// Sector labels for the constituency
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

export default function MPHomePage() {
  const { user } = useAuth();

  // Get MP ID from user context (would come from user's linked MP record)
  const mpId = (user as any)?.mpId ?? 'current-mp';

  const { data: constituency, isLoading } = useMPConstituency(mpId);

  // Quick stats
  const stats = useMemo(() => [
    {
      label: 'Total Projects',
      value: constituency?.totalProjects ?? 0,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Completed',
      value: constituency?.completedProjects ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      label: 'In Progress',
      value: constituency?.inProgressProjects ?? 0,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Needs Attention',
      value: constituency?.attentionNeeded ?? 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ], [constituency]);

  // Quick links
  const quickLinks = [
    { href: '/mp/projects', label: 'Projects', icon: Building2, description: 'View all constituency projects' },
    { href: '/mp/map', label: 'Map', icon: Map, description: 'Geographic project view' },
    { href: '/mp/finance', label: 'Finance', icon: DollarSign, description: 'Budget & expenditure' },
    { href: '/mp/reports', label: 'Reports', icon: FileText, description: 'Generate reports' },
    { href: '/mp/demand', label: 'Demand', icon: Target, description: 'Development demands' },
    { href: '/mp/intel', label: 'Intel', icon: BarChart3, description: 'Sector intelligence' },
    { href: '/mp/signals', label: 'Signals', icon: Activity, description: 'Citizen signals' },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-vojas-600 via-vojas-700 to-vojas-800 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-vojas-200 text-sm mb-2">
              <MapPin className="h-4 w-4" />
              <span>{constituency?.house ?? 'Lok Sabha'} • {constituency?.state ?? 'Your State'}</span>
            </div>
            <h1 className="text-3xl font-bold mb-1">MY CONSTITUENCY</h1>
            <p className="text-vojas-100 text-lg">
              {constituency?.constituency ?? 'Your Constituency Name'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-vojas-200 text-sm mb-1">Total Sanctioned</div>
            <div className="text-2xl font-bold">
              {isLoading ? '—' : formatCurrency(constituency?.totalSanctioned ?? 0)}
            </div>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {stats.map((stat) => (
            <div key={stat.label} className={cn('rounded-xl p-4', stat.bgColor)}>
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={cn('h-4 w-4', stat.color)} />
                <span className="text-xs text-slate-600 font-medium">{stat.label}</span>
              </div>
              <p className={cn('text-2xl font-bold', stat.color)}>
                {isLoading ? '—' : stat.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                  Financial Overview
                </h2>
                <Link href="/mp/finance">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                    Details
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardBody>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Sanctioned vs Spent */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">Total Sanctioned</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(constituency?.totalSanctioned ?? 0)}
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-vojas-500 rounded-full" style={{ width: '100%' }} />
                    </div>
                  </div>

                  {/* Utilization */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">Total Spent</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(constituency?.totalSpent ?? 0)}
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.min(constituency?.utilizationRate ?? 0, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {constituency?.utilizationRate?.toFixed(1) ?? '0'}% utilization rate
                    </p>
                  </div>

                  {/* Quick Metrics */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                    <div>
                      <p className="text-xs text-slate-500">Released</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {formatCurrency((constituency?.totalSanctioned ?? 0) * 0.85)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Remaining</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {formatCurrency((constituency?.totalSanctioned ?? 0) * 0.15)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Project Distribution */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-vojas-600" />
                  Project Distribution
                </h2>
                <Link href="/mp/projects">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                    All Projects
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Sector breakdown would come from API */}
                {Object.entries(SECTOR_LABELS).slice(0, 8).map(([key, label]) => {
                  const count = Math.floor(Math.random() * 15) + 1; // Placeholder - would come from API
                  return (
                    <div key={key} className="text-center p-3 bg-slate-50 rounded-lg">
                      <p className="text-2xl font-bold text-vojas-600">{count}</p>
                      <p className="text-xs text-slate-500 mt-1 truncate">{label}</p>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Activity className="h-5 w-5 text-amber-600" />
                Recent Activity
              </h2>
            </CardHeader>
            <CardBody className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : constituency?.recentActivity?.length ? (
                <div className="divide-y divide-slate-100">
                  {constituency.recentActivity.slice(0, 5).map((activity, i) => (
                    <div key={i} className="px-5 py-3 flex items-start gap-3 hover:bg-slate-50">
                      <Badge variant={
                        activity.type === 'REPORT' ? 'warning' :
                        activity.type === 'ANOMALY' ? 'danger' :
                        activity.type === 'VERIFICATION' ? 'info' : 'neutral'
                      }>
                        {activity.type}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700">{activity.description}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(activity.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right Column - Quick Links & Stats */}
        <div className="space-y-6">
          {/* Quick Links */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Quick Access</h2>
            </CardHeader>
            <CardBody className="p-3">
              <div className="grid grid-cols-2 gap-2">
                {quickLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <div className="flex flex-col items-center p-3 rounded-lg hover:bg-slate-50 transition-colors text-center">
                      <div className="w-10 h-10 rounded-lg bg-vojas-50 flex items-center justify-center mb-2">
                        <link.icon className="h-5 w-5 text-vojas-600" />
                      </div>
                      <p className="text-sm font-medium text-slate-900">{link.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{link.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Citizen Engagement */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Citizen Engagement
              </h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div>
                    <p className="text-xs text-purple-600 font-medium">Active Signals</p>
                    <p className="text-xl font-bold text-purple-700">24</p>
                  </div>
                  <Link href="/mp/signals">
                    <Button variant="secondary" size="sm">View All</Button>
                  </Link>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <div>
                    <p className="text-xs text-amber-600 font-medium">Pending Review</p>
                    <p className="text-xl font-bold text-amber-700">7</p>
                  </div>
                  <Link href="/mp/signals">
                    <Button variant="secondary" size="sm">Review</Button>
                  </Link>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Development Demand Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Target className="h-5 w-5 text-red-600" />
                  Top Demands
                </h2>
                <Link href="/mp/demand">
                  <Button variant="ghost" size="sm">All</Button>
                </Link>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <div className="divide-y divide-slate-100">
                {[
                  { sector: 'Roads', demand: '12 requests', intensity: 'HIGH' },
                  { sector: 'Water Supply', demand: '8 requests', intensity: 'HIGH' },
                  { sector: 'Healthcare', demand: '6 requests', intensity: 'MEDIUM' },
                  { sector: 'Education', demand: '5 requests', intensity: 'MEDIUM' },
                ].map((item, i) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.sector}</p>
                      <p className="text-xs text-slate-500">{item.demand}</p>
                    </div>
                    <Badge variant={item.intensity === 'HIGH' ? 'danger' : 'warning'}>
                      {item.intensity}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
