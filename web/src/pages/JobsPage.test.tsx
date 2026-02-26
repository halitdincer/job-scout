import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import JobsPage from './JobsPage';

vi.mock('../hooks', () => ({
  useJobsData: vi.fn(),
  useBoardsData: vi.fn(),
  useTagsData: vi.fn(),
  useCompaniesData: vi.fn(),
}));

vi.mock('../components/GeoCombobox', () => ({
  default: () => <input placeholder="Filter by country, state, city…" />,
}));

import { useJobsData, useBoardsData, useTagsData, useCompaniesData } from '../hooks';

const sampleJobs = [
  { id: 'j1', title: 'Software Engineer', company: 'Acme', location: 'Remote', url: 'https://x.com/1', firstSeenAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(), board: 'BoardA' },
  { id: 'j2', title: 'Product Manager', company: 'Beta', location: 'NYC', url: 'https://x.com/2', firstSeenAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(), board: 'BoardB' },
];

function renderJobsPage(jobs = sampleJobs) {
  vi.mocked(useJobsData).mockReturnValue({
    data: { jobs, total: jobs.length, page: 1, limit: 50, pages: 1 },
    error: null,
    loading: false,
  });
  vi.mocked(useBoardsData).mockReturnValue({
    data: [
      { id: 'b1', name: 'BoardA', url: 'https://a.com', selectors: {}, tags: [] },
      { id: 'b2', name: 'BoardB', url: 'https://b.com', selectors: {}, tags: [] },
    ],
    error: null,
    loading: false,
    refresh: vi.fn(),
  });
  vi.mocked(useTagsData).mockReturnValue({
    data: [],
    error: null,
    loading: false,
    refresh: vi.fn(),
  });
  vi.mocked(useCompaniesData).mockReturnValue({
    data: [],
    error: null,
    loading: false,
  });

  render(
    <MemoryRouter>
      <JobsPage />
    </MemoryRouter>
  );
}

describe('JobsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders job rows', () => {
    renderJobsPage();
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Product Manager')).toBeInTheDocument();
  });

  it('search input is present', () => {
    renderJobsPage();
    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('boards dropdown button is present', () => {
    renderJobsPage();
    expect(screen.getByRole('button', { name: /Boards/i })).toBeInTheDocument();
  });

  it('clicking the boards dropdown reveals board option buttons', () => {
    renderJobsPage();
    fireEvent.click(screen.getByRole('button', { name: /Boards/i }));
    // Board options appear as buttons inside the dropdown
    const boardBtns = screen.getAllByRole('button', { name: /^BoardA$|^BoardB$/ });
    expect(boardBtns.length).toBeGreaterThanOrEqual(2);
  });

  it('sort select has Newest/Oldest/Title options', () => {
    renderJobsPage();
    const allSelects = document.querySelectorAll('.filter-select') as NodeListOf<HTMLSelectElement>;
    const sortEl = Array.from(allSelects).find((el) => el.textContent?.includes('Newest first'));
    expect(sortEl).toBeTruthy();
    const options = Array.from((sortEl as HTMLSelectElement).options).map((o) => o.value);
    expect(options).toContain('newest');
    expect(options).toContain('oldest');
    expect(options).toContain('title');
  });
});
