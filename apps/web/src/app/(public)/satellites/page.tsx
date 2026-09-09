import type { Metadata } from 'next';
import Link from 'next/link';
import { Satellite, ShieldCheck, Eye, Layers, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Satellite Change Detection Engine | VOJAS',
  description: 'Sentinel-2 L2A optical imagery change detection engine for physical observation of MPLAD projects.',
};

export default function SatellitesPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold uppercase tracking-wider mb-2">
          <Satellite className="w-3.5 h-3.5" /> Earth Observation Infrastructure
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Satellite Evidence &amp; Physical Change Engine
        </h1>
        <p className="text-sm text-slate-600 mt-2 max-w-3xl leading-relaxed">
          VOJAS integrates Copernicus Sentinel-2 L2A optical band satellite data via Copernicus Data Space Ecosystem (CDSE) and Google Earth Engine. It enables physical ground observation to verify whether reported progress matches physical reality.
        </p>
      </div>

      {/* Satellite Pipeline Capabilities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-slate-200/80">
          <CardBody className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Multispectral Band Analysis</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Computes NDVI (Vegetation Index), NDBI (Built-up Index), and BSI (Bare Soil Index) across 10m resolution Sentinel-2 bands to detect physical earthwork and construction progress.
            </p>
          </CardBody>
        </Card>

        <Card className="border-slate-200/80">
          <CardBody className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Eye className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Temporal Timeline Comparison</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Compares pre-sanction baseline observations against post-sanction satellite passes over a project&apos;s geocoded coordinates.
            </p>
          </CardBody>
        </Card>

        <Card className="border-slate-200/80">
          <CardBody className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Truthful Fallback Boundaries</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              If cloud cover exceeds thresholds, optical bands are missing, or coordinates are unmapped, VOJAS explicitly reports <span className="font-semibold text-slate-800">INSUFFICIENT_IMAGE_QUALITY</span> instead of guessing.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Observation Standards & Constraints */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-slate-900">Observation Protocols &amp; Anti-Fabrication Principles</h2>
        </CardHeader>
        <CardBody className="space-y-4 text-xs text-slate-600">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">AI Interpretation vs. Ground Truth</p>
              <p className="text-slate-500 mt-0.5 leading-relaxed">
                Satellite change scores are evidence signals generated for human review. They serve as audit indicators, not legal proof of fraud or completion.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">Resolution Limits</p>
              <p className="text-slate-500 mt-0.5 leading-relaxed">
                Sentinel-2 optical bands operate at 10m spatial resolution. Small indoor renovations or equipment purchases cannot be detected by optical satellite imagery and are classified accordingly.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">No Synthesized Imagery</p>
              <p className="text-slate-500 mt-0.5 leading-relaxed">
                When real Sentinel-2 tiles are missing or obscured by monsoon cloud cover, VOJAS never outputs synthetic pixels or invented indices.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Call to Action */}
      <div className="bg-slate-900 text-white rounded-2xl p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-md border border-slate-800">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white">Inspect Geocoded Projects</h3>
          <p className="text-xs text-slate-300">Browse projects with verified coordinates and inspect their satellite observations.</p>
        </div>
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-900 bg-white rounded-xl hover:bg-slate-100 transition-colors shrink-0"
        >
          Explore Mapped Projects
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
