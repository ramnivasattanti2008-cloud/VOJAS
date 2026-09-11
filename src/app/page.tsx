'use client';

import React, { useState, useEffect } from 'react';
import { TacticalHeader } from '../components/layout/TacticalHeader';
import { TacticalSidebar, ViewType } from '../components/layout/TacticalSidebar';
import { MobileNav } from '../components/layout/MobileNav';
import { CommandPalette } from '../components/layout/CommandPalette';
import { SystemStatusModal } from '../components/layout/SystemStatusModal';
import { GuidedDemoWalkthrough } from '../components/demo/GuidedDemoWalkthrough';

// Views
import { LandingView } from '../components/landing/LandingView';
import { CommandCenterDashboard } from '../components/command-center/CommandCenterDashboard';
import { InteractiveGisMap } from '../components/map/InteractiveGisMap';
import { SatelliteTimelineView } from '../components/timeline/SatelliteTimelineView';
import { SatelliteComparisonView } from '../components/compare/SatelliteComparisonView';
import { ChangeDetectionView } from '../components/change-detection/ChangeDetectionView';
import { AiRiskIntelligenceView } from '../components/risk/AiRiskIntelligenceView';
import { InfrastructureMonitoringView } from '../components/infrastructure/InfrastructureMonitoringView';
import { CitizenReportsView } from '../components/citizen-reports/CitizenReportsView';
import { AlertCenterView } from '../components/alerts/AlertCenterView';
import { InvestigationWorkspaceView } from '../components/investigation/InvestigationWorkspaceView';
import { AnalyticsView } from '../components/analytics/AnalyticsView';
import { LocationProfileView } from '../components/location/LocationProfileView';

// Data
import { SYSTEM_TELEMETRY, ALL_ALERTS, ALL_CITIZEN_REPORTS } from '../data/mockData';

export default function CivicShieldApp() {
  const [currentView, setCurrentView] = useState<ViewType>('landing');
  const [selectedEntityId, setSelectedEntityId] = useState<string | undefined>('CS-1042');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  // Guided Demo Walkthrough State
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [demoStepIndex, setDemoStepIndex] = useState(0);

  const demoStepsSequence: ViewType[] = [
    'dashboard',     // Step 1: Command Center
    'map',           // Step 2: Live GIS Map
    'timeline',      // Step 3: Satellite Timeline
    'compare',       // Step 4: Comparison Suite
    'changes',       // Step 5: Change Detection
    'risks',         // Step 6: Risk Matrix
    'investigations' // Step 7: Case CS-1042 Dossier
  ];

  // Global Keyboard Shortcuts (Ctrl+K, M, A, R, I, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing inside an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        if (e.key === 'Escape') {
          target.blur();
          setIsSearchOpen(false);
          setIsStatusOpen(false);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsStatusOpen(false);
        setIsDemoActive(false);
      } else if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setCurrentView('map');
      } else if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setCurrentView('alerts');
      } else if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setCurrentView('reports');
      } else if (e.key.toLowerCase() === 'i' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setCurrentView('investigations');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (view: ViewType, id?: string) => {
    setCurrentView(view);
    if (id) setSelectedEntityId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Guided demo controls
  const handleStartDemo = () => {
    setIsDemoActive(true);
    setDemoStepIndex(0);
    setCurrentView(demoStepsSequence[0]);
  };

  const handleDemoNext = () => {
    setDemoStepIndex(prev => {
      const nextIndex = (prev + 1) % demoStepsSequence.length;
      setCurrentView(demoStepsSequence[nextIndex]);
      return nextIndex;
    });
  };

  const handleDemoPrev = () => {
    setDemoStepIndex(prev => {
      const prevIndex = Math.max(0, prev - 1);
      setCurrentView(demoStepsSequence[prevIndex]);
      return prevIndex;
    });
  };

  const handleDemoJump = (idx: number) => {
    setDemoStepIndex(idx);
    setCurrentView(demoStepsSequence[idx]);
  };

  // View title labels for top bar breadcrumbs
  const viewTitles: Record<ViewType, string> = {
    landing: 'Civic Intelligence Overview',
    dashboard: 'Command Center',
    map: 'Live GIS Satellite Map',
    timeline: 'Satellite Timeline & History',
    compare: 'Temporal Satellite Comparison',
    changes: 'Change Detection Intelligence',
    risks: 'AI Risk Intelligence Matrix',
    infrastructure: 'Infrastructure Monitoring',
    reports: 'Citizen Grievance Portal',
    alerts: 'Operational Alert Center',
    investigations: 'Investigation Workspace CS-1042',
    analytics: 'Macro Geospatial Analytics',
    location: 'District Profile · Bengaluru'
  };

  return (
    <div className="min-h-screen bg-tactical-950 text-slate-100 flex flex-col selection:bg-intel-cyan selection:text-black">
      
      {/* Top Command Bar */}
      <TacticalHeader
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenStatus={() => setIsStatusOpen(true)}
        onTriggerDemo={handleStartDemo}
        telemetry={SYSTEM_TELEMETRY}
        activeViewTitle={viewTitles[currentView]}
      />

      {/* Main Body Split: Left Sidebar + Center Viewport */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Collapsible Left Tactical Navigation (Hidden on small mobile screens) */}
        <div className="hidden md:block shrink-0">
          <TacticalSidebar
            currentView={currentView}
            onNavigate={handleNavigate}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            alertsCount={ALL_ALERTS.filter(a => a.severity === 'CRITICAL').length}
            reportsCount={ALL_CITIZEN_REPORTS.filter(r => r.status === 'New').length}
          />
        </div>

        {/* Dynamic Center Work Area */}
        <main className="flex-1 min-w-0 overflow-y-auto pb-16 md:pb-0">
          {currentView === 'landing' && (
            <LandingView
              onNavigate={handleNavigate}
              telemetry={SYSTEM_TELEMETRY}
              onTriggerDemo={handleStartDemo}
            />
          )}

          {currentView === 'dashboard' && (
            <CommandCenterDashboard onNavigate={handleNavigate} />
          )}

          {currentView === 'map' && (
            <div className="p-3 sm:p-4 h-[calc(100vh-3.5rem)]">
              <InteractiveGisMap
                onNavigate={handleNavigate}
                initialSelectedId={selectedEntityId}
                heightClass="h-full"
                showInspector={true}
              />
            </div>
          )}

          {currentView === 'timeline' && (
            <SatelliteTimelineView onNavigate={handleNavigate} />
          )}

          {currentView === 'compare' && (
            <SatelliteComparisonView onNavigate={handleNavigate} />
          )}

          {currentView === 'changes' && (
            <ChangeDetectionView onNavigate={handleNavigate} />
          )}

          {currentView === 'risks' && (
            <AiRiskIntelligenceView onNavigate={handleNavigate} />
          )}

          {currentView === 'infrastructure' && (
            <InfrastructureMonitoringView onNavigate={handleNavigate} />
          )}

          {currentView === 'reports' && (
            <CitizenReportsView onNavigate={handleNavigate} />
          )}

          {currentView === 'alerts' && (
            <AlertCenterView onNavigate={handleNavigate} />
          )}

          {currentView === 'investigations' && (
            <InvestigationWorkspaceView onNavigate={handleNavigate} caseId={selectedEntityId} />
          )}

          {currentView === 'analytics' && (
            <AnalyticsView onNavigate={handleNavigate} />
          )}

          {currentView === 'location' && (
            <LocationProfileView onNavigate={handleNavigate} />
          )}
        </main>

      </div>

      {/* Mobile Bottom Navigation Bar (Visible on mobile only) */}
      <MobileNav
        currentView={currentView}
        onNavigate={handleNavigate}
        alertsCount={ALL_ALERTS.filter(a => a.severity === 'CRITICAL').length}
      />

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* Persistent System Health Status Modal */}
      <SystemStatusModal
        isOpen={isStatusOpen}
        onClose={() => setIsStatusOpen(false)}
        telemetry={SYSTEM_TELEMETRY}
      />

      {/* Guided Hackathon Walkthrough Runner */}
      <GuidedDemoWalkthrough
        isOpen={isDemoActive}
        currentStep={demoStepIndex}
        onClose={() => setIsDemoActive(false)}
        onNext={handleDemoNext}
        onPrev={handleDemoPrev}
        onJumpToStep={handleDemoJump}
      />

    </div>
  );
}
