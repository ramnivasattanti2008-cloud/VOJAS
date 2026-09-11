import React, { useState } from 'react';
import { KpiStrip } from './KpiStrip';
import { IntelligenceFeed, FeedEventItem } from './IntelligenceFeed';
import { AiSituationBrief } from './AiSituationBrief';
import { InteractiveGisMap } from '../map/InteractiveGisMap';
import { ViewType } from '../layout/TacticalSidebar';

interface CommandCenterDashboardProps {
  onNavigate: (view: ViewType, id?: string) => void;
}

export const CommandCenterDashboard: React.FC<CommandCenterDashboardProps> = ({ onNavigate }) => {
  const [selectedFeedEvent, setSelectedFeedEvent] = useState<FeedEventItem | null>(null);

  const handleFeedEventSelect = (event: FeedEventItem) => {
    setSelectedFeedEvent(event);
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col p-3 sm:p-4 gap-3 overflow-hidden bg-tactical-950">
      
      {/* Top KPI Metrics Strip */}
      <div className="shrink-0">
        <KpiStrip onSelectKpi={(view) => onNavigate(view)} />
      </div>

      {/* Main Asymmetric Tri-Pane Command Center Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
        
        {/* Left Column: Real-Time Intelligence Feed (3 cols) */}
        <div className="lg:col-span-3 h-full min-h-[220px] lg:min-h-0 overflow-hidden">
          <IntelligenceFeed
            onSelectEvent={handleFeedEventSelect}
            selectedEventId={selectedFeedEvent?.id}
          />
        </div>

        {/* Center Column: Live Geospatial Intelligence Map (6 cols) */}
        <div className="lg:col-span-6 h-full min-h-[350px] lg:min-h-0 overflow-hidden rounded-xl">
          <InteractiveGisMap
            onNavigate={onNavigate}
            heightClass="h-full"
            showInspector={true}
          />
        </div>

        {/* Right Column: AI Situation Brief (3 cols) */}
        <div className="lg:col-span-3 h-full min-h-[260px] lg:min-h-0 overflow-hidden">
          <AiSituationBrief
            onInvestigate={(caseId) => onNavigate('investigations', caseId)}
            onCompare={() => onNavigate('compare')}
          />
        </div>

      </div>

    </div>
  );
};
