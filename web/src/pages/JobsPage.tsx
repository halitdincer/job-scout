import { useMemo, useState } from 'react';
import { useJobsData } from '../hooks';

export default function JobsPage() {
  const { data, error } = useJobsData();
  const [query, setQuery] = useState('');
  const [board, setBoard] = useState('All');

  const boards = useMemo(() => {
    const set = new Set<string>();
    data?.jobs.forEach((job) => set.add(job.board));
    return ['All', ...Array.from(set).sort()];
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.jobs.filter((job) => {
      const matchesBoard = board === 'All' || job.board === board;
      const text = `${job.title} ${job.company} ${job.location}`.toLowerCase();
      const matchesQuery = text.includes(query.toLowerCase());
      return matchesBoard && matchesQuery;
    });
  }, [data, board, query]);

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
          onChange={(event) => setQuery(event.target.value)}
        />
        <select className="select" value={board} onChange={(event) => setBoard(event.target.value)}>
          {boards.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="stack">
        {filtered.map((job) => (
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
              {job.postedDate ? <span className="muted">Posted: {job.postedDate}</span> : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
