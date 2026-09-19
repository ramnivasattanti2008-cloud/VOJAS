import { describe, expect, it } from 'vitest';
import { queryClient } from './query-client';

// Regression guard for a config that was previously verified deliberately
// tuned: refetchOnWindowFocus disabled so officer/MP dashboards don't
// re-fetch (and visibly flicker) every time a reviewer alt-tabs back in,
// with a 2-minute staleTime so that's actually safe to do.
describe('queryClient defaults', () => {
  const { queries, mutations } = queryClient.getDefaultOptions();

  it('disables refetch-on-window-focus', () => {
    expect(queries?.refetchOnWindowFocus).toBe(false);
  });

  it('sets a 2-minute staleTime', () => {
    expect(queries?.staleTime).toBe(1000 * 60 * 2);
  });

  it('retries queries once but never retries mutations', () => {
    expect(queries?.retry).toBe(1);
    expect(mutations?.retry).toBe(0);
  });
});
