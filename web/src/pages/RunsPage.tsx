import { useState } from 'react';
import { useBoardsData, useRunsData } from '../hooks';
import { Run } from '../types';

function statusBadge(status: Run['status']) {
  const styles: Record<Run['status'], string> = {
    success: 'badge badge-success',
    error: 'badge badge-error',
    running: 'badge badge-running',
  };
  return <span className={styles[status]}>{status}</span>;
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
  const boards = useBoardsData();
  const [filterBoardId, setFilterBoardId] = useState('');
  const runs = useRunsData(filterBoardId || undefined);

  const boardMap = new Map((boards.data ?? []).map((b) => [b.id, b.name]));

  return (
    <div className="stack">
      <div className="row-between">
        <h2>Scrape Runs</h2>
        <select
          className="input input-select"
          value={filterBoardId}
          onChange={(e) => setFilterBoardId(e.target.value)}
        >
          <option value="">All boards</option>
          {(boards.data ?? []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {runs.error && <p className="error">Failed to load runs: {runs.error}</p>}

      {runs.loading && <p className="muted">Loading…</p>}

      {!runs.loading && (runs.data ?? []).length === 0 && (
        <p className="muted">No runs yet. Scrapes happen automatically every 6 hours.</p>
      )}

      {!runs.loading && (runs.data ?? []).length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Board</th>
                <th>Started</th>
                <th>Duration</th>
                <th>Found</th>
                <th>New</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(runs.data ?? []).map((run) => (
                <tr key={run.id}>
                  <td>{boardMap.get(run.boardId) ?? run.boardId}</td>
                  <td>{formatDate(run.startedAt)}</td>
                  <td>{duration(run.startedAt, run.finishedAt)}</td>
                  <td>{run.jobsFound}</td>
                  <td>{run.jobsNew}</td>
                  <td>
                    {statusBadge(run.status)}
                    {run.errorMsg && (
                      <details>
                        <summary>Details</summary>
                        <pre className="error-pre">{run.errorMsg}</pre>
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
