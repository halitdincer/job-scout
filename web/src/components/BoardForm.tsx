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
  { key: 'location', label: 'Location', required: false, placeholder: '.job-location' },
  { key: 'nextPage', label: 'Next Page / Load More Button', required: false, placeholder: 'button[aria-label="Next"]' },
] as const;

type SKey = (typeof SELECTOR_FIELDS)[number]['key'];

function toSelectorRecord(s: Record<SKey, string>): Record<string, string | null> {
  return {
    jobCard: s.jobCard,
    title: s.title,
    link: s.link,
    location: s.location.trim() || null,
    nextPage: s.nextPage.trim() || null,
  };
}

function fromInitialSelectors(sel?: Record<string, string | null>): Record<SKey, string> {
  return {
    jobCard: sel?.jobCard ?? '',
    title: sel?.title ?? '',
    link: sel?.link ?? '',
    location: sel?.location ?? '',
    nextPage: sel?.nextPage ?? '',
  };
}

export default function BoardForm({ initial, onSubmit, onCancel }: BoardFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [company, setCompany] = useState(initial?.company ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [selectors, setSelectors] = useState<Record<SKey, string>>(
    fromInitialSelectors(initial?.selectors)
  );
  const [paginationType, setPaginationType] = useState<string>(
    (initial?.pagination?.type as string) ?? ''
  );
  const [urlTemplate, setUrlTemplate] = useState<string>(
    (initial?.pagination as any)?.urlTemplate ?? ''
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

  function buildPagination(): Record<string, unknown> | undefined {
    if (!paginationType) return undefined;
    if (paginationType === 'url') {
      return { type: 'url', urlTemplate: urlTemplate.trim() || undefined, maxPages: 10 };
    }
    return { type: paginationType, maxPages: 10, delayMs: 500 };
  }

  function applyPaginationSuggestion(pagination: Record<string, unknown>) {
    const pt = pagination.type as string;
    if (pt) setPaginationType(pt);
    if (pagination.urlTemplate) setUrlTemplate(pagination.urlTemplate as string);
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
    if (aiSuggestions.pagination && !paginationType) {
      applyPaginationSuggestion(aiSuggestions.pagination);
    }
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
      const pagination = buildPagination();
      const res = await fetch('/api/setup/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          url: url.trim(),
          selectors: toSelectorRecord(selectors),
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
    const pagination = buildPagination();
    setSubmitting(true);
    try {
      await onSubmit({
        name,
        url,
        ...(company.trim() ? { company: company.trim() } : {}),
        selectors: toSelectorRecord(selectors),
        ...(pagination ? { pagination } : {}),
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
        Company
        <input
          className="input"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Uber"
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
            <span>
              AI Suggestions
              {aiSuggestions.jobsFound !== undefined && (
                <span style={{ marginLeft: 8, fontWeight: 'normal', fontSize: '0.85em' }}>
                  {aiSuggestions.jobsFound > 0
                    ? `— validated: ${aiSuggestions.jobsFound} job${aiSuggestions.jobsFound !== 1 ? 's' : ''} found`
                    : '— 0 jobs found, selectors may need adjustment'}
                </span>
              )}
            </span>
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
            {aiSuggestions.pagination?.type && (
              <div className="ai-suggestion-row">
                <span className="ai-suggestion-label">Pagination type</span>
                <code className="ai-suggestion-value">{String(aiSuggestions.pagination.type)}</code>
                <button
                  type="button"
                  className="button button-secondary button-small"
                  onClick={() => setPaginationType(String(aiSuggestions.pagination!.type))}
                >
                  Apply
                </button>
              </div>
            )}
            {aiSuggestions.pagination?.type === 'url' && aiSuggestions.pagination.urlTemplate && (
              <div className="ai-suggestion-row">
                <span className="ai-suggestion-label">URL template</span>
                <code className="ai-suggestion-value">{String(aiSuggestions.pagination.urlTemplate)}</code>
                <button
                  type="button"
                  className="button button-secondary button-small"
                  onClick={() => setUrlTemplate(String(aiSuggestions.pagination!.urlTemplate))}
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
        Pagination type
        <select
          className="input"
          value={paginationType}
          onChange={(e) => setPaginationType(e.target.value)}
        >
          <option value="">None</option>
          <option value="show-more">Load More / Show More (appends without navigating)</option>
          <option value="click">Next Page (navigates or reloads)</option>
          <option value="url">URL-based (?page=N, &offset=N)</option>
        </select>
      </label>

      {paginationType === 'url' && (
        <label className="form-label">
          URL template
          <input
            className="input"
            value={urlTemplate}
            onChange={(e) => setUrlTemplate(e.target.value)}
            placeholder="https://example.com/jobs?page={page}"
          />
        </label>
      )}

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
