import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBoardsData, useJobsData, useRunsData } from '../hooks';
import { useAuth } from '../context/AuthContext';
import { ApiBoard, ScrapeRun } from '../types';

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

function duration(start: string, end: string | null): string {
  if (!end) return 'in progress';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function runBadge(status: ScrapeRun['status']): string {
  const cls: Record<ScrapeRun['status'], string> = {
    success: 'badge badge-success',
    error: 'badge badge-error',
    running: 'badge badge-running',
    partial: 'badge badge-partial',
  };
  return cls[status] ?? 'badge';
}

type AttentionItem = {
  id: string;
  name: string;
  reason: string;
  severity: number;
};

function boardAttention(board: ApiBoard): AttentionItem | null {
  if (!board.lastRun) {
    return { id: board.id, name: board.name, reason: 'Never run yet', severity: 4 };
  }

  if (board.lastRun.status === 'error') {
    return { id: board.id, name: board.name, reason: 'Failed on last run', severity: 3 };
  }

  if (board.lastRun.status === 'partial') {
    return { id: board.id, name: board.name, reason: 'Partial results last run', severity: 2 };
  }

  if (board.lastRun.status === 'success' && board.lastRun.finishedAt) {
    const ageMs = Date.now() - new Date(board.lastRun.finishedAt).getTime();
    if (ageMs > 1000 * 60 * 60 * 72) {
      return { id: board.id, name: board.name, reason: 'No successful run in 3+ days', severity: 1 };
    }
  }

  return null;
}

export default function HomePage() {
  const navigate = useNavigate();
  const jobs = useJobsData({ limit: 8 });
  const boards = useBoardsData();
  const runs = useRunsData();
  const { user } = useAuth();
  const [runNowError, setRunNowError] = useState('');
  const [startingRun, setStartingRun] = useState(false);

  const recentRuns = [...(runs.data ?? [])]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 5);
  const latestRun = recentRuns[0] ?? null;

  const lastSuccess = [...(runs.data ?? [])]
    .filter((run) => run.status === 'success' && run.finishedAt)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0] ?? null;

  const attentionBoards = (boards.data ?? [])
    .map(boardAttention)
    .filter((item): item is AttentionItem => Boolean(item))
    .sort((a, b) => b.severity - a.severity || a.name.localeCompare(b.name));

  const jobCount = jobs.data?.total ?? 0;
  const boardCount = (boards.data ?? []).length;
  const newInLatestRun = latestRun?.jobsNew ?? 0;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  async function handleRunNow() {
    setStartingRun(true);
    setRunNowError('');
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json() as { runId: string };
      navigate(`/runs/${body.runId}`);
    } catch {
      setRunNowError('Failed to start a run. Try again in a moment.');
    } finally {
      setStartingRun(false);
    }
  }

  return (
    <div className="home-shell">
      <section className="home-hero card">
        <div>
          <p className="home-kicker">{greeting}, {user?.email?.split('@')[0]}</p>
          <h2>Operations center</h2>
          <p className="muted">See run health, fix issues quickly, and keep your pipeline moving.</p>
        </div>
        <div className="home-hero-actions">
          <button className="button" onClick={handleRunNow} disabled={startingRun}>
            {startingRun ? 'Starting run...' : 'Run scraper now'}
          </button>
          <Link to="/runs" className="button button-secondary">View runs</Link>
          <Link to="/boards" className="button button-secondary">Manage boards</Link>
        </div>
      </section>

      {runNowError && <p className="error">{runNowError}</p>}

      <section className="home-panel card">
        <div className="row-between">
          <h3 className="section-heading">Operational snapshot</h3>
          {runs.loading && <span className="muted">Loading run data...</span>}
        </div>

        <div className="home-stats-grid">
          <div className="home-stat-card">
            <p className="stat-label">Latest run status</p>
            <p className="home-stat-value">
              {latestRun ? <span className={runBadge(latestRun.status)}>{latestRun.status}</span> : 'No runs yet'}
            </p>
          </div>

          <div className="home-stat-card">
            <p className="stat-label">Boards covered</p>
            <p className="home-stat-value">
              {latestRun ? `${latestRun.boardsDone}/${latestRun.boardsTotal}` : `${boardCount} boards`}
            </p>
          </div>

          <div className="home-stat-card">
            <p className="stat-label">New in latest run</p>
            <p className="home-stat-value">{newInLatestRun.toLocaleString()}</p>
          </div>

          <div className="home-stat-card">
            <p className="stat-label">Last successful run</p>
            <p className="home-stat-value">
              {lastSuccess?.finishedAt ? timeAgo(lastSuccess.finishedAt) : 'Not yet'}
            </p>
          </div>
        </div>
      </section>

      <div className="home-split">
        <section className="home-panel card">
          <div className="row-between">
            <h3 className="section-heading">Needs attention</h3>
            <Link to="/boards" className="button button-secondary button-small">Open boards</Link>
          </div>

          {boards.loading && <p className="muted">Checking board status...</p>}

          {!boards.loading && attentionBoards.length === 0 && (
            <p className="muted">All boards look healthy. No immediate action needed.</p>
          )}

          {attentionBoards.length > 0 && (
            <div className="home-attention-list">
              {attentionBoards.slice(0, 6).map((item) => (
                <div key={item.id} className="home-attention-row">
                  <div>
                    <p className="home-attention-board">{item.name}</p>
                    <p className="muted">{item.reason}</p>
                  </div>
                  <Link to="/boards" className="button button-secondary button-small">Review</Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="home-panel card">
          <div className="row-between">
            <h3 className="section-heading">Run health timeline</h3>
            <Link to="/runs" className="button button-secondary button-small">All runs</Link>
          </div>

          {runs.loading && <p className="muted">Loading runs...</p>}

          {!runs.loading && recentRuns.length === 0 && (
            <p className="muted">No runs yet. Trigger your first run to start tracking health.</p>
          )}

          {recentRuns.length > 0 && (
            <div className="home-run-list">
              {recentRuns.map((run) => (
                <button
                  type="button"
                  key={run.id}
                  className="home-run-row"
                  onClick={() => navigate(`/runs/${run.id}`)}
                >
                  <span className={runBadge(run.status)}>{run.status}</span>
                  <span className="home-run-meta">
                    {run.jobsFound} found / {run.jobsNew} new
                  </span>
                  <span className="home-run-meta">{duration(run.startedAt, run.finishedAt)}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="home-panel card">
        <div className="row-between">
          <h3 className="section-heading">Fresh intake</h3>
          <Link to="/jobs" className="button button-secondary button-small">View all jobs</Link>
        </div>

        {jobs.loading && <p className="muted">Loading jobs...</p>}

        {!jobs.loading && (jobs.data?.jobs ?? []).length === 0 && (
          <div className="home-empty">
            <p className="muted">No jobs indexed yet.</p>
            <p className="muted">Add boards and run a scrape to start your intake.</p>
          </div>
        )}

        {(jobs.data?.jobs ?? []).length > 0 && (
          <div className="home-fresh-list">
            {(jobs.data?.jobs ?? []).map((job) => (
              <div key={job.id} className="home-fresh-row">
                <div className="home-fresh-main">
                  <a className="job-title-link" href={job.url} target="_blank" rel="noreferrer">{job.title}</a>
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
                <div className="home-fresh-side">
                  <span className="job-time">{timeAgo(job.firstSeenAt)}</span>
                  <a className="button button-secondary button-small" href={job.url} target="_blank" rel="noreferrer">Open</a>
                </div>
              </div>
            ))}
          </div>
        )}

        {jobCount > 8 && (
          <div style={{ textAlign: 'center' }}>
            <Link to="/jobs" className="button button-secondary button-small">
              Browse all {jobCount.toLocaleString()} jobs
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
