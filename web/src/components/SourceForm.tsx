import { useState } from 'react';
import { ApiSource, AnalyzeResult, PreviewResult } from '../types';
import TagSelect from './TagSelect';
import { useTagsData } from '../hooks';

interface SourceFormProps {
  initial?: Partial<ApiSource>;
  onSubmit: (source: Omit<ApiSource, 'id'>) => Promise<void>;
  onCancel: () => void;
}

const SELECTOR_FIELDS = [
  { key: 'jobCard', label: 'Job Card Container', required: true, placeholder: '.job-listing' },
  { key: 'title', label: 'Job Title', required: true, placeholder: 'h2.job-title' },
  { key: 'link', label: 'Job Link (a tag)', required: true, placeholder: 'a.apply-link' },
  { key: 'nextPage', label: 'Next Page / Load More Button', required: false, placeholder: 'button[aria-label="Next"]' },
] as const;

type SKey = (typeof SELECTOR_FIELDS)[number]['key'];

function toSelectorRecord(s: Record<SKey, string>): Record<string, string | null> {
  return {
    jobCard: s.jobCard,
    title: s.title,
    link: s.link,
    nextPage: s.nextPage.trim() || null,
  };
}

function fromInitialSelectors(sel?: Record<string, string | null>): Record<SKey, string> {
  return {
    jobCard: sel?.jobCard ?? '',
    title: sel?.title ?? '',
    link: sel?.link ?? '',
    nextPage: sel?.nextPage ?? '',
  };
}

export default function SourceForm({ initial, onSubmit, onCancel }: SourceFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [company, setCompany] = useState(initial?.company ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [selectedTags, setSelectedTags] = useState<string[]>(
    (initial?.tags ?? []).map((t) => t.id)
  );
  const [url, setUrl] = useState(initial?.url ?? '');
  const [analyzeUrl, setAnalyzeUrl] = useState(initial?.analyzeUrl ?? '');

  const { data: allTags } = useTagsData();
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
  const [aiResult, setAiResult] = useState<AnalyzeResult | null>(null);

  // Preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);

  // Save override for failed validation
  const [failOverride, setFailOverride] = useState(false);

  function setSelector(key: SKey, val: string) {
    setSelectors((prev) => ({ ...prev, [key]: val }));
    setPreviewResult(null);
  }

  async function runAnalyze() {
    if (!url.trim()) {
      setAiError('Enter a Scrape URL first');
      return;
    }
    setAiLoading(true);
    setAiError('');
    setAiResult(null);
    setFailOverride(false);
    try {
      const res = await fetch('/api/setup/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          url: url.trim(),
          analyzeUrl: analyzeUrl.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setAiError(body.error ?? 'AI analysis failed');
        return;
      }
      const result = body as AnalyzeResult;
      setAiResult(result);
      if (!name && result.name) setName(result.name);

      // Auto-apply the validated best selectors
      if (result.selectors) {
        setSelectors({
          jobCard: (result.selectors.jobCard as string) ?? '',
          title: (result.selectors.title as string) ?? '',
          link: (result.selectors.link as string) ?? '',
          nextPage: (result.selectors.nextPage as string) ?? '',
        });
      }
      if (result.pagination) {
        const pt = result.pagination.type as string;
        if (pt) setPaginationType(pt);
        if (result.pagination.urlTemplate) setUrlTemplate(result.pagination.urlTemplate as string);
      }
      setPreviewResult(null);
    } catch (err: any) {
      setAiError(err.message ?? 'Network error');
    } finally {
      setAiLoading(false);
    }
  }

  function buildPagination(): Record<string, unknown> | undefined {
    if (!paginationType) return undefined;
    if (paginationType === 'url') {
      return { type: 'url', urlTemplate: urlTemplate.trim() || undefined, maxPages: 10 };
    }
    return { type: paginationType, maxPages: 10, delayMs: 500 };
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

  const validationStatus = aiResult?.validation?.status;
  const canSave = validationStatus !== 'fail' || failOverride;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!company.trim()) {
      setError('Company is required');
      return;
    }
    if (!location.trim()) {
      setError('Location is required');
      return;
    }
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
        ...(analyzeUrl.trim() ? { analyzeUrl: analyzeUrl.trim() } : {}),
        ...(company.trim() ? { company: company.trim() } : {}),
        ...(location.trim() ? { location: location.trim() } : {}),
        tags: (allTags ?? []).filter((t) => selectedTags.includes(t.id)),
        tagIds: selectedTags,
        selectors: toSelectorRecord(selectors),
        ...(pagination ? { pagination } : {}),
      } as any);
    } catch (err: any) {
      setError(err.message ?? 'Failed to save source');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="source-form" onSubmit={handleSubmit}>
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
        Tags
        <div style={{ marginTop: 4 }}>
          <TagSelect
            selected={selectedTags}
            onChange={setSelectedTags}
            tags={allTags ?? []}
          />
        </div>
      </label>

      <label className="form-label">
        Company <span className="required-star">*</span>
        <input
          className="input"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Uber"
          required
        />
      </label>

      <label className="form-label">
        Location <span className="required-star">*</span>
        <input
          className="input"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Toronto, ON"
          required
        />
      </label>

      {/* Scrape URL + Analyze & Auto-Test */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <label className="form-label" style={{ flex: 1 }}>
          Scrape URL <span className="required-star">*</span>
          <input
            className="input"
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setPreviewResult(null);
              setAiResult(null);
              setFailOverride(false);
            }}
            required
          />
        </label>
        <button
          type="button"
          className="button button-secondary"
          style={{ flexShrink: 0, marginBottom: 1 }}
          onClick={runAnalyze}
          disabled={aiLoading || !url.trim()}
          title="AI will propose selector candidates, test all combinations, and return the best validated config"
        >
          {aiLoading ? 'Analyzing & Testing...' : 'Analyze & Auto-Test'}
        </button>
      </div>

      <label className="form-label">
        Analyze URL <span className="muted">(optional — broader page for pagination/structure discovery)</span>
        <input
          className="input"
          type="url"
          value={analyzeUrl}
          onChange={(e) => {
            setAnalyzeUrl(e.target.value);
            setAiResult(null);
            setFailOverride(false);
          }}
          placeholder="https://example.com/careers (unfiltered listing page)"
        />
      </label>

      {aiError && <p className="error">{aiError}</p>}

      {/* Validation report */}
      {aiResult?.validation && (
        <div className={`ai-suggestions-panel validation-${aiResult.validation.status}`}>
          <div className="ai-suggestions-header">
            <span>
              Validation Report
              <span style={{ marginLeft: 8, fontWeight: 'normal', fontSize: '0.85em' }}>
                — Score: {aiResult.validation.score}/100
                {' '}({aiResult.validation.status.toUpperCase()})
              </span>
            </span>
          </div>
          <div className="ai-suggestions-body">
            <div className="ai-suggestion-row">
              <span className="ai-suggestion-label">Jobs found</span>
              <code className="ai-suggestion-value">{aiResult.validation.jobsFound}</code>
            </div>
            <div className="ai-suggestion-row">
              <span className="ai-suggestion-label">Unique URL ratio</span>
              <code className="ai-suggestion-value">{(aiResult.validation.uniqueUrlRatio * 100).toFixed(0)}%</code>
            </div>
            <div className="ai-suggestion-row">
              <span className="ai-suggestion-label">Title quality</span>
              <code className="ai-suggestion-value">{(aiResult.validation.titleNonEmptyRatio * 100).toFixed(0)}%</code>
            </div>
            {aiResult.validation.reasons.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {aiResult.validation.reasons.map((reason, i) => (
                  <p key={i} className="error" style={{ margin: '2px 0', fontSize: '0.85em' }}>{reason}</p>
                ))}
              </div>
            )}
            {aiResult.validation.status === 'fail' && (
              <div style={{ marginTop: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85em' }}>
                  <input
                    type="checkbox"
                    checked={failOverride}
                    onChange={(e) => setFailOverride(e.target.checked)}
                  />
                  I understand the validation failed — save anyway
                </label>
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
            {previewLoading ? 'Scraping...' : 'Preview Scrape'}
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
                      <th>URL</th>
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
                        <td className="muted" style={{ fontSize: '0.85em', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {job.url}
                        </td>
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
        <button className="button" type="submit" disabled={submitting || !canSave}>
          {submitting ? 'Saving...' : 'Save'}
        </button>
        <button className="button button-secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
