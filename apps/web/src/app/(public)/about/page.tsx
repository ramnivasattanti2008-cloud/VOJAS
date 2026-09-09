import type { Metadata } from 'next';
import { Card, CardBody } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'About | VOJAS',
  description: 'What VOJAS is, what it tracks, and how it handles data honestly.',
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">About VOJAS</h1>
        <p className="mt-2 text-sm text-slate-500">MPLAD Accountability Platform</p>
      </div>

      <Card>
        <CardBody className="space-y-4 text-sm text-slate-600 leading-relaxed">
          <p>
            VOJAS tracks projects funded under the MPLAD scheme (Members of Parliament Local Area
            Development), which gives each Member of Parliament funds to sanction development
            works in their constituency. The platform brings project records, spending, satellite
            evidence, and citizen reports into one place so the public can see how that money is
            used.
          </p>
          <p>
            <strong className="text-slate-800">Our data-honesty rule:</strong> VOJAS never invents
            figures — financial amounts, progress percentages, coordinates, satellite readings, or
            audit history — to fill in a gap. When a value is not available, not yet verified, or a
            data source (such as satellite imagery) is not configured, the platform says so
            explicitly rather than guessing.
          </p>
          <p>
            AI-assisted risk findings on a project page are signals meant to prompt human review.
            They are never presented as proof of fraud or wrongdoing, and every finding links back
            to the evidence it is based on.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
