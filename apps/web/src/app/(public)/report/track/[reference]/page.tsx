'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Search, CheckCircle, Clock, AlertCircle, FileText, MapPin, Calendar } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useTrackReport, useTrackReportStatus } from '@/hooks/useCitizenReports';
import { REPORT_STATUS_LABELS, REPORT_CATEGORY_LABELS } from '@vojas/api-client';
import { formatDate, formatDateTime } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  SUBMITTED: 'info',
  RECEIVED: 'info',
  TRIAGED: 'info',
  PROJECT_MATCHED: 'info',
  REVIEW_QUEUE: 'warning',
  UNDER_VERIFICATION: 'warning',
  VERIFIED: 'success',
  RESOLVED: 'success',
  DISMISSED: 'neutral',
  ESCALATED: 'danger',
};

const TRIAGE_STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  CATEGORY_SUGGESTED: 'info',
  PROJECT_MATCHED: 'info',
  CLAIMS_EXTRACTED: 'info',
  DUPLICATES_CHECKED: 'info',
  COMPLETED: 'success',
  FAILED: 'danger',
};

export default function TrackReportPage() {
  const params = useParams();
  const referenceFromUrl = params?.reference as string | undefined;
  const [inputReference, setInputReference] = useState(referenceFromUrl || '');
  const [searchReference, setSearchReference] = useState(referenceFromUrl || '');

  const { data: report, isLoading, error } = useTrackReport(searchReference || null);
  const { data: status } = useTrackReportStatus(searchReference || null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchReference(inputReference.trim().toUpperCase());
  };

  const displayReport = report;
  const displayStatus = status || (displayReport ? { status: displayReport.status, triageStatus: displayReport.triageStatus, updatedAt: displayReport.updatedAt } : null);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">Track Your Report</h1>
        <p className="text-slate-600 mt-2">
          Enter your reference number to check the status of your report.
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardBody>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Enter reference (e.g., VOJAS-XXXX-XXXX)"
                value={inputReference}
                onChange={(e) => setInputReference(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-vojas-200 focus:border-vojas-500"
              />
            </div>
            <Button type="submit" isLoading={isLoading}>
              Track
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Loading */}
      {isLoading && (
        <Card>
          <CardBody className="py-12 text-center">
            <div className="w-8 h-8 mx-auto mb-3 border-2 border-vojas-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-600">Looking up your report...</p>
          </CardBody>
        </Card>
      )}

      {/* Error */}
      {error && !isLoading && (
        <Card className="border-red-200 bg-red-50">
          <CardBody className="text-center py-8">
            <AlertCircle className="h-10 w-10 mx-auto mb-3 text-red-500" />
            <h2 className="text-lg font-semibold text-red-800 mb-2">Report Not Found</h2>
            <p className="text-sm text-red-700 mb-4">
              We couldn&apos;t find a report with that reference number. Please check:
            </p>
            <ul className="text-sm text-red-700 text-left max-w-xs mx-auto space-y-1">
              <li>• The reference number is correct (check your confirmation email)</li>
              <li>• You haven&apos;t made any typos</li>
              <li>• The reference includes all parts (e.g., VOJAS-ABCD-1234)</li>
            </ul>
            <div className="mt-6">
              <Link href="/report">
                <Button variant="secondary">Submit a New Report</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Report Found */}
      {displayReport && !isLoading && (
        <div className="space-y-4">
          {/* Reference & Status */}
          <Card>
            <CardBody className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-vojas-50 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-vojas-600" />
              </div>
              <p className="text-sm text-slate-500 mb-1">Report Reference</p>
              <p className="text-2xl font-mono font-bold text-vojas-600 mb-4">
                {displayReport.reportReference}
              </p>

              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Badge variant={STATUS_VARIANT[displayReport.status] ?? 'neutral'} className="text-sm px-3 py-1">
                  {REPORT_STATUS_LABELS[displayReport.status] || displayReport.status}
                </Badge>
                {displayReport.triageStatus && (
                  <Badge variant={TRIAGE_STATUS_VARIANT[displayReport.triageStatus] ?? 'neutral'} className="text-sm px-3 py-1">
                    Triage: {displayReport.triageStatus.replace(/_/g, ' ')}
                  </Badge>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Report Details */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Report Details</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">Category</p>
                <p className="font-medium text-slate-900">
                  {REPORT_CATEGORY_LABELS[displayReport.category] || displayReport.category}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Title</p>
                <p className="font-medium text-slate-900">{displayReport.title}</p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Description</p>
                <p className="text-slate-700">{displayReport.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">Submitted</p>
                    <p className="text-sm font-medium text-slate-700">
                      {formatDateTime(displayReport.submittedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">Last Updated</p>
                    <p className="text-sm font-medium text-slate-700">
                      {formatDateTime(displayStatus?.updatedAt || displayReport.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>

              {displayReport.locationDesc && (
                <div className="flex items-start gap-2 pt-2 border-t border-slate-100">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">Location</p>
                    <p className="text-sm font-medium text-slate-700">{displayReport.locationDesc}</p>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Processing Timeline</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {/* Submitted */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="font-medium text-slate-900">Report Submitted</p>
                    <p className="text-sm text-slate-500">{formatDateTime(displayReport.submittedAt)}</p>
                  </div>
                </div>

                {/* Triage Status */}
                <div className="ml-4 border-l-2 border-slate-200 pl-4 space-y-4">
                  {['PENDING', 'PROCESSING', 'CATEGORY_SUGGESTED', 'PROJECT_MATCHED', 'CLAIMS_EXTRACTED', 'DUPLICATES_CHECKED', 'COMPLETED'].map((step, i) => {
                    const isComplete = ['PENDING', 'PROCESSING', 'CATEGORY_SUGGESTED', 'PROJECT_MATCHED', 'CLAIMS_EXTRACTED', 'DUPLICATES_CHECKED', 'COMPLETED'].indexOf(displayReport.triageStatus) >= i;
                    const isCurrent = displayReport.triageStatus === step;
                    return (
                      <div key={step} className="flex gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isComplete ? 'bg-green-100' : 'bg-slate-100'
                        }`}>
                          {isComplete ? (
                            <CheckCircle className={`h-4 w-4 ${isCurrent ? 'text-vojas-600' : 'text-green-600'}`} />
                          ) : (
                            <Clock className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 pt-1">
                          <p className={`font-medium ${isComplete ? 'text-slate-900' : 'text-slate-400'}`}>
                            {step.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Final Status */}
                {displayReport.status === 'RESOLVED' && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="font-medium text-slate-900">Report Resolved</p>
                      {displayReport.resolvedAt && (
                        <p className="text-sm text-slate-500">{formatDateTime(displayReport.resolvedAt)}</p>
                      )}
                      {displayReport.resolution && (
                        <p className="text-sm text-slate-700 mt-1">{displayReport.resolution}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Actions */}
          <div className="text-center">
            <Link href="/report">
              <Button variant="secondary">Submit Another Report</Button>
            </Link>
          </div>
        </div>
      )}

      {/* No reference entered yet */}
      {!searchReference && !isLoading && (
        <Card>
          <CardBody className="py-12 text-center">
            <FileText className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-600">Enter your reference number above to track your report.</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
