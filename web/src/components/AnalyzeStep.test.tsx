import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AnalyzeStep from './AnalyzeStep';

const defaultProps = {
  onAnalyzed: vi.fn(),
  onSkip: vi.fn(),
  onCancel: vi.fn(),
};

describe('AnalyzeStep', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders URL input and Analyze button', () => {
    render(<AnalyzeStep {...defaultProps} />);
    expect(screen.getAllByRole('textbox').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument();
  });

  it('calls POST /api/setup/analyze on submit and displays returned selectors', async () => {
    const analyzeResult = {
      url: 'https://example.com/jobs',
      name: 'Test Source',
      selectors: { jobCard: '.job', title: '.title', link: 'a' },
      validation: { score: 80, status: 'pass', jobsFound: 10, uniqueUrlRatio: 1, titleNonEmptyRatio: 1, reasons: [] },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(analyzeResult),
    }));

    render(<AnalyzeStep {...defaultProps} />);

    const urlInput = screen.getAllByRole('textbox')[0];
    fireEvent.change(urlInput, { target: { value: 'https://example.com/jobs' } });
    fireEvent.submit(urlInput.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('AI Analysis Result')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith('/api/setup/analyze', expect.objectContaining({ method: 'POST' }));
  });

  it('shows error on 502 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'AI did not return a tool call' }),
    }));

    render(<AnalyzeStep {...defaultProps} />);

    const urlInput = screen.getAllByRole('textbox')[0];
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
    fireEvent.submit(urlInput.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('AI did not return a tool call')).toBeInTheDocument();
    });
  });

  it('"Skip" button calls onSkip', () => {
    render(<AnalyzeStep {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /skip/i }));
    expect(defaultProps.onSkip).toHaveBeenCalled();
  });

  it('"Cancel" button calls onCancel', () => {
    render(<AnalyzeStep {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });
});
