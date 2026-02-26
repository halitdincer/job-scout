import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage';
import { ApiBoard, Job, ScrapeRun } from '../types';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../hooks', () => ({
  useBoardsData: vi.fn(),
  useJobsData: vi.fn(),
  useRunsData: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useBoardsData, useJobsData, useRunsData } from '../hooks';
import { useAuth } from '../context/AuthContext';

const sampleBoards: ApiBoard[] = [
  {
    id: 'b1',
    name: 'Stable Board',
    url: 'https://stable.example.com',
    selectors: {},
    tags: [],
    lastRun: { status: 'success', finishedAt: new Date().toISOString() },
  },
  {
    id: 'b2',
    name: 'Broken Board',
    url: 'https://broken.example.com',
    selectors: {},
    tags: [],
    lastRun: { status: 'error', finishedAt: new Date().toISOString() },
  },
];

const sampleRuns: ScrapeRun[] = [
  {
    id: 'run-1',
    userId: 'u1',
    triggeredBy: 'manual',
    startedAt: new Date(Date.now() - 120000).toISOString(),
    finishedAt: new Date(Date.now() - 30000).toISOString(),
    status: 'success',
    boardsTotal: 4,
    boardsDone: 4,
    jobsFound: 18,
    jobsNew: 6,
  },
  {
    id: 'run-2',
    userId: 'u1',
    triggeredBy: 'cron',
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    finishedAt: new Date(Date.now() - 3500000).toISOString(),
    status: 'partial',
    boardsTotal: 4,
    boardsDone: 4,
    jobsFound: 10,
    jobsNew: 2,
  },
];

const sampleJobs = [
  {
    id: 'j1',
    title: 'Backend Engineer',
    company: 'Acme',
    location: 'Remote',
    url: 'https://jobs.example.com/1',
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    board: 'Stable Board',
  },
];

function renderHomePage({
  boards = sampleBoards,
  runs = sampleRuns,
  jobs = sampleJobs,
}: {
  boards?: ApiBoard[];
  runs?: ScrapeRun[];
  jobs?: Job[];
} = {}) {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'u1', email: 'halit@example.com' },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  });

  vi.mocked(useBoardsData).mockReturnValue({
    data: boards,
    loading: false,
    error: null,
    refresh: vi.fn(),
  });

  vi.mocked(useRunsData).mockReturnValue({
    data: runs,
    loading: false,
    error: null,
    refresh: vi.fn(),
  });

  vi.mocked(useJobsData).mockReturnValue({
    data: { jobs, total: jobs.length, page: 1, limit: 8, pages: 1 },
    loading: false,
    error: null,
  });

  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  it('renders operator dashboard sections', () => {
    renderHomePage();
    expect(screen.getByText(/operations center/i)).toBeInTheDocument();
    expect(screen.getByText(/operational snapshot/i)).toBeInTheDocument();
    expect(screen.getByText(/needs attention/i)).toBeInTheDocument();
    expect(screen.getByText(/run health timeline/i)).toBeInTheDocument();
    expect(screen.getByText(/fresh intake/i)).toBeInTheDocument();
  });

  it('surfaces boards that need attention', () => {
    renderHomePage();
    expect(screen.getByText('Broken Board')).toBeInTheDocument();
    expect(screen.getByText(/failed on last run/i)).toBeInTheDocument();
  });

  it('shows healthy message when no boards need attention', () => {
    renderHomePage({
      boards: [
        {
          id: 'b1',
          name: 'Stable Board',
          url: 'https://stable.example.com',
          selectors: {},
          tags: [],
          lastRun: { status: 'success', finishedAt: new Date().toISOString() },
        },
      ],
    });

    expect(screen.getByText(/all boards look healthy/i)).toBeInTheDocument();
  });

  it('starts a run and navigates to run detail', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ runId: 'run-new' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    renderHomePage();
    fireEvent.click(screen.getByRole('button', { name: /run scraper now/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/runs',
        expect.objectContaining({ method: 'POST' })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/runs/run-new');
    });
  });
});
