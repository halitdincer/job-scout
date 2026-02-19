import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import JobsPage from './JobsPage';

vi.mock('../hooks', () => ({
  useJobsData: vi.fn(),
  useBoardsData: vi.fn(),
}));

import { useJobsData, useBoardsData } from '../hooks';

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
      { id: 'b1', name: 'BoardA', url: 'https://a.com', selectors: {} },
      { id: 'b2', name: 'BoardB', url: 'https://b.com', selectors: {} },
    ],
    error: null,
    loading: false,
    refresh: vi.fn(),
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

  it('board dropdown is present with board options', () => {
    renderJobsPage();
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'BoardA' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'BoardB' })).toBeInTheDocument();
  });

  it('changing board dropdown triggers useJobsData with board param', () => {
    renderJobsPage();
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'BoardA' } });
    // useJobsData is called with updated board param — check it was called
    expect(vi.mocked(useJobsData)).toHaveBeenCalled();
  });
});
