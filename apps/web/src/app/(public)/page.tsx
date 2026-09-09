import Link from 'next/link';
import { Search, Map, ShieldCheck, Satellite, FileWarning, ArrowRight } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="pt-8 pb-4 text-center max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Track where MPLAD funds actually go
        </h1>
        <p className="mt-4 text-base text-slate-600 leading-relaxed">
          VOJAS is a civic accountability platform for the MPLAD scheme — Members of Parliament
          Local Area Development funds. Search real, government-sourced projects by state,
          district, sector, and status, see what has been sanctioned and spent, and report what
          you observe on the ground.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-vojas-600 rounded-lg hover:bg-vojas-700 transition-colors"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Explore Projects
          </Link>
          <Link
            href="/explore/map"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Map className="h-4 w-4" aria-hidden="true" />
            View Map
          </Link>
        </div>
      </section>

      {/* What VOJAS tracks */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">What VOJAS tracks</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardBody className="space-y-2">
              <Search className="h-5 w-5 text-vojas-600" aria-hidden="true" />
              <h3 className="font-semibold text-slate-800 text-sm">Project records</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Sanctioned amount, spending, sector, location, and status for MPLAD projects
                sourced from official government data.
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-2">
              <Satellite className="h-5 w-5 text-vojas-600" aria-hidden="true" />
              <h3 className="font-semibold text-slate-800 text-sm">Satellite evidence</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Where usable Sentinel-2 satellite imagery is available, VOJAS compares
                reported progress against what is physically observable. When imagery is
                unavailable, that is stated plainly — never guessed.
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-2">
              <FileWarning className="h-5 w-5 text-vojas-600" aria-hidden="true" />
              <h3 className="font-semibold text-slate-800 text-sm">Citizen reports &amp; risk signals</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Anyone can report a concern about a project. AI-assisted risk signals flag
                discrepancies for human review — they are never presented as proof of
                wrongdoing.
              </p>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* Why it matters */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-vojas-50 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5 text-vojas-600" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Why this matters</h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-2xl">
              MPLAD funds are public money spent in your constituency. VOJAS does not fabricate
              figures to fill gaps — where data is missing, unverified, or a source is
              unavailable, the platform says so explicitly instead of guessing. The goal is an
              honest, source-attributed record that both citizens and officials can trust.
            </p>
          </div>
        </div>
      </section>

      {/* What a citizen can do */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">What you can do</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/explore"
            className="group flex items-center justify-between p-5 bg-white border border-slate-200 rounded-xl hover:border-vojas-300 hover:shadow-sm transition-all"
          >
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Search &amp; browse projects</h3>
              <p className="text-sm text-slate-500 mt-1">
                Filter by state, district, sector, and status to find projects near you.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-vojas-600 shrink-0 ml-3" aria-hidden="true" />
          </Link>
          <Link
            href="/report"
            className="group flex items-center justify-between p-5 bg-white border border-slate-200 rounded-xl hover:border-vojas-300 hover:shadow-sm transition-all"
          >
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Report a concern</h3>
              <p className="text-sm text-slate-500 mt-1">
                Submit a report about a project — anonymously if you choose.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-vojas-600 shrink-0 ml-3" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
