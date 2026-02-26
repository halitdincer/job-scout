import { useState } from 'react';
import { useBoardsData, useJobsData } from '../hooks';
import BoardForm from '../components/BoardForm';
import { ApiBoard } from '../types';

function lastRunBadge(lastRun: ApiBoard['lastRun']) {
  if (!lastRun) return null;
  const cls: Record<string, string> = {
    success: 'badge badge-success',
    error: 'badge badge-error',
    running: 'badge badge-running',
    partial: 'badge badge-partial',
    pending: 'badge badge-pending',
  };
  return (
    <span className={cls[lastRun.status] ?? 'badge'} style={{ fontSize: 11 }}>
      {lastRun.status}
    </span>
  );
}

type View = 'list' | 'add' | { type: 'edit'; board: ApiBoard };

export default function BoardsPage() {
  const boards = useBoardsData();
  const jobs = useJobsData();
  const [view, setView] = useState<View>('list');
  const [actionError, setActionError] = useState('');

  if (boards.error) {
    return <div className="card">Failed to load board data.</div>;
  }

  const boardJobs = new Map<string, number>();
  jobs.data?.jobs.forEach((job) => {
    boardJobs.set(job.board, (boardJobs.get(job.board) ?? 0) + 1);
  });

  async function handleAdd(board: Omit<ApiBoard, 'id'>) {
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(board),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Failed to add board');
    }
    boards.refresh();
    setView('list');
  }

  async function handleEdit(id: string, board: Omit<ApiBoard, 'id'>) {
    const res = await fetch(`/api/boards/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(board),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Failed to update board');
    }
    boards.refresh();
    setView('list');
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete board "${name}"? This cannot be undone.`)) return;
    setActionError('');
    const res = await fetch(`/api/boards/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setActionError(body.error ?? 'Failed to delete board');
      return;
    }
    boards.refresh();
  }

  if (view === 'add') {
    return (
      <div className="stack">
        <h2>Add Board</h2>
        <BoardForm onSubmit={handleAdd} onCancel={() => setView('list')} />
      </div>
    );
  }

  if (typeof view === 'object' && view.type === 'edit') {
    return (
      <div className="stack">
        <h2>Edit Board</h2>
        <BoardForm
          initial={view.board}
          onSubmit={(board) => handleEdit(view.board.id, board)}
          onCancel={() => setView('list')}
        />
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row-between">
        <h2>Boards</h2>
        <button className="button" onClick={() => setView('add')}>
          + Add Board
        </button>
      </div>

      {actionError && <p className="error">{actionError}</p>}

      <div className="grid">
        {(boards.data ?? []).map((board) => (
          <div key={board.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ margin: 0 }}>{board.name}</h3>
              {lastRunBadge(board.lastRun)}
            </div>
            {board.companyName && (
              <p className="muted" style={{ marginBottom: 2 }}>{board.companyName}</p>
            )}
            <p className="muted">{board.url}</p>
            {(board.tags ?? []).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                {(board.tags ?? []).map((tag: { id: string; name: string; color: string }) => (
                  <span
                    key={tag.id}
                    className="tag-badge"
                    style={{ backgroundColor: tag.color, color: '#fff', fontSize: 11 }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
            <p className="stat">{boardJobs.get(board.name) ?? 0} jobs</p>
            <div className="card-actions">
              <button
                className="button button-small"
                onClick={() => setView({ type: 'edit', board })}
              >
                Edit
              </button>
              <button
                className="button button-small button-danger"
                onClick={() => handleDelete(board.id, board.name)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {(boards.data ?? []).length === 0 && !boards.loading && (
          <p className="muted">No boards yet. Add one to get started.</p>
        )}
      </div>
    </div>
  );
}
