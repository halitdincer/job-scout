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

export default function JobsPage() {
  const [query, setQuery] = useState('');
  const [board, setBoard] = useState('');
  const [page, setPage] = useState(1);

  const debouncedQuery = useDebounce(query, 300);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [debouncedQuery, board]);

  const { data, error, loading } = useJobsData({ q: debouncedQuery, board, page });
  const boards = useBoardsData();

  const boardNames = useMemo(() => {
    return (boards.data ?? []).map((b) => b.name).sort();
  }, [boards.data]);

  if (error) {
    return <div className="card">Failed to load job data.</div>;
  }

  return (
    <div className="stack">
      <h2>Jobs</h2>
      <div className="filters">
        <input
          className="input"
          placeholder="Search titles, companies, locations"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="select" value={board} onChange={(e) => setBoard(e.target.value)}>
          <option value="">All boards</option>
          {boardNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="muted">Loading…</p>}

      <div className="stack">
        {(data?.jobs ?? []).map((job) => (
          <article key={job.id} className="card job-card">
            <div>
              <h3>{job.title}</h3>
              <p className="muted">
                {job.company} · {job.location}
              </p>
              <p className="tag">Board: {job.board}</p>
            </div>
            <div className="job-actions">
              <a className="button" href={job.url} target="_blank" rel="noreferrer">
                View job
              </a>
              {job.postedDate && <span className="muted">Posted: {job.postedDate}</span>}
            </div>
          </article>
        ))}
        {!loading && (data?.jobs ?? []).length === 0 && (
          <p className="muted">No jobs found.</p>
        )}
      </div>

      {data && data.pages > 1 && (
        <div className="pagination">
          <button
            className="button button-small"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="muted">
            Page {page} of {data.pages} ({data.total} jobs)
          </span>
          <button
            className="button button-small"
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
