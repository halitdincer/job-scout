import { Link } from 'react-router-dom';
import { useBoardsData, useJobsData } from '../hooks';
import { useAuth } from '../context/AuthContext';

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

export default function HomePage() {
  const jobs = useJobsData({ limit: 25 });
  const boards = useBoardsData();
  const { user } = useAuth();

  const jobCount = jobs.data?.total ?? 0;
  const boardCount = (boards.data ?? []).length;
  const latestJob = jobs.data?.jobs[0];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="stack">
      {/* Welcome + stats */}
      <div className="card hero" style={{ padding: '24px 28px' }}>
        <p style={{ fontSize: 13, color: 'var(--c-muted)', marginBottom: 4 }}>
          {greeting}, {user?.email?.split('@')[0]}
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Your job feed</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div>
            <p className="stat-label">Total Jobs</p>
            <p className="stat">{jobCount.toLocaleString()}</p>
          </div>
          <div>
            <p className="stat-label">Boards</p>
            <p className="stat">{boardCount}</p>
          </div>
          <div>
            <p className="stat-label">Last Activity</p>
            <p className="stat" style={{ fontSize: 18 }}>
              {latestJob ? timeAgo(latestJob.lastSeenAt) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Recent jobs feed */}
      <div className="row-between" style={{ marginBottom: -4 }}>
        <h3 className="section-heading">Recently found</h3>
        <Link to="/jobs" className="button button-secondary button-small">
          View all
        </Link>
      </div>

      {jobs.loading && <p className="muted">Loading…</p>}

      {!jobs.loading && (jobs.data?.jobs ?? []).length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p className="muted">No jobs yet.</p>
          <p className="muted" style={{ marginTop: 6 }}>
            <Link to="/boards">Add a board</Link> to start scraping.
          </p>
        </div>
      )}

      {(jobs.data?.jobs ?? []).length > 0 && (
        <div className="job-list">
          {(jobs.data?.jobs ?? []).map((job) => (
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
                </div>
              </div>
              <div className="job-row-actions">
                <span className="job-time">{timeAgo(job.firstSeenAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {jobCount > 25 && (
        <div style={{ textAlign: 'center' }}>
          <Link to="/jobs" className="button button-secondary button-small">
            Browse all {jobCount.toLocaleString()} jobs →
          </Link>
        </div>
      )}
    </div>
  );
}
