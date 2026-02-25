import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RunDetailPage from './RunDetailPage';
import { ScrapeRunDetail } from '../types';

vi.mock('../hooks', () => ({
  useRunDetail: vi.fn(),
}));

import { useRunDetail } from '../hooks';

const now = new Date().toISOString();
const later = new Date(Date.now() + 12000).toISOString();

const sampleRun: ScrapeRunDetail = {
  id: 'r1',
  userId: 'u1',
  triggeredBy: 'manual',
  startedAt: now,
  finishedAt: later,
  status: 'success',
  boardsTotal: 2,
  boardsDone: 2,
  jobsFound: 15,
  jobsNew: 5,
  boards: [
    {
      id: 'rb1',
      runId: 'r1',
      boardId: 'b1',
      boardName: 'Acme Jobs',
      status: 'success',
      jobsFound: 10,
      jobsNew: 3,
      startedAt: now,
      finishedAt: later,
      errorMsg: null,
    },
    {
      id: 'rb2',
      runId: 'r1',
      boardId: 'b2',
      boardName: 'Fail Corp',
      status: 'error',
      jobsFound: 0,
      jobsNew: 0,
      startedAt: now,
      finishedAt: later,
      errorMsg: 'Timeout',
    },
  ],
};

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/runs/r1']}>
      <Routes>
        <Route path="/runs/:id" element={<RunDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RunDetailPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading state', () => {
    vi.mocked(useRunDetail).mockReturnValue({
      data: null, loading: true, error: null, refresh: vi.fn(),
    });
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error state', () => {
    vi.mocked(useRunDetail).mockReturnValue({
      data: null, loading: false, error: 'HTTP 500', refresh: vi.fn(),
    });
    renderPage();
    expect(screen.getByText(/failed to load run/i)).toBeInTheDocument();
    expect(screen.getByText(/HTTP 500/)).toBeInTheDocument();
  });

  it('shows "Run not found" when data is null after load', () => {
    vi.mocked(useRunDetail).mockReturnValue({
      data: null, loading: false, error: null, refresh: vi.fn(),
    });
    renderPage();
    expect(screen.getByText(/run not found/i)).toBeInTheDocument();
  });

  it('renders run status badge', () => {
    vi.mocked(useRunDetail).mockReturnValue({
      data: sampleRun, loading: false, error: null, refresh: vi.fn(),
    });
    renderPage();
    // Multiple 'success' elements exist (run badge + board badge) — verify at least one
    const successElements = screen.getAllByText('success');
    expect(successElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders triggeredBy', () => {
    vi.mocked(useRunDetail).mockReturnValue({
      data: sampleRun, loading: false, error: null, refresh: vi.fn(),
    });
    renderPage();
    expect(screen.getByText('manual')).toBeInTheDocument();
  });

  it('renders job totals', () => {
    vi.mocked(useRunDetail).mockReturnValue({
      data: sampleRun, loading: false, error: null, refresh: vi.fn(),
    });
    renderPage();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders board names in table', () => {
    vi.mocked(useRunDetail).mockReturnValue({
      data: sampleRun, loading: false, error: null, refresh: vi.fn(),
    });
    renderPage();
    expect(screen.getByText('Acme Jobs')).toBeInTheDocument();
    expect(screen.getByText('Fail Corp')).toBeInTheDocument();
  });

  it('renders board status badges', () => {
    vi.mocked(useRunDetail).mockReturnValue({
      data: sampleRun, loading: false, error: null, refresh: vi.fn(),
    });
    renderPage();
    const successBadges = screen.getAllByText('success');
    expect(successBadges.length).toBeGreaterThanOrEqual(2); // run badge + board badge
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it('failed board shows details element with error message', () => {
    vi.mocked(useRunDetail).mockReturnValue({
      data: sampleRun, loading: false, error: null, refresh: vi.fn(),
    });
    renderPage();
    expect(screen.getByText('Timeout')).toBeInTheDocument();
    // The error is wrapped in a <details>
    const detailsEl = document.querySelector('details');
    expect(detailsEl).not.toBeNull();
  });

  it('board with no error has no error text', () => {
    vi.mocked(useRunDetail).mockReturnValue({
      data: { ...sampleRun, boards: [sampleRun.boards[0]] },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    renderPage();
    expect(screen.queryByText('Timeout')).not.toBeInTheDocument();
    expect(document.querySelector('details')).toBeNull();
  });

  it('back link navigates to /runs', () => {
    vi.mocked(useRunDetail).mockReturnValue({
      data: sampleRun, loading: false, error: null, refresh: vi.fn(),
    });
    renderPage();
    const backLink = screen.getAllByText(/back to runs/i)[0];
    expect(backLink.closest('a')).toHaveAttribute('href', '/runs');
  });

  it('renders partial run status badge', () => {
    const partialRun: ScrapeRunDetail = {
      ...sampleRun,
      status: 'partial',
      boards: [
        { ...sampleRun.boards[0], status: 'success' },
        { ...sampleRun.boards[1], status: 'error' },
      ],
    };
    vi.mocked(useRunDetail).mockReturnValue({
      data: partialRun, loading: false, error: null, refresh: vi.fn(),
    });
    renderPage();
    expect(screen.getByText('partial')).toBeInTheDocument();
  });
});
