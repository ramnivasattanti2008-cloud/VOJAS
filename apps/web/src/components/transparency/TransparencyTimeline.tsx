'use client';

import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export interface TimelineEvent {
  id: string;
  eventType: string;
  description: string;
  occurredAt: string;
  source?: string;
}

interface TransparencyTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

const EVENT_TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  PROPOSAL: { label: 'Proposal', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: '📋' },
  APPROVAL: { label: 'Approval', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: '✅' },
  SANCTION: { label: 'Sanctioned', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: '💰' },
  FUND_RELEASE: { label: 'Fund Release', color: 'bg-violet-50 text-violet-700 border-violet-200', icon: '🏦' },
  CONTRACTOR_ASSIGNED: { label: 'Contractor Assigned', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: '🏗️' },
  WORK_START: { label: 'Work Started', color: 'bg-teal-50 text-teal-700 border-teal-200', icon: '🚧' },
  MILESTONE: { label: 'Milestone', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: '🏁' },
  PROGRESS_REPORT: { label: 'Progress Report', color: 'bg-sky-50 text-sky-700 border-sky-200', icon: '📊' },
  SATELLITE_OBSERVATION: { label: 'Satellite Observation', color: 'bg-green-50 text-green-700 border-green-200', icon: '🛰️' },
  CITIZEN_REPORT: { label: 'Citizen Report', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: '👥' },
  FIELD_INSPECTION: { label: 'Field Inspection', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: '🔍' },
  AI_ALERT: { label: 'AI Alert', color: 'bg-pink-50 text-pink-700 border-pink-200', icon: '🤖' },
  VERIFICATION: { label: 'Verification', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: '🛡️' },
  COMPLETION: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '🎉' },
  ABANDONMENT: { label: 'Abandoned', color: 'bg-red-50 text-red-700 border-red-200', icon: '⚠️' },
};

function getEventInfo(eventType: string) {
  return EVENT_TYPE_LABELS[eventType] ?? {
    label: eventType.replace(/_/g, ' '),
    color: 'bg-slate-50 text-slate-600 border-slate-200',
    icon: '📌',
  };
}

function formatEventDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function TransparencyTimeline({ events, className }: TransparencyTimelineProps) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );

  if (events.length === 0) {
    return (
      <Card className={className}>
        <CardBody>
          <div className="text-center py-8 text-slate-400 text-sm">
            No public timeline events available for this project.
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Public Accountability Timeline</h2>
          <span className="text-xs text-slate-400">{events.length} events</span>
        </div>
      </CardHeader>
      <CardBody>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200" />

          <div className="space-y-4">
            {sorted.map((event, idx) => {
              const info = getEventInfo(event.eventType);
              const isLast = idx === sorted.length - 1;

              return (
                <div key={event.id} className="relative flex gap-4 pl-10">
                  {/* Dot */}
                  <div
                    className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white shadow-sm ${isLast ? 'bg-vojas-500' : 'bg-slate-300'}`}
                    style={{ top: '6px' }}
                  />

                  <div className="flex-1 pb-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={
                            isLast
                              ? 'primary'
                              : event.eventType === 'COMPLETION'
                              ? 'success'
                              : event.eventType === 'SATELLITE_OBSERVATION'
                              ? 'success'
                              : 'neutral'
                          }
                          className="text-xs"
                        >
                          <span className="mr-1">{info.icon}</span>
                          {info.label}
                        </Badge>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0 tabular-nums">
                        {formatEventDate(event.occurredAt)}
                      </span>
                    </div>

                    <p className="text-sm text-slate-700 leading-relaxed">{event.description}</p>

                    {event.source && (
                      <p className="text-xs text-slate-400 mt-1">
                        Source: {event.source}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
