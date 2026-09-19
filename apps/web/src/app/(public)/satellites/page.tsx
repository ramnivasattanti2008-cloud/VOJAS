import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ArrowRight, CheckCircle2, Compass, Eye, Layers, Navigation, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'ISRO NavIC & Satellite Earth Observation Engine | VOJAS',
  description: 'Indigenous ISRO NavIC satellite positioning and Sentinel-2 / Bhuvan optical change detection engine for physical observation of MPLAD projects.',
};

export default function SatellitesPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold uppercase tracking-wider mb-2">
          <Navigation className="w-3.5 h-3.5 text-orange-600" />
          <span>ISRO NavIC &amp; Earth Observation Telemetry</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Indigenous Satellite Geotagging &amp; Physical Change Engine
        </h1>
        <p className="text-sm text-slate-600 mt-2 max-w-3xl leading-relaxed">
          VOJAS combines India&apos;s indigenous <strong className="text-slate-800 font-semibold">ISRO NavIC (Navigation with Indian Constellation / IRNSS)</strong> sovereign positioning system with <strong className="text-slate-800 font-semibold">ISRO Bhuvan Geoportal</strong> and Copernicus Sentinel-2 L2A optical bands. This delivers sub-meter anti-spoofing infrastructure geotagging and multi-spectral surface change verification across India.
        </p>
      </div>

      {/* NavIC & Satellite Pipeline Capabilities */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-orange-200/80 bg-linear-to-b from-white to-orange-50/20">
          <CardBody className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <Compass className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">ISRO NavIC Geotagging</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Utilizes India&apos;s 7-satellite regional constellation (3 GEO + 4 GSO) on L5 and S bands for sovereign, tamper-resistant coordinate verification and geo-fencing.
            </p>
          </CardBody>
        </Card>

        <Card className="border-purple-200/80">
          <CardBody className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Multispectral Band Analysis</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Computes NDVI (Vegetation Index), NDBI (Built-up Index), and BSI (Bare Soil Index) at 10m resolution to detect physical earthwork and structural progress.
            </p>
          </CardBody>
        </Card>

        <Card className="border-blue-200/80">
          <CardBody className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Eye className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Temporal Timeline Passes</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Compares pre-sanction baseline passes against weekly post-sanction satellite passes over verified NavIC coordinates to monitor physical execution.
            </p>
          </CardBody>
        </Card>

        <Card className="border-emerald-200/80">
          <CardBody className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Truthful Fallback States</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              If cloud cover exceeds thresholds or coordinates are unmapped, VOJAS explicitly reports <span className="font-semibold text-slate-800">INSUFFICIENT_IMAGE_QUALITY</span> instead of guessing.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* NavIC Sovereign Standards & Constraints */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-slate-900">Indigenous NavIC Protocols &amp; Anti-Fabrication Principles</h2>
        </CardHeader>
        <CardBody className="space-y-4 text-xs text-slate-600">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">ISRO NavIC Anti-Spoofing Sovereign Geotagging</p>
              <p className="text-slate-500 mt-0.5 leading-relaxed">
                NavIC (IRNSS) delivers sovereign positioning accuracy within the Indian territory and up to 1,500 km beyond. Asset geotags recorded via NavIC are resilient against civilian GPS spoofing, ensuring field inspection coordinates match actual worksites.
              </p>
            </div>
          </div>

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
              <p className="font-semibold text-slate-800">Resolution Limits &amp; ISRO Bhuvan Integration</p>
              <p className="text-slate-500 mt-0.5 leading-relaxed">
                Optical satellite bands operate at 10m spatial resolution. Small indoor renovations or interior equipment purchases cannot be detected by optical satellite imagery and are classified accordingly.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">Zero Synthesized Pixels</p>
              <p className="text-slate-500 mt-0.5 leading-relaxed">
                When satellite tiles are missing or obscured by dense monsoon cloud cover, VOJAS never outputs synthetic pixels or invented spectral indices.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Call to Action */}
      <div className="bg-slate-900 text-white rounded-2xl p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-md border border-slate-800">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white">Inspect Geocoded Projects</h3>
          <p className="text-xs text-slate-300">Browse projects with verified coordinates and inspect their NavIC and satellite observations.</p>
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
