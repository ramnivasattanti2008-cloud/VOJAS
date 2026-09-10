'use client';

import Link from 'next/link';
import { Shield, ShieldAlert, Lock, PlusCircle } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { PublicProjectDetail } from '@vojas/api-client';

interface CitizenReportsSectionProps {
  project: PublicProjectDetail;
  publicReports?: any[];
}

export function CitizenReportsSection({ project, publicReports = [] }: CitizenReportsSectionProps) {
  const reportCount = project.reportCount ?? 0;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            <h3 className="text-base font-bold text-white tracking-tight">Citizen Ground Intelligence</h3>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Community-driven accountability reports, physical verification findings, and whistleblower alerts.
          </p>
        </div>

        <Link href={`/report?projectId=${project.id}`}>
          <Button variant="primary" size="sm" className="bg-blue-600 hover:bg-blue-700 font-bold">
            <PlusCircle className="h-4 w-4 mr-1.5" />
            Submit Ground Report
          </Button>
        </Link>
      </div>

      {/* 2. Overview Card */}
      <Card>
        <CardBody className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-3xl font-black text-slate-900">{reportCount}</span>
              <p className="text-sm font-semibold text-slate-700 mt-1">
                {reportCount === 1 ? 'Citizen Report Submitted' : 'Citizen Reports Submitted'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Community members who inspected the site at {project.district || 'the project location'}, {project.state}.
              </p>
            </div>

            <Link href={`/report?projectId=${project.id}`}>
              <Button variant="secondary" size="sm">
                Report an Issue on this Project
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>

      {/* 3. Report Lifecycle & Reward Policy */}
      <Card className="border-blue-200 bg-blue-50/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Verification Lifecycle &amp; Reward Policy
            </h4>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 gap-1 overflow-x-auto py-1">
            <span className="px-2.5 py-1 rounded bg-blue-100 text-blue-800 shrink-0 font-bold">1. SUBMITTED</span>
            <span className="text-slate-400">→</span>
            <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 shrink-0">2. SCREENING</span>
            <span className="text-slate-400">→</span>
            <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 shrink-0">3. UNDER REVIEW</span>
            <span className="text-slate-400">→</span>
            <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 shrink-0">4. VERIFIED</span>
            <span className="text-slate-400">→</span>
            <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0 font-bold">
              5. REWARD ELIGIBLE
            </span>
          </div>

          <div className="p-3 bg-white rounded-lg border border-blue-200 text-xs text-slate-700 space-y-1">
            <p className="font-semibold text-blue-950">Important Accountability Policy:</p>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Reward eligibility is determined only after your report is independently verified by field officers or satellite evidence. Submitting a report does not guarantee a reward.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            <span>Reporter identities and personal contact details are never disclosed publicly.</span>
          </div>
        </CardBody>
      </Card>

      {/* 4. Public Reports Stream if any */}
      {publicReports.length > 0 ? (
        <Card>
          <CardHeader>
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Verified Public Reports ({publicReports.length})
            </h4>
          </CardHeader>
          <CardBody className="space-y-3">
            {publicReports.map((rep) => (
              <div key={rep.id} className="p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{rep.category.replace(/_/g, ' ')}</span>
                  <Badge variant="success" size="sm">{rep.status}</Badge>
                </div>
                <p className="text-slate-600">{rep.title}</p>
                <p className="text-[10px] text-slate-400">Reference: {rep.reportReference}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      ) : (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
          No public reports have completed verification yet for this project. If you have on-the-ground photos or evidence, consider filing a report.
        </div>
      )}
    </div>
  );
}
