import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSourcesData, useJobsData } from '../hooks';
import SourceForm from '../components/SourceForm';
import { ApiSource } from '../types';

function lastRunBadge(lastRun: ApiSource['lastRun']) {
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

type View = 'list' | 'add' | { type: 'edit'; source: ApiSource };

export default function SourcesPage() {
  const sources = useSourcesData();
  const jobs = useJobsData();
  const [deletedSources, setDeletedSources] = useState<ApiSource[]>([]);
  const [view, setView] = useState<View>('list');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    fetch('/api/sources/deleted', { credentials: 'include' })
      .then((res) => res.ok ? res.json() : Promise.resolve([]))
      .then((payload) => setDeletedSources(Array.isArray(payload) ? (payload as ApiSource[]) : []))
      .catch(() => setDeletedSources([]));
  }, []);

  if (sources.error) {
    return <div className="card">Failed to load source data.</div>;
  }

  const sourceJobs = new Map<string, number>();
  jobs.data?.jobs.forEach((job) => {
    sourceJobs.set(job.source, (sourceJobs.get(job.source) ?? 0) + 1);
  });

  const activeSources = (sources.data ?? []).filter((b) => (b.state ?? 'active') === 'active');
  const inactiveSources = (sources.data ?? []).filter((b) => b.state === 'inactive');

  async function refreshLists() {
    try {
      sources.refresh();
      const deletedRes = await fetch('/api/sources/deleted', { credentials: 'include' });
      if (deletedRes?.ok) {
        const payload = await deletedRes.json();
        setDeletedSources(Array.isArray(payload) ? (payload as ApiSource[]) : []);
      }
    } catch {
      setDeletedSources([]);
    }
  }

  async function handleAdd(source: Omit<ApiSource, 'id'>) {
    const res = await fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(source),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Failed to add source');
    }
    await refreshLists();
    setView('list');
  }

  async function handleEdit(id: string, source: Omit<ApiSource, 'id'>) {
    const res = await fetch(`/api/sources/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(source),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Failed to update source');
    }
    await refreshLists();
    setView('list');
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete source "${name}"? It will move to Deleted Sources.`)) return;
    setActionError('');
    const res = await fetch(`/api/sources/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setActionError(body.error ?? 'Failed to delete source');
      return;
    }
    await refreshLists();
  }

  async function handleToggle(id: string) {
    setActionError('');
    const res = await fetch(`/api/sources/${id}/toggle`, { method: 'POST', credentials: 'include' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setActionError(body.error ?? 'Failed to change source state');
      return;
    }
    await refreshLists();
  }

  async function handleRestore(id: string) {
    setActionError('');
    const res = await fetch(`/api/sources/${id}/restore`, { method: 'POST', credentials: 'include' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setActionError(body.error ?? 'Failed to restore source');
      return;
    }
    await refreshLists();
  }

  async function handleDuplicate(id: string) {
    setActionError('');
    const res = await fetch(`/api/sources/${id}/duplicate`, { method: 'POST', credentials: 'include' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setActionError(body.error ?? 'Failed to duplicate source');
      return;
    }
    await refreshLists();
  }

  function renderSourceCard(source: ApiSource, opts: { deleted?: boolean } = {}) {
    return (
      <div key={source.id} className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3 style={{ margin: 0 }}>{source.name}</h3>
          {lastRunBadge(source.lastRun)}
        </div>
        {source.companyName && (
          <p className="muted" style={{ marginBottom: 2 }}>{source.companyName}</p>
        )}
        <p className="muted">{source.url}</p>
        {(source.tags ?? []).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
            {(source.tags ?? []).map((tag: { id: string; name: string; color: string }) => (
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
        <p className="stat">{sourceJobs.get(source.name) ?? 0} jobs</p>

        <div className="card-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Link className="button button-small button-secondary" to={`/sources/${source.id}`}>View</Link>
          <button className="button button-small" onClick={() => setView({ type: 'edit', source })}>Edit</button>
          <button className="button button-small button-secondary" onClick={() => handleDuplicate(source.id)}>Duplicate</button>

          {!opts.deleted && (
            <button
              className="button button-small button-secondary"
              onClick={() => handleToggle(source.id)}
            >
              {(source.state ?? 'active') === 'active' ? 'Set inactive' : 'Set active'}
            </button>
          )}

          {!opts.deleted && (
            <button className="button button-small button-danger" onClick={() => handleDelete(source.id, source.name)}>
              Delete
            </button>
          )}

          {opts.deleted && (
            <button className="button button-small" onClick={() => handleRestore(source.id)}>
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
        <h2>Add Source</h2>
        <SourceForm onSubmit={handleAdd} onCancel={() => setView('list')} />
      </div>
    );
  }

  if (typeof view === 'object' && view.type === 'edit') {
    return (
      <div className="stack">
        <h2>Edit Source</h2>
        <SourceForm
          initial={view.source}
          onSubmit={(source) => handleEdit(view.source.id, source)}
          onCancel={() => setView('list')}
        />
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row-between">
        <h2>Sources</h2>
        <button className="button" onClick={() => setView('add')}>
          + Add Source
        </button>
      </div>

      {actionError && <p className="error">{actionError}</p>}

      <section className="stack">
        <h3>Active Sources</h3>
        <div className="grid">
          {activeSources.map((source) => renderSourceCard(source))}
          {activeSources.length === 0 && !sources.loading && <p className="muted">No active sources.</p>}
        </div>
      </section>

      <section className="stack">
        <h3>Inactive Sources</h3>
        <div className="grid">
          {inactiveSources.map((source) => renderSourceCard(source))}
          {inactiveSources.length === 0 && !sources.loading && <p className="muted">No inactive sources.</p>}
        </div>
      </section>

      <section className="stack">
        <h3>Deleted Sources</h3>
        <div className="grid">
          {deletedSources.map((source) => renderSourceCard(source, { deleted: true }))}
          {deletedSources.length === 0 && <p className="muted">No deleted sources.</p>}
        </div>
      </section>
    </div>
  );
}
