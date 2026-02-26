import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useJobsData, useBoardsData, useTagsData, useCompaniesData } from '../hooks';
import GeoCombobox from '../components/GeoCombobox';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const DATE_PRESETS: { label: string; value: string }[] = [
  { label: 'Any time', value: '' },
  { label: 'Last 24h', value: '24h' },
  { label: 'Last 7d', value: '7d' },
  { label: 'Last 30d', value: '30d' },
];

function getDateRange(preset: string): { dateFrom: string; dateTo: string } {
  if (!preset) return { dateFrom: '', dateTo: '' };
  const now = new Date();
  const from = new Date(now);
  if (preset === '24h') from.setHours(now.getHours() - 24);
  else if (preset === '7d') from.setDate(now.getDate() - 7);
  else if (preset === '30d') from.setDate(now.getDate() - 30);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: now.toISOString().slice(0, 10),
  };
}

export default function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  // Multi-select filters
  const [selectedBoards, setSelectedBoards] = useState<string[]>(() => {
    const c = searchParams.get('companies');
    return c ? [] : [];
  });
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(() => {
    const c = searchParams.get('companies');
    return c ? c.split(',').filter(Boolean) : [];
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [locationKey, setLocationKey] = useState(() => searchParams.get('locationKey') ?? '');
  const [locationLabel, setLocationLabel] = useState('');
  const [datePreset, setDatePreset] = useState('');

  const debouncedQuery = useDebounce(query, 300);

  const { dateFrom, dateTo } = getDateRange(datePreset);

  useEffect(() => { setPage(1); }, [
    debouncedQuery, selectedBoards, selectedCompanies, selectedTags, locationKey, datePreset
  ]);

  const { data, error, loading } = useJobsData({
    q: debouncedQuery,
    boards: selectedBoards,
    companies: selectedCompanies,
    tags: selectedTags,
    locationKey,
    dateFrom,
    dateTo,
    page,
    limit: 50,
  });

  const boards = useBoardsData();
  const tagsData = useTagsData();
  const companiesData = useCompaniesData();

  const boardOptions = useMemo(
    () => (boards.data ?? []).map((b) => ({ id: b.id, name: b.name })).sort((a, b) => a.name.localeCompare(b.name)),
    [boards.data]
  );

  // Sync locationKey from URL param
  useEffect(() => {
    const lk = searchParams.get('locationKey');
    if (lk && lk !== locationKey) {
      setLocationKey(lk);
    }
    const comps = searchParams.get('companies');
    if (comps && selectedCompanies.join(',') !== comps) {
      setSelectedCompanies(comps.split(',').filter(Boolean));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleBoard(id: string) {
    setSelectedBoards((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  }

  function toggleCompany(id: string) {
    setSelectedCompanies((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function toggleTag(id: string) {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  const activeFilterCount =
    selectedBoards.length +
    selectedCompanies.length +
    selectedTags.length +
    (locationKey ? 1 : 0) +
    (datePreset ? 1 : 0);

  function clearAll() {
    setSelectedBoards([]);
    setSelectedCompanies([]);
    setSelectedTags([]);
    setLocationKey('');
    setLocationLabel('');
    setDatePreset('');
    setSearchParams({});
  }

  if (error) {
    return <div className="card">Failed to load job data.</div>;
  }

  return (
    <div className="stack">
      <div className="row-between">
        <h2 style={{ fontSize: 20 }}>Jobs</h2>
        {data && !loading && (
          <span className="muted">{data.total.toLocaleString()} total</span>
        )}
      </div>

      {/* Search bar */}
      <input
        className="input"
        placeholder="Search titles, companies, locations…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {/* Filters row */}
      <div className="filters filters-advanced">
        {/* Tags filter */}
        {(tagsData.data ?? []).length > 0 && (
          <div className="filter-group">
            <span className="filter-group-label">Tags</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {(tagsData.data ?? []).map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={`tag-badge${selectedTags.includes(tag.id) ? ' tag-badge-active' : ''}`}
                  style={{ backgroundColor: selectedTags.includes(tag.id) ? tag.color : undefined, color: selectedTags.includes(tag.id) ? '#fff' : undefined, cursor: 'pointer' }}
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Companies filter */}
        {(companiesData.data ?? []).length > 0 && (
          <div className="filter-group">
            <span className="filter-group-label">Companies</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {(companiesData.data ?? []).slice(0, 10).map((company) => (
                <button
                  key={company.id}
                  type="button"
                  className={`filter-chip${selectedCompanies.includes(company.id) ? ' filter-chip-active' : ''}`}
                  onClick={() => toggleCompany(company.id)}
                >
                  {company.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Location filter */}
        <div className="filter-group">
          <span className="filter-group-label">Location</span>
          <div style={{ maxWidth: 280 }}>
            <GeoCombobox
              locationKey={locationKey}
              locationLabel={locationLabel}
              onChange={(key, label) => {
                setLocationKey(key);
                setLocationLabel(label);
                if (key) {
                  setSearchParams((prev) => {
                    const p = new URLSearchParams(prev);
                    p.set('locationKey', key);
                    return p;
                  });
                } else {
                  setSearchParams((prev) => {
                    const p = new URLSearchParams(prev);
                    p.delete('locationKey');
                    return p;
                  });
                }
              }}
              placeholder="Filter by country, state, city…"
            />
          </div>
        </div>

        {/* Date filter */}
        <div className="filter-group">
          <span className="filter-group-label">Date added</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {DATE_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                className={`filter-chip${datePreset === p.value ? ' filter-chip-active' : ''}`}
                onClick={() => setDatePreset(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Boards filter */}
        {boardOptions.length > 0 && (
          <div className="filter-group">
            <span className="filter-group-label">Boards</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {boardOptions.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`filter-chip${selectedBoards.includes(b.id) ? ' filter-chip-active' : ''}`}
                  onClick={() => toggleBoard(b.id)}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeFilterCount > 0 && (
          <button type="button" className="button button-secondary button-small" onClick={clearAll}>
            Clear filters ({activeFilterCount})
          </button>
        )}
      </div>

      {loading && <p className="muted">Loading…</p>}

      {!loading && (data?.jobs ?? []).length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p className="muted">No jobs found.</p>
        </div>
      )}

      {(data?.jobs ?? []).length > 0 && (
        <div className="job-list">
          {(data?.jobs ?? []).map((job) => (
            <div key={job.id} className="job-row">
              <div className="job-row-main">
                <a
                  className="job-title-link"
                  href={job.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {job.title}
                </a>
                <div className="job-meta">
                  <span>{job.company}</span>
                  {job.location && (
                    <>
                      <span className="job-meta-sep">·</span>
                      <span>{job.location}</span>
                    </>
                  )}
                  <span className="job-meta-sep">·</span>
                  <span className="tag">{job.board}</span>
                  {job.postedDate && (
                    <>
                      <span className="job-meta-sep">·</span>
                      <span>{job.postedDate}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="job-row-actions">
                <span className="job-time">{timeAgo(job.firstSeenAt)}</span>
                <a
                  className="button button-secondary button-small"
                  href={job.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  View
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="pagination">
          <button
            className="button button-secondary button-small"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ← Previous
          </button>
          <span className="muted">
            Page {page} of {data.pages}
          </span>
          <button
            className="button button-secondary button-small"
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
