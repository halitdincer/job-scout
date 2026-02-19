import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RunsPage from './RunsPage';

vi.mock('../hooks', () => ({
  useBoardsData: vi.fn(),
  useRunsData: vi.fn(),
}));

import { useBoardsData, useRunsData } from '../hooks';

const sampleRuns = [
  {
    id: 'r1', boardId: 'b1', userId: 'u1',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    jobsFound: 10, jobsNew: 3,
    status: 'success' as const,
    errorMsg: null,
  },
  {
    id: 'r2', boardId: 'b1', userId: 'u1',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    jobsFound: 0, jobsNew: 0,
    status: 'error' as const,
    errorMsg: 'Network timeout',
  },
  {
    id: 'r3', boardId: 'b1', userId: 'u1',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    jobsFound: 0, jobsNew: 0,
    status: 'running' as const,
    errorMsg: null,
  },
];

function renderRunsPage(runs = sampleRuns) {
  vi.mocked(useBoardsData).mockReturnValue({
    data: [{ id: 'b1', name: 'TestBoard', url: 'https://x.com', selectors: {} }],
    error: null,
    loading: false,
    refresh: vi.fn(),
  });
  vi.mocked(useRunsData).mockReturnValue({
    data: runs,
    error: null,
    loading: false,
  });

  render(
    <MemoryRouter>
      <RunsPage />
    </MemoryRouter>
  );
}

describe('RunsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists runs', () => {
    renderRunsPage();
    expect(screen.getAllByRole('row').length).toBeGreaterThan(1); // header + data rows
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

  it('shows empty state when no runs', () => {
    renderRunsPage([]);
    expect(screen.getByText(/no runs yet/i)).toBeInTheDocument();
  });
});
