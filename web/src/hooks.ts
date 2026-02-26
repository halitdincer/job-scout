import { useEffect, useState } from 'react';
import { ApiSource, JobsResponse, ScrapeRun, ScrapeRunDetail, Tag } from './types';

export interface JobsParams {
  q?: string;
  source?: string;
  sources?: string[];
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  refreshKey?: number;
}

export function useJobsData(params: JobsParams = {}) {
  const {
    q = '',
    source = '',
    sources = [],
    tags = [],
    dateFrom = '',
    dateTo = '',
    page = 1,
    limit = 25,
    sortBy = 'newest',
    refreshKey = 0,
  } = params;

  const [data, setData] = useState<JobsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sourcesKey = sources.join(',');
  const tagsKey = tags.join(',');

  useEffect(() => {
    setLoading(true);
    const query = new URLSearchParams();
    if (q) query.set('q', q);
    if (source) query.set('source', source);
    if (sources.length > 0) query.set('sources', sources.join(','));
    if (tags.length > 0) query.set('tags', tags.join(','));
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
  }, [q, source, sourcesKey, tagsKey, dateFrom, dateTo, page, limit, sortBy, refreshKey]);

  return { data, error, loading };
}

export function useSourcesData() {
  const [data, setData] = useState<ApiSource[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sources', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ApiSource[]>;
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
    fetch('/api/sources', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ApiSource[]>;
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
