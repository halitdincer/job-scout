import { useState } from 'react';
import { ApiBoard, AnalyzeResult, PreviewResult } from '../types';

interface BoardFormProps {
  initial?: Partial<ApiBoard>;
  onSubmit: (board: Omit<ApiBoard, 'id'>) => Promise<void>;
  onCancel: () => void;
}

const SELECTOR_FIELDS = [
  { key: 'jobCard', label: 'Job Card Container', required: true, placeholder: '.job-listing' },
  { key: 'title', label: 'Job Title', required: true, placeholder: 'h2.job-title' },
  { key: 'link', label: 'Job Link (a tag)', required: true, placeholder: 'a.apply-link' },
  { key: 'company', label: 'Company', required: false, placeholder: '.company-name' },
  { key: 'location', label: 'Location', required: false, placeholder: '.job-location' },
  { key: 'postedDate', label: 'Posted Date', required: false, placeholder: 'time.posted' },
] as const;

type SKey = (typeof SELECTOR_FIELDS)[number]['key'];

function toSelectorRecord(s: Record<SKey, string>): Record<string, string | null> {
  return {
    jobCard: s.jobCard,
    title: s.title,
    link: s.link,
    company: s.company.trim() || null,
    location: s.location.trim() || null,
    postedDate: s.postedDate.trim() || null,
  };
}

function fromInitialSelectors(sel?: Record<string, string | null>): Record<SKey, string> {
  return {
    jobCard: sel?.jobCard ?? '',
    title: sel?.title ?? '',
    link: sel?.link ?? '',
    company: sel?.company ?? '',
    location: sel?.location ?? '',
    postedDate: sel?.postedDate ?? '',
  };
}

export default function BoardForm({ initial, onSubmit, onCancel }: BoardFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [selectors, setSelectors] = useState<Record<SKey, string>>(
    fromInitialSelectors(initial?.selectors)
  );
  const [waitForSelector, setWaitForSelector] = useState(initial?.waitForSelector ?? '');
  const [paginationText, setPaginationText] = useState(
    initial?.pagination ? JSON.stringify(initial.pagination, null, 2) : ''
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<AnalyzeResult | null>(null);

  // Preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);

  function setSelector(key: SKey, val: string) {
    setSelectors((prev) => ({ ...prev, [key]: val }));
    setPreviewResult(null);
  }

  async function runAi() {
    if (!url.trim()) {
      setAiError('Enter a URL first');
      return;
    }
    setAiLoading(true);
    setAiError('');
    setAiSuggestions(null);
    try {
      const res = await fetch('/api/setup/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url: url.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        setAiError(body.error ?? 'AI analysis failed');
        return;
      }
      setAiSuggestions(body as AnalyzeResult);
      if (!name && body.name) setName(body.name);
    } catch (err: any) {
      setAiError(err.message ?? 'Network error');
    } finally {
      setAiLoading(false);
    }
  }

  function applyOne(key: SKey) {
    const val = aiSuggestions?.selectors?.[key];
    if (val) {
      setSelectors((prev) => ({ ...prev, [key]: val }));
      setPreviewResult(null);
    }
  }

  function applyAll() {
    if (!aiSuggestions?.selectors) return;
    setSelectors((prev) => {
      const next = { ...prev };
      for (const f of SELECTOR_FIELDS) {
        const v = aiSuggestions.selectors[f.key];
        if (v) next[f.key] = v;
      }
      return next;
    });
    if (aiSuggestions.waitForSelector) setWaitForSelector(aiSuggestions.waitForSelector);
    setPreviewResult(null);
  }

  async function runPreview() {
    if (!url.trim() || !selectors.jobCard.trim() || !selectors.title.trim()) {
      setPreviewError('URL, Job Card, and Title selectors are required to preview');
      return;
    }
    setPreviewLoading(true);
    setPreviewError('');
    setPreviewResult(null);
    try {
      let pagination: Record<string, unknown> | undefined;
      if (paginationText.trim()) {
        try {
          pagination = JSON.parse(paginationText);
        } catch {
          setPreviewError('Pagination JSON is invalid');
          setPreviewLoading(false);
          return;
        }
      }
      const res = await fetch('/api/setup/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          url: url.trim(),
          selectors: toSelectorRecord(selectors),
          ...(waitForSelector.trim() ? { waitForSelector: waitForSelector.trim() } : {}),
          ...(pagination ? { pagination } : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setPreviewError(body.error ?? 'Preview failed');
        return;
      }
      setPreviewResult(body as PreviewResult);
    } catch (err: any) {
      setPreviewError(err.message ?? 'Network error');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!selectors.jobCard.trim() || !selectors.title.trim() || !selectors.link.trim()) {
      setError('Job Card, Title, and Link selectors are required');
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
        selectors: toSelectorRecord(selectors),
        ...(pagination ? { pagination } : {}),
        ...(waitForSelector.trim() ? { waitForSelector: waitForSelector.trim() } : {}),
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

      {/* URL + Run AI */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <label className="form-label" style={{ flex: 1 }}>
          URL
          <input
            className="input"
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setPreviewResult(null);
              setAiSuggestions(null);
            }}
            required
          />
        </label>
        <button
          type="button"
          className="button button-secondary"
          style={{ flexShrink: 0, marginBottom: 1 }}
          onClick={runAi}
          disabled={aiLoading || !url.trim()}
          title="Ask AI to suggest CSS selectors for this URL"
        >
          {aiLoading ? 'Analyzing…' : 'Run AI'}
        </button>
      </div>

      {aiError && <p className="error">{aiError}</p>}

      {/* AI suggestions panel */}
      {aiSuggestions && (
        <div className="ai-suggestions-panel">
          <div className="ai-suggestions-header">
            <span>AI Suggestions</span>
            <button type="button" className="button button-small" onClick={applyAll}>
              Apply All
            </button>
          </div>
          <div className="ai-suggestions-body">
            {SELECTOR_FIELDS.map((f) => {
              const val = aiSuggestions.selectors[f.key];
              if (!val) return null;
              return (
                <div key={f.key} className="ai-suggestion-row">
                  <span className="ai-suggestion-label">{f.label}</span>
                  <code className="ai-suggestion-value">{val}</code>
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => applyOne(f.key)}
                  >
                    Apply
                  </button>
                </div>
              );
            })}
            {aiSuggestions.waitForSelector && (
              <div className="ai-suggestion-row">
                <span className="ai-suggestion-label">Wait-for selector</span>
                <code className="ai-suggestion-value">{aiSuggestions.waitForSelector}</code>
                <button
                  type="button"
                  className="button button-secondary button-small"
                  onClick={() => setWaitForSelector(aiSuggestions.waitForSelector!)}
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selector inputs */}
      <fieldset className="selectors-fieldset">
        <legend>Selectors</legend>
        {SELECTOR_FIELDS.map((field) => (
          <div key={field.key} className="selector-field">
            <label className="form-label">
              {field.label}
              {field.required && <span className="required-star"> *</span>}
              <input
                className="input"
                value={selectors[field.key]}
                onChange={(e) => setSelector(field.key, e.target.value)}
                placeholder={field.placeholder}
              />
            </label>
          </div>
        ))}
      </fieldset>

      <label className="form-label">
        Wait-for selector (optional)
        <input
          className="input"
          value={waitForSelector}
          onChange={(e) => setWaitForSelector(e.target.value)}
          placeholder=".jobs-container"
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

      {/* Preview */}
      <div className="preview-section">
        <div className="row-between">
          <span className="form-section-title">Test selectors</span>
          <button
            type="button"
            className="button button-secondary"
            onClick={runPreview}
            disabled={previewLoading || !url.trim() || !selectors.jobCard.trim()}
          >
            {previewLoading ? 'Scraping…' : 'Preview Scrape'}
          </button>
        </div>

        {previewError && <p className="error">{previewError}</p>}

        {previewResult && (
          <div className="preview-results">
            <p className="preview-count">
              {previewResult.total === 0
                ? 'No jobs found — check your selectors'
                : `${previewResult.total} job${previewResult.total !== 1 ? 's' : ''} found${previewResult.total > 10 ? ' (showing first 10)' : ''}`}
            </p>
            {previewResult.jobs.length > 0 && (
              <div className="table-wrap">
                <table className="table table-compact">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Company</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewResult.jobs.map((job, i) => (
                      <tr key={i}>
                        <td>
                          <a href={job.url} target="_blank" rel="noreferrer">
                            {job.title}
                          </a>
                        </td>
                        <td>{job.company}</td>
                        <td>{job.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

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
