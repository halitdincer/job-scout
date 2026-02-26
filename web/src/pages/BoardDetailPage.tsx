import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiBoard, Job, JobsResponse } from '../types';

export default function BoardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [board, setBoard] = useState<ApiBoard | null>(null);
  const [jobs, setJobs] = useState<JobsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [boardRes, jobsRes] = await Promise.all([
          fetch(`/api/boards/${id}`, { credentials: 'include' }),
          fetch(`/api/boards/${id}/jobs?page=1&limit=25`, { credentials: 'include' }),
        ]);
        if (!boardRes.ok) throw new Error('Failed to load board');
        if (!jobsRes.ok) throw new Error('Failed to load jobs');
        const boardJson = await boardRes.json() as ApiBoard;
        const jobsJson = await jobsRes.json() as JobsResponse;
        if (!active) return;
        setBoard(boardJson);
        setJobs(jobsJson);
      } catch (err: any) {
        if (!active) return;
        setError(err.message ?? 'Failed to load board detail');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return <p className="muted">Loading...</p>;
  }

  if (error) {
    return <p className="error">{error}</p>;
  }

  if (!board) {
    return <p className="muted">Board not found.</p>;
  }

  return (
    <div className="stack">
      <Link to="/boards" className="muted">← Back to Boards</Link>

      <div className="card">
        <h2 style={{ marginBottom: 6 }}>{board.name}</h2>
        <p className="muted">{board.url}</p>
        <p className="muted">State: {board.state ?? 'active'}</p>
      </div>

      <div className="card">
        <div className="row-between" style={{ marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Linked Jobs</h3>
          <span className="muted">{jobs?.total ?? 0} total</span>
        </div>

        {((jobs?.jobs ?? []) as Job[]).length === 0 ? (
          <p className="muted">No linked jobs yet.</p>
        ) : (
          <div className="job-list">
            {(jobs?.jobs ?? []).map((job) => (
              <div key={job.id} className="job-row">
                <div className="job-row-main">
                  <a className="job-title-link" href={job.url} target="_blank" rel="noreferrer">
                    {job.title}
                  </a>
                  <div className="job-meta">
                    <span>{job.company}</span>
                    <span className="job-meta-sep">·</span>
                    <span>{job.location}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
