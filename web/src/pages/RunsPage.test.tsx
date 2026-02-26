import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RunsPage from './RunsPage';
import { ScrapeRun } from '../types';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../hooks', () => ({
  useRunsData: vi.fn(),
}));

import { useRunsData } from '../hooks';

const sampleRuns: ScrapeRun[] = [
  {
    id: 'r1',
    userId: 'u1',
    triggeredBy: 'manual',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    sourcesTotal: 3,
    sourcesDone: 3,
    jobsFound: 10,
    jobsNew: 3,
    status: 'success',
  },
  {
    id: 'r2',
    userId: 'u1',
    triggeredBy: 'cron',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    sourcesTotal: 2,
    sourcesDone: 1,
    jobsFound: 0,
    jobsNew: 0,
    status: 'error',
  },
  {
    id: 'r3',
    userId: 'u1',
    triggeredBy: 'cron',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    sourcesTotal: 2,
    sourcesDone: 0,
    jobsFound: 0,
    jobsNew: 0,
    status: 'running',
  },
  {
    id: 'r4',
    userId: 'u1',
    triggeredBy: 'cron',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    sourcesTotal: 2,
    sourcesDone: 2,
    jobsFound: 5,
    jobsNew: 1,
    status: 'partial',
  },
];

function renderRunsPage(runs: ScrapeRun[] = sampleRuns) {
  vi.mocked(useRunsData).mockReturnValue({
    data: runs,
    error: null,
    loading: false,
    refresh: vi.fn(),
  });

  render(
    <MemoryRouter>
      <RunsPage />
    </MemoryRouter>
  );
}

describe('RunsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('lists runs', () => {
    renderRunsPage();
    expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
  });

  it('shows "success" status badge', () => {
    renderRunsPage();
    expect(screen.getByText('success')).toBeInTheDocument();
  });

  it('shows "error" status badge', () => {
    renderRunsPage();
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it('shows "running" status badge', () => {
    renderRunsPage();
    expect(screen.getByText('running')).toBeInTheDocument();
  });

  it('shows "partial" status badge', () => {
    renderRunsPage();
    expect(screen.getByText('partial')).toBeInTheDocument();
  });

  it('shows empty state when no runs', () => {
    renderRunsPage([]);
    expect(screen.getByText(/no runs yet/i)).toBeInTheDocument();
  });

  it('"Run Now" button is visible', () => {
    renderRunsPage();
    expect(screen.getByRole('button', { name: /run now/i })).toBeInTheDocument();
  });

  it('clicking "Run Now" calls POST /api/runs and navigates', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ runId: 'new-run-id' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    renderRunsPage();
    fireEvent.click(screen.getByRole('button', { name: /run now/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/runs',
        expect.objectContaining({ method: 'POST' })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/runs/new-run-id');
    });
  });

  it('clicking a run row navigates to /runs/:id', () => {
    renderRunsPage();
    const rows = screen.getAllByRole('row');
    // rows[0] is header, rows[1] is first data row
    fireEvent.click(rows[1]);
    expect(mockNavigate).toHaveBeenCalledWith('/runs/r1');
  });
});
