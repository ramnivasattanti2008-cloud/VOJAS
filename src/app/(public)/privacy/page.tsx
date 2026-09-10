import type { Metadata } from 'next';
import { Card, CardBody } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Privacy Policy | VOJAS',
  description: 'How VOJAS handles reporter identity and citizen data.',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Privacy Policy</h1>
      </div>

      <Card>
        <CardBody className="space-y-4 text-sm text-slate-600 leading-relaxed">
          <p>
            You can browse project data on VOJAS without creating an account or providing any
            personal information.
          </p>
          <p>
            <strong className="text-slate-800">Reporting a concern:</strong> you may submit a
            report anonymously. If you choose to include contact details, they are used only to
            follow up on your report and are not published or shared publicly. Report content
            shown in a project&apos;s public transparency view is aggregated (counts and status
            only) — individual report details are not disclosed publicly, to protect reporters.
          </p>
          <p>
            <strong className="text-slate-800">Signed-in accounts:</strong> officers, MPs,
            contractors, and administrators sign in with credentials to access role-specific
            tools. That access is governed separately from the public browsing experience
            described here.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
