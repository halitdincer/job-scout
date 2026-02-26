import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const [deletedBoards, setDeletedBoards] = useState<ApiBoard[]>([]);
  const [view, setView] = useState<View>('list');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    fetch('/api/boards/deleted', { credentials: 'include' })
      .then((res) => res.ok ? res.json() : Promise.resolve([]))
      .then((payload) => setDeletedBoards(Array.isArray(payload) ? (payload as ApiBoard[]) : []))
      .catch(() => setDeletedBoards([]));
  }, []);

  if (boards.error) {
    return <div className="card">Failed to load board data.</div>;
  }

  const boardJobs = new Map<string, number>();
  jobs.data?.jobs.forEach((job) => {
    boardJobs.set(job.board, (boardJobs.get(job.board) ?? 0) + 1);
  });

  const activeBoards = (boards.data ?? []).filter((b) => (b.state ?? 'active') === 'active');
  const inactiveBoards = (boards.data ?? []).filter((b) => b.state === 'inactive');

  async function refreshLists() {
    try {
      boards.refresh();
      const deletedRes = await fetch('/api/boards/deleted', { credentials: 'include' });
      if (deletedRes?.ok) {
        const payload = await deletedRes.json();
        setDeletedBoards(Array.isArray(payload) ? (payload as ApiBoard[]) : []);
      }
    } catch {
      setDeletedBoards([]);
    }
  }

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
    await refreshLists();
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
    await refreshLists();
    setView('list');
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete board "${name}"? It will move to Deleted Boards.`)) return;
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
    await refreshLists();
  }

  async function handleToggle(id: string) {
    setActionError('');
    const res = await fetch(`/api/boards/${id}/toggle`, { method: 'POST', credentials: 'include' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setActionError(body.error ?? 'Failed to change board state');
      return;
    }
    await refreshLists();
  }

  async function handleRestore(id: string) {
    setActionError('');
    const res = await fetch(`/api/boards/${id}/restore`, { method: 'POST', credentials: 'include' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setActionError(body.error ?? 'Failed to restore board');
      return;
    }
    await refreshLists();
  }

  async function handleDuplicate(id: string) {
    setActionError('');
    const res = await fetch(`/api/boards/${id}/duplicate`, { method: 'POST', credentials: 'include' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setActionError(body.error ?? 'Failed to duplicate board');
      return;
    }
    await refreshLists();
  }

  function renderBoardCard(board: ApiBoard, opts: { deleted?: boolean } = {}) {
    return (
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

        <div className="card-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Link className="button button-small button-secondary" to={`/boards/${board.id}`}>View</Link>
          <button className="button button-small" onClick={() => setView({ type: 'edit', board })}>Edit</button>
          <button className="button button-small button-secondary" onClick={() => handleDuplicate(board.id)}>Duplicate</button>

          {!opts.deleted && (
            <button
              className="button button-small button-secondary"
              onClick={() => handleToggle(board.id)}
            >
              {(board.state ?? 'active') === 'active' ? 'Set inactive' : 'Set active'}
            </button>
          )}

          {!opts.deleted && (
            <button className="button button-small button-danger" onClick={() => handleDelete(board.id, board.name)}>
              Delete
            </button>
          )}

          {opts.deleted && (
            <button className="button button-small" onClick={() => handleRestore(board.id)}>
              Restore
            </button>
          )}
        </div>
      </div>
    );
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

      <section className="stack">
        <h3>Active Boards</h3>
        <div className="grid">
          {activeBoards.map((board) => renderBoardCard(board))}
          {activeBoards.length === 0 && !boards.loading && <p className="muted">No active boards.</p>}
        </div>
      </section>

      <section className="stack">
        <h3>Inactive Boards</h3>
        <div className="grid">
          {inactiveBoards.map((board) => renderBoardCard(board))}
          {inactiveBoards.length === 0 && !boards.loading && <p className="muted">No inactive boards.</p>}
        </div>
      </section>

      <section className="stack">
        <h3>Deleted Boards</h3>
        <div className="grid">
          {deletedBoards.map((board) => renderBoardCard(board, { deleted: true }))}
          {deletedBoards.length === 0 && <p className="muted">No deleted boards.</p>}
        </div>
      </section>
    </div>
  );
}
