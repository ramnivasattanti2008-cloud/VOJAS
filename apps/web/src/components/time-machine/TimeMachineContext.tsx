'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type ComparisonMode = 'single' | 'side-by-side' | 'swipe' | 'opacity';

export interface PlaybackState {
  playing: boolean;
  speed: number; // seconds per step, 1 = real time, 0.5 = double speed
}

interface TimeMachineContextValue {
  selectedObservationId: string | null;
  beforeObservationId: string | null;
  mode: ComparisonMode;
  playbackState: PlaybackState;
  setSelectedObservationId: (id: string | null) => void;
  setBeforeObservationId: (id: string | null) => void;
  setMode: (mode: ComparisonMode) => void;
  setPlaybackState: (state: Partial<PlaybackState>) => void;
  reset: () => void;
}

const TimeMachineContext = createContext<TimeMachineContextValue | null>(null);

export function TimeMachineProvider({ children }: { children: ReactNode }) {
  const [selectedObservationId, setSelectedObs] = useState<string | null>(null);
  const [beforeObservationId, setBeforeObs] = useState<string | null>(null);
  const [mode, setModeState] = useState<ComparisonMode>('single');
  const [playbackState, setPlaybackStateInternal] = useState<PlaybackState>({
    playing: false,
    speed: 2,
  });

  const setSelectedObservationId = useCallback((id: string | null) => {
    setSelectedObs(id);
  }, []);

  const setBeforeObservationId = useCallback((id: string | null) => {
    setBeforeObs(id);
  }, []);

  const setMode = useCallback((m: ComparisonMode) => {
    setModeState(m);
  }, []);

  const setPlaybackState = useCallback((state: Partial<PlaybackState>) => {
    setPlaybackStateInternal((prev) => ({ ...prev, ...state }));
  }, []);

  const reset = useCallback(() => {
    setSelectedObs(null);
    setBeforeObs(null);
    setModeState('single');
    setPlaybackStateInternal({ playing: false, speed: 2 });
  }, []);

  return (
    <TimeMachineContext.Provider
      value={{
        selectedObservationId,
        beforeObservationId,
        mode,
        playbackState,
        setSelectedObservationId,
        setBeforeObservationId,
        setMode,
        setPlaybackState,
        reset,
      }}
    >
      {children}
    </TimeMachineContext.Provider>
  );
}

export function useTimeMachine(): TimeMachineContextValue {
  const ctx = useContext(TimeMachineContext);
  if (!ctx) {
    throw new Error('useTimeMachine must be used inside <TimeMachineProvider>');
  }
  return ctx;
}
