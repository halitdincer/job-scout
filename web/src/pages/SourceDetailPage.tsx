import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiSource, Job, JobsResponse } from '../types';

export default function SourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [source, setSource] = useState<ApiSource | null>(null);
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
        const [sourceRes, jobsRes] = await Promise.all([
          fetch(`/api/sources/${id}`, { credentials: 'include' }),
          fetch(`/api/sources/${id}/jobs?page=1&limit=25`, { credentials: 'include' }),
        ]);
        if (!sourceRes.ok) throw new Error('Failed to load source');
        if (!jobsRes.ok) throw new Error('Failed to load jobs');
        const sourceJson = await sourceRes.json() as ApiSource;
        const jobsJson = await jobsRes.json() as JobsResponse;
        if (!active) return;
        setSource(sourceJson);
        setJobs(jobsJson);
      } catch (err: any) {
        if (!active) return;
        setError(err.message ?? 'Failed to load source detail');
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

  if (!source) {
    return <p className="muted">Source not found.</p>;
  }

  return (
    <div className="stack">
      <Link to="/sources" className="muted">← Back to Sources</Link>

      <div className="card">
        <h2 style={{ marginBottom: 6 }}>{source.name}</h2>
        <p className="muted">{source.url}</p>
        <p className="muted">State: {source.state ?? 'active'}</p>
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
