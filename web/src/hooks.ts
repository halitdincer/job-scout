import { useEffect, useState } from 'react';
import { ApiBoard, JobsResponse, Run } from './types';

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

export function useRunsData(boardId?: string) {
  const [data, setData] = useState<Run[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const query = new URLSearchParams();
    if (boardId) query.set('boardId', boardId);

    fetch(`/api/runs?${query}`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Run[]>;
      })
      .then((payload) => {
        setData(payload);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [boardId]);

  return { data, error, loading };
}
