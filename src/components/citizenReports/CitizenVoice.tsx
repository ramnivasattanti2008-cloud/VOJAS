'use client';

import Link from 'next/link';
import { MessageSquare, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useReportsByProject } from '@/hooks/useCitizenReports';

interface CitizenVoiceProps {
  projectId: string;
}

export function CitizenVoice({ projectId }: CitizenVoiceProps) {
  const { data: reports, isLoading, error } = useReportsByProject(projectId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-slate-500" />
            Citizen Voice
          </h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        </CardBody>
      </Card>
    );
  }

  if (error || !reports) {
    return null; // Hide component if no reports or error
  }

  const totalReports = reports.length;
  const verifiedCount = reports.filter(
    (r) => r.status === 'VERIFIED' || r.status === 'RESOLVED'
  ).length;
  const underReviewCount = reports.filter(
    (r) => r.status === 'REVIEW_QUEUE' || r.status === 'UNDER_VERIFICATION'
  ).length;
  const pendingCount = reports.filter(
    (r) => r.status === 'SUBMITTED' || r.status === 'RECEIVED'
  ).length;

  if (totalReports === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-slate-500" />
            Citizen Voice
          </h3>
        </CardHeader>
        <CardBody className="text-center py-8">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 text-slate-400" />
          <p className="text-sm text-slate-600">No citizen reports for this project yet.</p>
          <Link href="/report" className="inline-block mt-3">
            <Button variant="secondary" size="sm">
              Submit a Report
            </Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-slate-500" />
          Citizen Voice
        </h3>
      </CardHeader>
      <CardBody className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-slate-500" />
              <span className="text-2xl font-bold text-slate-900">{totalReports}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Total Reports</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold text-green-700">{verifiedCount}</span>
            </div>
            <p className="text-xs text-green-600 mt-0.5">Verified/Resolved</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-2xl font-bold text-amber-700">{underReviewCount}</span>
            </div>
            <p className="text-xs text-amber-600 mt-0.5">Under Review</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold text-blue-700">{pendingCount}</span>
            </div>
            <p className="text-xs text-blue-600 mt-0.5">Pending</p>
          </div>
        </div>

        {/* Recent Reports Preview */}
        {reports.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Recent Reports</p>
            <div className="space-y-2">
              {reports.slice(0, 3).map((report) => (
                <div
                  key={report.id}
                  className="p-3 bg-slate-50 rounded-lg text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{report.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {report.category.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <Badge
                      variant={
                        report.status === 'RESOLVED' || report.status === 'VERIFIED'
                          ? 'success'
                          : report.status === 'REVIEW_QUEUE' || report.status === 'UNDER_VERIFICATION'
                          ? 'warning'
                          : 'info'
                      }
                      className="shrink-0"
                    >
                      {report.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View All Link */}
        <Link href={`/admin/reports?projectId=${projectId}`} className="block">
          <Button variant="secondary" size="sm" className="w-full">
            View All Reports
          </Button>
        </Link>
      </CardBody>
    </Card>
  );
}
