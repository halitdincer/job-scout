import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useJobsData, useBoardsData, useRunsData } from './hooks';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useJobsData', () => {
  it('fetches jobs and returns data', async () => {
    const mockResponse = { jobs: [{ id: '1', title: 'Dev' }], total: 1, page: 1, limit: 25, pages: 1 };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    const { result } = renderHook(() => useJobsData());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(mockResponse);
    expect(result.current.error).toBeNull();
  });

  it('sets error on HTTP failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    }));

    const { result } = renderHook(() => useJobsData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toContain('HTTP');
  });

  it('passes q, board, page, limit as query params', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jobs: [], total: 0, page: 2, limit: 10, pages: 0 }),
    }));

    renderHook(() => useJobsData({ q: 'eng', board: 'BoardA', page: 2, limit: 10 }));
    await waitFor(() => {
      const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
      expect(url).toContain('q=eng');
      expect(url).toContain('board=BoardA');
      expect(url).toContain('page=2');
      expect(url).toContain('limit=10');
    });
  });
});

describe('useBoardsData', () => {
  it('fetches boards and returns data', async () => {
    const boards = [{ id: 'b1', name: 'Board', url: 'https://x.com', selectors: {} }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(boards),
    }));

    const { result } = renderHook(() => useBoardsData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(boards);
  });

  it('sets error on HTTP failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    const { result } = renderHook(() => useBoardsData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBeNull();
  });

  it('refresh() re-fetches boards', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useBoardsData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    result.current.refresh();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});

describe('useRunsData', () => {
  it('fetches runs and returns data', async () => {
    const runs = [{ id: 'r1', boardId: 'b1', status: 'success' }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(runs),
    }));

    const { result } = renderHook(() => useRunsData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(runs);
  });

  it('passes boardId as query param when provided', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }));

    renderHook(() => useRunsData('board-123'));
    await waitFor(() => {
      const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
      expect(url).toContain('boardId=board-123');
    });
  });
});
