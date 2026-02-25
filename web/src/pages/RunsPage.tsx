import { useNavigate } from 'react-router-dom';
import { useRunsData } from '../hooks';
import { ScrapeRun } from '../types';

function statusBadge(status: ScrapeRun['status']) {
  const cls: Record<ScrapeRun['status'], string> = {
    success: 'badge badge-success',
    error: 'badge badge-error',
    running: 'badge badge-running',
    partial: 'badge badge-partial',
  };
  return <span className={cls[status]}>{status}</span>;
}

function duration(start: string, end: string | null): string {
  if (!end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function RunsPage() {
  const navigate = useNavigate();
  const runs = useRunsData();
  const [runningNow, setRunningNow] = [false, (_: boolean) => {}]; // unused, kept for clarity
  void runningNow;
  void setRunningNow;

  async function handleRunNow() {
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json() as { runId: string };
      navigate(`/runs/${body.runId}`);
    } catch (err: any) {
      console.error('Failed to start run:', err);
    }
  }

  return (
    <div className="stack">
      <div className="row-between">
        <h2>Scrape Runs</h2>
        <button className="button" onClick={handleRunNow}>
          Run Now
        </button>
      </div>

      {runs.error && <p className="error">Failed to load runs: {runs.error}</p>}

      {runs.loading && <p className="muted">Loading…</p>}

      {!runs.loading && (runs.data ?? []).length === 0 && (
        <p className="muted">No runs yet. Click "Run Now" or wait for the next scheduled scrape.</p>
      )}

      {!runs.loading && (runs.data ?? []).length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Started</th>
                <th>Triggered By</th>
                <th>Boards</th>
                <th>Found</th>
                <th>New</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(runs.data ?? []).map((run) => (
                <tr
                  key={run.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/runs/${run.id}`)}
                >
                  <td>{formatDate(run.startedAt)}</td>
                  <td>{run.triggeredBy}</td>
                  <td>{run.boardsDone}/{run.boardsTotal}</td>
                  <td>{run.jobsFound}</td>
                  <td>{run.jobsNew}</td>
                  <td>{duration(run.startedAt, run.finishedAt)}</td>
                  <td>{statusBadge(run.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
