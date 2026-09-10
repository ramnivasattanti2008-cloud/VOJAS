'use client';

import { Card, CardBody } from '@/components/ui/Card';
import { Database, Camera, BarChart3, Brain, ShieldCheck, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EvidenceChainProps {
  hasBaseline: boolean;
  hasLatest: boolean;
  analysisCount: number;
  findingCount?: number;
  verificationCount?: number;
}

const STEPS = [
  { key: 'source', label: 'Source', icon: Database, hint: 'Sentinel-2 L2A' },
  { key: 'observation', label: 'Observation', icon: Camera, hint: 'Real CDSE scenes' },
  { key: 'analysis', label: 'Analysis', icon: BarChart3, hint: 'Pairwise change' },
  { key: 'finding', label: 'AI Finding', icon: Brain, hint: 'Assessment' },
  { key: 'verification', label: 'Verification', icon: ShieldCheck, hint: 'Officer sign-off' },
] as const;

export function EvidenceChain({ hasBaseline, hasLatest, analysisCount, findingCount = 0, verificationCount = 0 }: EvidenceChainProps) {
  const steps = [
    { ...STEPS[0], active: hasBaseline || hasLatest },
    { ...STEPS[1], active: hasBaseline && hasLatest },
    { ...STEPS[2], active: analysisCount > 0 },
    { ...STEPS[3], active: findingCount > 0 || analysisCount > 0 },
    { ...STEPS[4], active: verificationCount > 0 },
  ];

  return (
    <Card>
      <CardBody>
        <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-4">Evidence Chain</div>

        <ol className="space-y-3" role="list">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={step.key} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors',
                    step.active
                      ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-100'
                      : 'bg-slate-100 text-slate-400',
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {i < steps.length - 1 && (
                    <div className={cn(
                      'w-px h-4 mt-1',
                      step.active ? 'bg-blue-200' : 'bg-slate-200',
                    )} />
                  )}
                </div>
                <div className="flex-1 pt-1.5">
                  <div className={cn(
                    'text-sm font-semibold',
                    step.active ? 'text-slate-900' : 'text-slate-400',
                  )}>
                    {step.label}
                  </div>
                  <div className={cn(
                    'text-xs mt-0.5',
                    step.active ? 'text-slate-500' : 'text-slate-400',
                  )}>
                    {step.active ? step.hint : 'Awaiting prior step'}
                  </div>
                </div>
                {step.active && i < steps.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-slate-300 mt-2.5" />
                )}
              </li>
            );
          })}
        </ol>
      </CardBody>
    </Card>
  );
}
