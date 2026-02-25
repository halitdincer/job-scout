import { useEffect, useState } from 'react';
import { ApiBoard, JobsResponse, ScrapeRun, ScrapeRunDetail } from './types';

interface JobsParams {
  q?: string;
  board?: string;
  page?: number;
  limit?: number;
}

export function useJobsData(params: JobsParams = {}) {
  const { q = '', board = '', page = 1, limit = 25 } = params;
  const [data, setData] = useState<JobsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const query = new URLSearchParams();
    if (q) query.set('q', q);
    if (board) query.set('board', board);
    query.set('page', String(page));
    query.set('limit', String(limit));

    fetch(`/api/jobs?${query}`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<JobsResponse>;
      })
      .then((payload) => {
        setData(payload);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [q, board, page, limit]);

  return { data, error, loading };
}

export function useBoardsData() {
  const [data, setData] = useState<ApiBoard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/boards', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ApiBoard[]>;
      })
      .then((payload) => {
        setData(payload);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function refresh() {
    setLoading(true);
    fetch('/api/boards', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ApiBoard[]>;
      })
      .then((payload) => {
        setData(payload);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  return { data, error, loading, refresh };
}

export function useRunsData() {
  const [data, setData] = useState<ScrapeRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch('/api/runs', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ScrapeRun[]>;
      })
      .then((payload) => {
        setData(payload);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return { data, error, loading, refresh: load };
}

export function useRunDetail(runId: string) {
  const [data, setData] = useState<ScrapeRunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch(`/api/runs/${runId}`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ScrapeRunDetail>;
      })
      .then((payload) => {
        setData(payload);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [runId]);

  // Auto-refresh every 3s while running
  useEffect(() => {
    if (data?.status !== 'running') return;
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [data?.status, runId]);

  return { data, error, loading, refresh: load };
}
