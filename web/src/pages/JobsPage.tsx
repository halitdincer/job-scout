import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useJobsData, useSourcesData, useTagsData } from '../hooks';

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

const DATE_PRESETS = [
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

interface DropdownOption {
  id: string;
  name: string;
  color?: string;
}

function FilterDropdown({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: DropdownOption[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const count = selected.length;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className={`filter-chip${count > 0 ? ' filter-chip-active' : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        {label}{count > 0 ? ` · ${count}` : ''}
        <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.6 }}>▾</span>
      </button>
      {open && (
        <div className="combobox-dropdown" style={{ minWidth: 160 }}>
          {options.map((opt) => {
            const isSelected = selected.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                className={`combobox-item${isSelected ? ' combobox-item-selected' : ''}`}
                onClick={() => onToggle(opt.id)}
              >
                {opt.color && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: opt.color,
                      marginRight: 7,
                      flexShrink: 0,
                    }}
                  />
                )}
                <span style={{ flex: 1 }}>{opt.name}</span>
                {isSelected && <span style={{ marginLeft: 8, opacity: 0.7 }}>✓</span>}
              </button>
            );
          })}
          {options.length === 0 && (
            <span className="combobox-item combobox-item-muted">No options</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [datePreset, setDatePreset] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const debouncedQuery = useDebounce(query, 300);
  const { dateFrom, dateTo } = getDateRange(datePreset);

  useEffect(() => { setPage(1); }, [
    debouncedQuery, selectedSources, selectedTags, datePreset, sortBy,
  ]);

  // Clear selection when results change
  useEffect(() => { setSelectedIds(new Set()); }, [refreshKey, page]);

  const { data, error, loading } = useJobsData({
    q: debouncedQuery,
    sources: selectedSources,
    tags: selectedTags,
    dateFrom,
    dateTo,
    sortBy,
    page,
    limit: 50,
    refreshKey,
  });

  const sources = useSourcesData();
  const tagsData = useTagsData();

  const sourceOptions = useMemo(
    () => (sources.data ?? []).map((b) => ({ id: b.id, name: b.name })).sort((a, b) => a.name.localeCompare(b.name)),
    [sources.data]
  );

  function toggleSource(id: string) {
    setSelectedSources((prev) => prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]);
  }

  function toggleTag(id: string) {
    setSelectedTags((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  }

  const currentJobIds = (data?.jobs ?? []).map((j) => j.id);
  const allSelected = currentJobIds.length > 0 && currentJobIds.every((id) => selectedIds.has(id));

  function toggleJobSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentJobIds));
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} job${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetch('/api/jobs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      setSelectedIds(new Set());
      setRefreshKey((k) => k + 1);
    } finally {
      setDeleting(false);
    }
  }

  const activeFilterCount =
    selectedSources.length + selectedTags.length + (datePreset ? 1 : 0);

  function clearAll() {
    setSelectedSources([]);
    setSelectedTags([]);
    setDatePreset('');
    setSearchParams({});
  }

  if (error) return <div className="card">Failed to load job data.</div>;

  return (
    <div className="stack">
      <div className="row-between">
        <h2 style={{ fontSize: 20 }}>Jobs</h2>
        {data && !loading && (
          <span className="muted">{data.total.toLocaleString()} total</span>
        )}
      </div>

      <input
        className="input"
        placeholder="Search titles, companies, locations…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {/* Single-line filter + sort toolbar */}
      <div className="filters-advanced">
        {(tagsData.data ?? []).length > 0 && (
          <FilterDropdown
            label="Tags"
            options={(tagsData.data ?? []).map((t) => ({ id: t.id, name: t.name, color: t.color }))}
            selected={selectedTags}
            onToggle={toggleTag}
          />
        )}

        <select
          className="filter-select"
          value={datePreset}
          onChange={(e) => setDatePreset(e.target.value)}
        >
          {DATE_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A–Z</option>
        </select>

        {sourceOptions.length > 0 && (
          <FilterDropdown
            label="Sources"
            options={sourceOptions}
            selected={selectedSources}
            onToggle={toggleSource}
          />
        )}

        {activeFilterCount > 0 && (
          <button type="button" className="button button-secondary button-small" onClick={clearAll}>
            Clear ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="bulk-bar">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              style={{ width: 16, height: 16 }}
            />
            <span className="muted" style={{ fontSize: 13 }}>
              {selectedIds.size} of {currentJobIds.length} selected
            </span>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="button button-danger button-small"
              onClick={handleBulkDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : `Delete ${selectedIds.size}`}
            </button>
            <button
              type="button"
              className="button button-secondary button-small"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {loading && <p className="muted">Loading…</p>}

      {!loading && (data?.jobs ?? []).length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p className="muted">No jobs found.</p>
        </div>
      )}

      {(data?.jobs ?? []).length > 0 && (
        <div className="job-list">
          <div className="job-row job-row-header">
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                style={{ width: 15, height: 15 }}
              />
            </label>
            <span className="muted" style={{ fontSize: 12 }}>
              {currentJobIds.length} job{currentJobIds.length !== 1 ? 's' : ''} on this page
            </span>
            <span />
          </div>
          {(data?.jobs ?? []).map((job) => (
            <div
              key={job.id}
              className={`job-row${selectedIds.has(job.id) ? ' job-row-selected' : ''}`}
              onClick={() => toggleJobSelect(job.id)}
              style={{ cursor: 'pointer' }}
            >
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(job.id)}
                  onChange={() => toggleJobSelect(job.id)}
                  style={{ width: 15, height: 15 }}
                />
              </label>
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
                  <span className="tag">{job.source}</span>
                </div>
              </div>
              <div className="job-row-actions" onClick={(e) => e.stopPropagation()}>
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
          <span className="muted">Page {page} of {data.pages}</span>
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
