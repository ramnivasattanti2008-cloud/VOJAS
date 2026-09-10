import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Contact | VOJAS',
  description: 'How to reach VOJAS about a project or a report.',
};

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Contact</h1>
      </div>

      <Card>
        <CardBody className="space-y-4 text-sm text-slate-600 leading-relaxed">
          <p>
            To flag a specific concern about an MPLAD project — a delay, a quality issue, a
            location mismatch, or anything else — use the report form. It reaches the review
            queue directly and can be submitted anonymously.
          </p>
          <Link
            href="/report"
            className="inline-block px-4 py-2 text-sm font-medium text-white bg-vojas-600 rounded-lg hover:bg-vojas-700 transition-colors"
          >
            Submit a Report
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
