import { VerificationClient } from './VerificationClient';

export const metadata = {
  title: 'Verification | VOJAS',
  description: 'Verify citizen reports and submissions against MPLAD records.',
};

export default function VerificationPage() {
  return <VerificationClient />;
}
