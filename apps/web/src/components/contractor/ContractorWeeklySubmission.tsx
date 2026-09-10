'use client';

import React, { useState } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  ShieldAlert,
  Satellite,
  Clock,
  Loader2,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { WeeklySatelliteGallery, type WeeklyTimelinePoint } from '@/components/satellite/WeeklySatelliteGallery';

interface VerificationReport {
  projectId: string;
  projectName: string;
  approvedAmount: number;
  spentAmount: number;
  fraudRiskScore: number;
  overallVerdict: string;
  aiExecutiveSummary: string;
  recommendedOfficerActions: string[];
  weeklyTimeline: WeeklyTimelinePoint[];
}

interface VerificationResult {
  submission: {
    id: string;
    title: string;
    description: string;
    amount: number;
    createdAt: string;
  };
  verificationReport: VerificationReport;
}

export function ContractorWeeklySubmission() {
  const [selectedProjectId, setSelectedProjectId] = useState('showcase-fraud-1');
  const [progressPercent, setProgressPercent] = useState<number>(80);
  const [amountSpentLakhs, setAmountSpentLakhs] = useState<number>(38.5);
  const [notes, setNotes] = useState(
    'Finished structural roofing columns and electrical pre-wiring. Requesting next tranche approval.'
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sampleProjects = [
    {
      id: 'showcase-fraud-1',
      name: 'Ghost Construction: Community Center (Bhubaneswar)',
      claimedProgress: 80,
      sanctionedLakhs: 48.5,
      contractor: 'Apex Infra Projects Pvt Ltd',
      type: 'Ghost / High Risk Demo',
    },
    {
      id: 'showcase-ong-1',
      name: 'Ongoing: Primary Health Center Extension (Khurda)',
      claimedProgress: 45,
      sanctionedLakhs: 52.0,
      contractor: 'Kalinga Civil Works Ltd',
      type: 'Real Progress Ongoing',
    },
    {
      id: 'showcase-fin-1',
      name: 'Finished: High School Science Laboratory (Bhubaneswar)',
      claimedProgress: 100,
      sanctionedLakhs: 45.0,
      contractor: 'Utkal Builders & Engineers',
      type: 'Fully Completed Work',
    },
    {
      id: 'showcase-fraud-2',
      name: 'Ghost Construction: Rural Skill Development Hub (Diamond Harbour)',
      claimedProgress: 75,
      sanctionedLakhs: 65.0,
      contractor: 'Bengal Techno Construction',
      type: 'Ghost / High Risk Demo',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiBase}/api/v1/showcase/contractor/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          percentDone: Number(progressPercent),
          percentLeft: Math.max(0, 100 - Number(progressPercent)),
          amountSpent: Number(amountSpentLakhs) * 100000,
          milestoneNotes: notes,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const json = await response.json();
      if (json.success && json.data) {
        setResult(json.data);
      } else {
        throw new Error(json.error || 'Failed verification');
      }
    } catch (err: any) {
      console.error('Failed to submit contractor report:', err);
      setError('Could not run automated satellite cross-check. Please verify API connection.');
    } finally {
      setLoading(false);
    }
  };

  const percentLeft = Math.max(0, 100 - progressPercent);

  return (
    <div className="space-y-6">
      <Card className="border-vojas-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-900 to-vojas-950 text-white rounded-t-xl py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Satellite className="h-5 w-5 text-vojas-400" />
                <h3 className="font-bold text-lg text-white">
                  Contractor Weekly Work & Fund Utilization Filing
                </h3>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Automated Sentinel-2 Satellite Cross-Verification Engine (Physical NDBI vs. Claimed Milestones)
              </p>
            </div>
            <Badge variant="neutral" className="bg-vojas-900 text-vojas-200 border-vojas-700 self-start sm:self-auto">
              Govt Vigilance Protocol Active
            </Badge>
          </div>
        </CardHeader>

        <CardBody className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Select Project For Weekly Filing
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sampleProjects.map((p) => {
                  const isSelected = selectedProjectId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedProjectId(p.id);
                        setProgressPercent(p.claimedProgress);
                      }}
                      className={`p-3.5 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-vojas-600 bg-vojas-50/70 ring-2 ring-vojas-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-900 line-clamp-1">{p.name}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            p.type.includes('Ghost')
                              ? 'bg-red-100 text-red-700'
                              : p.type.includes('Ongoing')
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {p.type}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                        <span>Contractor: {p.contractor}</span>
                        <span className="font-semibold text-slate-700">₹{p.sanctionedLakhs}L</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Metrics: % Done, % Left, Amount Spent */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Work Status (% Done)
                </label>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progressPercent}
                    onChange={(e) => setProgressPercent(Number(e.target.value))}
                    className="w-full accent-vojas-600"
                  />
                  <span className="text-xl font-black text-vojas-700 w-12 text-right">
                    {progressPercent}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Contractor claimed completion</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Work Remaining (% Left)
                </label>
                <div className="mt-2 text-2xl font-black text-slate-700">
                  {percentLeft}%
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Calculated milestone gap</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Funds Utilized (₹ in Lakhs)
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={amountSpentLakhs}
                    onChange={(e) => setAmountSpentLakhs(Number(e.target.value))}
                    className="w-full text-lg font-bold text-slate-900 border border-slate-300 rounded px-2.5 py-1 focus:outline-none focus:border-vojas-600"
                  />
                  <span className="text-xs text-slate-600 font-semibold">Lakhs</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Cumulative invoices submitted</p>
              </div>
            </div>

            {/* Milestone Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Weekly Construction Milestone Report & Material Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe foundation, superstructure, roofing, plastering, or procurement milestones achieved this week..."
                className="w-full text-sm border border-slate-300 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-vojas-600 focus:ring-1 focus:ring-vojas-600"
              />
            </div>

            {/* Submission Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="h-4 w-4 text-slate-400" />
                <span>Sentinel-2 satellite will capture & verify NDBI built-up indices automatically.</span>
              </div>
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2.5 bg-vojas-600 hover:bg-vojas-700 text-white font-semibold flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Querying Satellite & Analyzing Spectral Changes...
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    Submit Weekly Report & Run AI Verification
                  </>
                )}
              </Button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              {error}
            </div>
          )}

          {/* AI Satellite Verification Result Modal/Card */}
          {result && result.verificationReport && (
            <div className="mt-8 border-t-2 border-slate-200 pt-6 space-y-6">
              <div
                className={`p-5 rounded-xl border ${
                  result.verificationReport.fraudRiskScore >= 70
                    ? 'bg-red-50/90 border-red-300 text-red-950'
                    : result.verificationReport.fraudRiskScore >= 40
                    ? 'bg-orange-50/90 border-orange-300 text-orange-950'
                    : 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {result.verificationReport.fraudRiskScore >= 70 ? (
                      <ShieldAlert className="h-8 w-8 text-red-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
                    )}
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider opacity-75">
                        AI Satellite Physical Ground Truth Verdict
                      </span>
                      <h4 className="text-xl font-black">{result.verificationReport.overallVerdict}</h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-semibold opacity-75">Fraud Risk Score</div>
                      <div className="text-2xl font-black">{result.verificationReport.fraudRiskScore}/100</div>
                    </div>
                    <Badge
                      variant={result.verificationReport.fraudRiskScore >= 70 ? 'danger' : 'success'}
                      className="text-xs px-2.5 py-1 font-bold"
                    >
                      {result.verificationReport.fraudRiskScore >= 70 ? 'CRITICAL RISK' : 'VERIFIED'}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 text-sm leading-relaxed font-medium bg-white/80 p-3 rounded-lg border border-current/10">
                  {result.verificationReport.aiExecutiveSummary}
                </div>

                {result.verificationReport.recommendedOfficerActions && (
                  <div className="mt-3 text-xs font-semibold text-slate-700">
                    <strong>Vigilance Actions:</strong> {result.verificationReport.recommendedOfficerActions.join(' • ')}
                  </div>
                )}
              </div>

              {/* Weekly Satellite Image Gallery for this project */}
              <div>
                <h4 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Satellite className="h-4 w-4 text-vojas-600" />
                  Chronological Weekly Satellite Imagery (Sentinel-2 Passes)
                </h4>
                <WeeklySatelliteGallery
                  timeline={result.verificationReport.weeklyTimeline}
                  projectName={result.verificationReport.projectName}
                  approvedAmount={result.verificationReport.approvedAmount}
                  spentAmount={result.verificationReport.spentAmount}
                />
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
