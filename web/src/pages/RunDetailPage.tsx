import { useParams, Link } from 'react-router-dom';
import { useRunDetail } from '../hooks';
import { ScrapeRun, ScrapeRunSource } from '../types';

function runStatusBadge(status: ScrapeRun['status']) {
  const cls: Record<ScrapeRun['status'], string> = {
    success: 'badge badge-success',
    error: 'badge badge-error',
    running: 'badge badge-running',
    partial: 'badge badge-partial',
  };
  return <span className={cls[status]}>{status}</span>;
}

function sourceStatusBadge(status: ScrapeRunSource['status']) {
  const cls: Record<ScrapeRunSource['status'], string> = {
    success: 'badge badge-success',
    error: 'badge badge-error',
    running: 'badge badge-running',
    pending: 'badge badge-pending',
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

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: run, error, loading } = useRunDetail(id!);

  if (loading && !run) {
    return (
      <div className="stack">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stack">
        <Link to="/runs" className="muted">← Back to Runs</Link>
        <p className="error">Failed to load run: {error}</p>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="stack">
        <Link to="/runs" className="muted">← Back to Runs</Link>
        <p className="muted">Run not found.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <Link to="/runs" className="muted" style={{ fontSize: 13 }}>← Back to Runs</Link>

      <div className="card">
        <div className="row-between">
          <div>
            <h2 style={{ margin: 0 }}>Run Detail</h2>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              {formatDate(run.startedAt)}
              {run.finishedAt && ` — ${duration(run.startedAt, run.finishedAt)}`}
            </p>
          </div>
          {runStatusBadge(run.status)}
        </div>

        <div style={{ display: 'flex', gap: 24, marginTop: 12, flexWrap: 'wrap' }}>
          <span><strong>Triggered by:</strong> {run.triggeredBy}</span>
          <span><strong>Sources:</strong> {run.sourcesDone}/{run.sourcesTotal}</span>
          <span><strong>Jobs found:</strong> {run.jobsFound}</span>
          <span><strong>New jobs:</strong> {run.jobsNew}</span>
        </div>
      </div>

      {run.sources.length === 0 ? (
        <p className="muted">No sources scraped yet…</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Status</th>
                <th>Found</th>
                <th>New</th>
                <th>Duration</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {run.sources.map((b) => (
                <tr key={b.id}>
                  <td>{b.sourceName}</td>
                  <td>{sourceStatusBadge(b.status)}</td>
                  <td>{b.jobsFound}</td>
                  <td>{b.jobsNew}</td>
                  <td>{duration(b.startedAt, b.finishedAt)}</td>
                  <td>
                    {b.errorMsg && (
                      <details>
                        <summary style={{ cursor: 'pointer', fontSize: 12 }}>Details</summary>
                        <pre className="error-pre">{b.errorMsg}</pre>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
