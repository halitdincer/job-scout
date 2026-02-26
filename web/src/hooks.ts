import { useEffect, useState } from 'react';
import { ApiBoard, Company, GeoResult, JobsResponse, ScrapeRun, ScrapeRunDetail, Tag } from './types';

export interface JobsParams {
  q?: string;
  board?: string;
  boards?: string[];
  companies?: string[];
  tags?: string[];
  locationKey?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
}

export function useJobsData(params: JobsParams = {}) {
  const {
    q = '',
    board = '',
    boards = [],
    companies = [],
    tags = [],
    locationKey = '',
    dateFrom = '',
    dateTo = '',
    page = 1,
    limit = 25,
    sortBy = 'newest',
  } = params;

  const [data, setData] = useState<JobsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const boardsKey = boards.join(',');
  const companiesKey = companies.join(',');
  const tagsKey = tags.join(',');

  useEffect(() => {
    setLoading(true);
    const query = new URLSearchParams();
    if (q) query.set('q', q);
    if (board) query.set('board', board);
    if (boards.length > 0) query.set('boards', boards.join(','));
    if (companies.length > 0) query.set('companies', companies.join(','));
    if (tags.length > 0) query.set('tags', tags.join(','));
    if (locationKey) query.set('locationKey', locationKey);
    if (dateFrom) query.set('dateFrom', dateFrom);
    if (dateTo) query.set('dateTo', dateTo);
    if (sortBy && sortBy !== 'newest') query.set('sortBy', sortBy);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, board, boardsKey, companiesKey, tagsKey, locationKey, dateFrom, dateTo, page, limit, sortBy]);

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

export function useTagsData() {
  const [data, setData] = useState<Tag[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch('/api/tags', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Tag[]>;
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

export function useCompaniesData(q?: string) {
  const [data, setData] = useState<Company[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const query = new URLSearchParams();
    if (q) query.set('q', q);
    fetch(`/api/companies?${query}`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Company[]>;
      })
      .then((payload) => {
        setData(payload);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [q]);

  return { data, error, loading };
}

export function useGeoSearch(q: string) {
  const [data, setData] = useState<GeoResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q || q.trim().length < 2) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const query = new URLSearchParams({ q: q.trim() });
    fetch(`/api/geo/search?${query}`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<GeoResult[]>;
      })
      .then((payload) => {
        setData(payload);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [q]);

  return { data, error, loading };
}
