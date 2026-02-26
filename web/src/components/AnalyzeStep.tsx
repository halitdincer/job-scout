import { useState } from 'react';
import { AnalyzeResult } from '../types';

interface AnalyzeStepProps {
  onAnalyzed: (result: AnalyzeResult) => void;
  onSkip: () => void;
  onCancel: () => void;
}

export default function AnalyzeStep({ onAnalyzed, onSkip, onCancel }: AnalyzeStepProps) {
  const [url, setUrl] = useState('');
  const [analyzeUrl, setAnalyzeUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);
    setAnalyzing(true);
    try {
      const res = await fetch('/api/setup/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          url,
          analyzeUrl: analyzeUrl.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? 'Analysis failed');
        return;
      }
      setResult(body as AnalyzeResult);
    } catch (err: any) {
      setError(err.message ?? 'Network error');
    } finally {
      setAnalyzing(false);
    }
  }

  if (result) {
    const v = result.validation;
    return (
      <div className="stack">
        <h3>AI Analysis Result</h3>
        <p>
          <strong>Source name:</strong> {result.name}
        </p>
        <p>
          <strong>URL:</strong> {result.url}
        </p>
        <div className="card">
          <h4>Validated selectors</h4>
          <pre className="selector-pre">{JSON.stringify(result.selectors, null, 2)}</pre>
          <h4>Validation</h4>
          <p>
            Score: <strong>{v.score}/100</strong> ({v.status.toUpperCase()})
            — {v.jobsFound} jobs found,{' '}
            {(v.uniqueUrlRatio * 100).toFixed(0)}% unique URLs,{' '}
            {(v.titleNonEmptyRatio * 100).toFixed(0)}% valid titles
          </p>
          {v.reasons.length > 0 && (
            <ul>
              {v.reasons.map((r, i) => (
                <li key={i} className="error">{r}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="form-actions">
          <button className="button" onClick={() => onAnalyzed(result)}>
            Use these selectors
          </button>
          <button className="button button-secondary" onClick={() => setResult(null)}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <h3>AI-Assisted Source Setup</h3>
      <p className="muted">
        Paste the URL of a job source. AI will propose selector candidates, test all combinations, and return the best validated config.
      </p>
      <form onSubmit={handleAnalyze} className="stack">
        {error && <p className="error">{error}</p>}
        <label className="form-label">
          Job source URL (scrape target)
          <input
            className="input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/careers?filter=engineering"
            required
          />
        </label>
        <label className="form-label">
          Analyze URL <span className="muted">(optional — broader page for structure discovery)</span>
          <input
            className="input"
            type="url"
            value={analyzeUrl}
            onChange={(e) => setAnalyzeUrl(e.target.value)}
            placeholder="https://example.com/careers (unfiltered)"
          />
        </label>
        <div className="form-actions">
          <button className="button" type="submit" disabled={analyzing}>
            {analyzing ? 'Analyzing & Testing...' : 'Analyze & Auto-Test'}
          </button>
          <button className="button button-secondary" type="button" onClick={onSkip}>
            Skip — enter manually
          </button>
          <button className="button button-secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
