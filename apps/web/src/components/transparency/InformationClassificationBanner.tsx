'use client';

import { Shield, CheckCircle2, BotMessageSquare, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface InfoType {
  type: 'SOURCE_DATA' | 'HUMAN_VERIFIED' | 'AI_INTERPRETED' | 'CITIZEN_REPORTED';
}

export function InformationClassificationBanner({
  types,
  className,
}: {
  types?: InfoType['type'][];
  className?: string;
}) {
  const defaults: InfoType['type'][] = ['SOURCE_DATA', 'HUMAN_VERIFIED', 'AI_INTERPRETED', 'CITIZEN_REPORTED'];
  const items = types ?? defaults;

  const config: Record<InfoType['type'], { label: string; variant: 'info' | 'success' | 'warning' | 'neutral'; icon: React.ReactNode; description: string }> = {
    SOURCE_DATA: {
      label: 'SOURCE DATA',
      variant: 'info',
      icon: <CheckCircle2 className="h-3 w-3" />,
      description: 'Official government data',
    },
    HUMAN_VERIFIED: {
      label: 'HUMAN-VERIFIED',
      variant: 'success',
      icon: <Shield className="h-3 w-3" />,
      description: 'Verified by authorized officials',
    },
    AI_INTERPRETED: {
      label: 'AI-INTERPRETED',
      variant: 'warning',
      icon: <BotMessageSquare className="h-3 w-3" />,
      description: 'Satellite imagery & AI analysis',
    },
    CITIZEN_REPORTED: {
      label: 'CITIZEN-REPORTED',
      variant: 'neutral',
      icon: <Users className="h-3 w-3" />,
      description: 'Community-submitted information',
    },
  };

  return (
    <div className={`rounded-lg border border-slate-200 bg-slate-50 p-4 ${className}`}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Information Classification
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((type) => {
          const { label, variant, icon } = config[type];
          return (
            <Badge key={type} variant={variant} className="flex items-center gap-1.5 font-medium">
              {icon}
              {label}
            </Badge>
          );
        })}
      </div>
      <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
        Information on this page comes from multiple sources. Not all data is independently verified.
        AI-interpreted information is derived from satellite imagery analysis.
      </p>
    </div>
  );
}
