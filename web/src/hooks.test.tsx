import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTagsData, useCompaniesData, useGeoSearch } from './hooks';

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
    const tags = [{ id: 't1', name: 'frontend', color: '#f00', boardCount: 2 }];
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
    mockJson([{ id: 't2', name: 'backend', color: '#0f0', boardCount: 0 }]);
    result.current.refresh();
    await waitFor(() => expect(result.current.data).toHaveLength(1));
  });
});

describe('useCompaniesData', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches all companies when no query', async () => {
    const companies = [{ id: 'c1', name: 'Acme', boardCount: 1, jobCount: 5 }];
    mockJson(companies);
    const { result } = renderHook(() => useCompaniesData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(companies);
    expect(mockFetch).toHaveBeenCalledWith('/api/companies?', { credentials: 'include' });
  });

  it('includes q param when query provided', async () => {
    mockJson([]);
    const { result } = renderHook(() => useCompaniesData('acme'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetch).toHaveBeenCalledWith('/api/companies?q=acme', { credentials: 'include' });
  });

  it('sets error on fetch failure', async () => {
    mockJson({}, false);
    const { result } = renderHook(() => useCompaniesData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });
});

describe('useGeoSearch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty array for short query without fetching', async () => {
    const { result } = renderHook(() => useGeoSearch('a'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns empty array for empty query', async () => {
    const { result } = renderHook(() => useGeoSearch(''));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches results for query of 2+ chars', async () => {
    const results = [{ key: 'CA', label: 'Canada', type: 'country' }];
    mockJson(results);
    const { result } = renderHook(() => useGeoSearch('Ca'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(results);
    expect(mockFetch).toHaveBeenCalledWith('/api/geo/search?q=Ca', { credentials: 'include' });
  });

  it('sets error on non-ok response', async () => {
    mockJson({}, false);
    const { result } = renderHook(() => useGeoSearch('Canada'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });
});
