import { useEffect, useMemo, useState } from 'react';
import { useJobsData, useBoardsData } from '../hooks';

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

export default function JobsPage() {
  const [query, setQuery] = useState('');
  const [board, setBoard] = useState('');
  const [page, setPage] = useState(1);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => { setPage(1); }, [debouncedQuery, board]);

  const { data, error, loading } = useJobsData({ q: debouncedQuery, board, page, limit: 50 });
  const boards = useBoardsData();

  const boardNames = useMemo(
    () => (boards.data ?? []).map((b) => b.name).sort(),
    [boards.data]
  );

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

      <div className="filters">
        <input
          className="input"
          placeholder="Search titles, companies, locations…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1 }}
        />
        <select
          className="input input-select"
          value={board}
          onChange={(e) => setBoard(e.target.value)}
          style={{ width: 'auto', minWidth: 160 }}
        >
          <option value="">All boards</option>
          {boardNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
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
