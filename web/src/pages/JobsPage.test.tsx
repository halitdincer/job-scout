import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import JobsPage from './JobsPage';

vi.mock('../hooks', () => ({
  useJobsData: vi.fn(),
  useSourcesData: vi.fn(),
  useTagsData: vi.fn(),
}));
import { useJobsData, useSourcesData, useTagsData } from '../hooks';

const sampleJobs = [
  { id: 'j1', title: 'Software Engineer', company: 'Acme', location: 'Remote', url: 'https://x.com/1', firstSeenAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(), source: 'SourceA' },
  { id: 'j2', title: 'Product Manager', company: 'Beta', location: 'NYC', url: 'https://x.com/2', firstSeenAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(), source: 'SourceB' },
];

function renderJobsPage(jobs = sampleJobs) {
  vi.mocked(useJobsData).mockReturnValue({
    data: { jobs, total: jobs.length, page: 1, limit: 50, pages: 1 },
    error: null,
    loading: false,
  });
  vi.mocked(useSourcesData).mockReturnValue({
    data: [
      { id: 'b1', name: 'SourceA', url: 'https://a.com', selectors: {}, tags: [] },
      { id: 'b2', name: 'SourceB', url: 'https://b.com', selectors: {}, tags: [] },
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

  it('sources dropdown button is present', () => {
    renderJobsPage();
    expect(screen.getByRole('button', { name: /Sources/i })).toBeInTheDocument();
  });

  it('clicking the sources dropdown reveals source option buttons', () => {
    renderJobsPage();
    fireEvent.click(screen.getByRole('button', { name: /Sources/i }));
    // Source options appear as buttons inside the dropdown
    const sourceBtns = screen.getAllByRole('button', { name: /^SourceA$|^SourceB$/ });
    expect(sourceBtns.length).toBeGreaterThanOrEqual(2);
  });

  it('each job row has a checkbox', () => {
    renderJobsPage();
    const checkboxes = screen.getAllByRole('checkbox');
    // one per job row + one select-all in the header = 3 total
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);
  });

  it('clicking a job row shows the bulk action bar', () => {
    renderJobsPage();
    // click the first job row checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // [0] is select-all header
    expect(screen.getByText(/selected/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('select-all checkbox selects all jobs on the page', () => {
    renderJobsPage();
    const allCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(allCheckbox);
    // bulk bar should show 2 selected
    expect(screen.getByText(/2 of 2 selected/i)).toBeInTheDocument();
  });

  it('Clear button deselects all', () => {
    renderJobsPage();
    // select all
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(screen.getByText(/2 of 2 selected/i)).toBeInTheDocument();
    // clear
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
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
