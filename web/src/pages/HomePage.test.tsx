import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage';
import { ApiSource, Job, ScrapeRun } from '../types';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../hooks', () => ({
  useSourcesData: vi.fn(),
  useJobsData: vi.fn(),
  useRunsData: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useSourcesData, useJobsData, useRunsData } from '../hooks';
import { useAuth } from '../context/AuthContext';

const sampleSources: ApiSource[] = [
  {
    id: 'b1',
    name: 'Stable Source',
    url: 'https://stable.example.com',
    selectors: {},
    tags: [],
    lastRun: { status: 'success', finishedAt: new Date().toISOString() },
  },
  {
    id: 'b2',
    name: 'Broken Source',
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
    sourcesTotal: 4,
    sourcesDone: 4,
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
    sourcesTotal: 4,
    sourcesDone: 4,
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
    source: 'Stable Source',
  },
];

function renderHomePage({
  sources = sampleSources,
  runs = sampleRuns,
  jobs = sampleJobs,
}: {
  sources?: ApiSource[];
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

  vi.mocked(useSourcesData).mockReturnValue({
    data: sources,
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

  it('surfaces sources that need attention', () => {
    renderHomePage();
    expect(screen.getByText('Broken Source')).toBeInTheDocument();
    expect(screen.getByText(/failed on last run/i)).toBeInTheDocument();
  });

  it('shows healthy message when no sources need attention', () => {
    renderHomePage({
      sources: [
        {
          id: 'b1',
          name: 'Stable Source',
          url: 'https://stable.example.com',
          selectors: {},
          tags: [],
          lastRun: { status: 'success', finishedAt: new Date().toISOString() },
        },
      ],
    });

    expect(screen.getByText(/all sources look healthy/i)).toBeInTheDocument();
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
