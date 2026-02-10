import { useState } from 'react';
import { ApiBoard } from '../types';

interface BoardFormProps {
  initial?: Partial<ApiBoard>;
  onSubmit: (board: Omit<ApiBoard, 'id'>) => Promise<void>;
  onCancel: () => void;
}

const BLANK_SELECTORS = JSON.stringify(
  { jobCard: '', title: '', location: '', link: '', company: null, postedDate: null },
  null,
  2
);

export default function BoardForm({ initial, onSubmit, onCancel }: BoardFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [selectorsText, setSelectorsText] = useState(
    initial?.selectors ? JSON.stringify(initial.selectors, null, 2) : BLANK_SELECTORS
  );
  const [paginationText, setPaginationText] = useState(
    initial?.pagination ? JSON.stringify(initial.pagination, null, 2) : ''
  );
  const [waitForSelector, setWaitForSelector] = useState(initial?.waitForSelector ?? '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    let selectors: Record<string, string | null>;
    try {
      selectors = JSON.parse(selectorsText);
    } catch {
      setError('Selectors must be valid JSON');
      return;
    }

    let pagination: Record<string, unknown> | undefined;
    if (paginationText.trim()) {
      try {
        pagination = JSON.parse(paginationText);
      } catch {
        setError('Pagination must be valid JSON');
        return;
      }
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name,
        url,
        selectors,
        ...(pagination ? { pagination } : {}),
        ...(waitForSelector ? { waitForSelector } : {}),
      });
    } catch (err: any) {
      setError(err.message ?? 'Failed to save board');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="board-form" onSubmit={handleSubmit}>
      {error && <p className="error">{error}</p>}

      <label className="form-label">
        Name
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>

      <label className="form-label">
        URL
        <input
          className="input"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
      </label>

      <label className="form-label">
        Selectors (JSON)
        <textarea
          className="input textarea"
          value={selectorsText}
          onChange={(e) => setSelectorsText(e.target.value)}
          rows={8}
          required
        />
      </label>

      <label className="form-label">
        Pagination (JSON, optional)
        <textarea
          className="input textarea"
          value={paginationText}
          onChange={(e) => setPaginationText(e.target.value)}
          rows={4}
        />
      </label>

      <label className="form-label">
        Wait-for selector (optional)
        <input
          className="input"
          value={waitForSelector}
          onChange={(e) => setWaitForSelector(e.target.value)}
        />
      </label>

      <div className="form-actions">
        <button className="button" type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </button>
        <button className="button button-secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
