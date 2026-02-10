import { useState } from 'react';
import { AnalyzeResult } from '../types';

interface AnalyzeStepProps {
  onAnalyzed: (result: AnalyzeResult) => void;
  onSkip: () => void;
  onCancel: () => void;
}

export default function AnalyzeStep({ onAnalyzed, onSkip, onCancel }: AnalyzeStepProps) {
  const [url, setUrl] = useState('');
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
        body: JSON.stringify({ url }),
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
    return (
      <div className="stack">
        <h3>AI Analysis Result</h3>
        <p>
          <strong>Board name:</strong> {result.name}
        </p>
        <p>
          <strong>URL:</strong> {result.url}
        </p>
        <div className="card">
          <h4>Detected selectors</h4>
          <pre className="selector-pre">{JSON.stringify(result.selectors, null, 2)}</pre>
          {result.waitForSelector && (
            <p>
              <strong>Wait for:</strong> <code>{result.waitForSelector}</code>
            </p>
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
      <h3>AI-Assisted Board Setup</h3>
      <p className="muted">
        Paste the URL of a job board and the AI will detect the CSS selectors automatically.
      </p>
      <form onSubmit={handleAnalyze} className="stack">
        {error && <p className="error">{error}</p>}
        <label className="form-label">
          Job board URL
          <input
            className="input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/careers"
            required
          />
        </label>
        <div className="form-actions">
          <button className="button" type="submit" disabled={analyzing}>
            {analyzing ? 'Analyzing…' : 'Analyze'}
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
