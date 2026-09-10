'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';

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
  targetDate: Date | null; // The temporal anchor, used for URL sync
  setSelectedObservationId: (id: string | null) => void;
  setBeforeObservationId: (id: string | null) => void;
  setMode: (mode: ComparisonMode) => void;
  setPlaybackState: (state: Partial<PlaybackState>) => void;
  setTargetDate: (date: Date | null) => void;
  reset: () => void;
}

const TimeMachineContext = createContext<TimeMachineContextValue | null>(null);

/** Parse URL params into initial state. Returns null if no params exist. */
function parseUrlState(searchParams: URLSearchParams): Partial<{
  obs: string;
  before: string;
  mode: ComparisonMode;
  speed: number;
  targetDate: string;
}> | null {
  const obs = searchParams.get('obs');
  const before = searchParams.get('before');
  const mode = searchParams.get('mode');
  const speed = searchParams.get('speed');
  const targetDate = searchParams.get('targetDate');
  if (!obs && !before && !mode && !speed && !targetDate) return null;
  return {
    obs: obs ?? undefined,
    before: before ?? undefined,
    mode: (mode as ComparisonMode) ?? undefined,
    speed: speed ? Number(speed) : undefined,
    targetDate: targetDate ?? undefined,
  };
}

/** Sync current state into URL query params. */
function syncToUrl(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  state: {
    selectedObservationId: string | null;
    beforeObservationId: string | null;
    mode: ComparisonMode;
    playbackState: PlaybackState;
    targetDate: Date | null;
  },
) {
  const params = new URLSearchParams();
  if (state.selectedObservationId) params.set('obs', state.selectedObservationId);
  if (state.beforeObservationId) params.set('before', state.beforeObservationId);
  if (state.mode !== 'single') params.set('mode', state.mode);
  if (state.playbackState.speed !== 2) params.set('speed', String(state.playbackState.speed));
  if (state.targetDate) params.set('targetDate', state.targetDate.toISOString());
  const qs = params.toString();
  const url = qs ? `${pathname}?${qs}` : pathname;
  // Use replace so back button doesn't accumulate history entries
  router.replace(url, { scroll: false });
}

export function TimeMachineProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize from URL on mount
  const urlState = parseUrlState(searchParams);
  const [selectedObservationId, setSelectedObs] = useState<string | null>(urlState?.obs ?? null);
  const [beforeObservationId, setBeforeObs] = useState<string | null>(urlState?.before ?? null);
  const [mode, setModeState] = useState<ComparisonMode>(urlState?.mode ?? 'single');
  const [playbackState, setPlaybackStateInternal] = useState<PlaybackState>({
    playing: false,
    speed: urlState?.speed ?? 2,
  });
  const [targetDate, setTargetDateState] = useState<Date | null>(
    urlState?.targetDate ? new Date(urlState.targetDate) : null,
  );

  // Debounced URL sync — update URL when state changes (with a short delay)
  useEffect(() => {
    const timeout = setTimeout(() => {
      syncToUrl(router, pathname ?? '', {
        selectedObservationId,
        beforeObservationId,
        mode,
        playbackState,
        targetDate,
      });
    }, 150);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedObservationId, beforeObservationId, mode, playbackState, targetDate]);

  const setSelectedObservationId = useCallback((id: string | null) => {
    setSelectedObs(id);
    if (id) {
      // Update targetDate to the observation's date for URL sync
      // (the actual date lookup happens in the page component)
    }
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

  const setTargetDate = useCallback((date: Date | null) => {
    setTargetDateState(date);
  }, []);

  const reset = useCallback(() => {
    setSelectedObs(null);
    setBeforeObs(null);
    setModeState('single');
    setPlaybackStateInternal({ playing: false, speed: 2 });
    setTargetDateState(null);
    router.replace(pathname ?? '', { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <TimeMachineContext.Provider
      value={{
        selectedObservationId,
        beforeObservationId,
        mode,
        playbackState,
        targetDate,
        setSelectedObservationId,
        setBeforeObservationId,
        setMode,
        setPlaybackState,
        setTargetDate,
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
