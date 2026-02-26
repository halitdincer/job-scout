import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTagsData } from './hooks';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockJson(data: unknown, ok = true) {
  mockFetch.mockResolvedValueOnce({
    ok,
    json: () => Promise.resolve(data),
  });
}

describe('useTagsData', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('fetches tags and returns data', async () => {
    const tags = [{ id: 't1', name: 'frontend', color: '#f00', sourceCount: 2 }];
    mockJson(tags);
    const { result } = renderHook(() => useTagsData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(tags);
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith('/api/tags', { credentials: 'include' });
  });

  it('sets error on non-ok response', async () => {
    mockJson({}, false);
    const { result } = renderHook(() => useTagsData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeNull();
  });

  it('refresh re-fetches data', async () => {
    mockJson([]);
    const { result } = renderHook(() => useTagsData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    mockJson([{ id: 't2', name: 'backend', color: '#0f0', sourceCount: 0 }]);
    result.current.refresh();
    await waitFor(() => expect(result.current.data).toHaveLength(1));
  });
});
