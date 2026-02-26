import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SourcesPage from './SourcesPage';
import { ApiSource } from '../types';

vi.mock('../hooks', () => ({
  useSourcesData: vi.fn(),
  useJobsData: vi.fn(),
  useTagsData: vi.fn(() => ({ data: [], error: null, loading: false, refresh: vi.fn() })),
}));

import { useSourcesData, useJobsData } from '../hooks';

const sampleSources: ApiSource[] = [
  { id: 'b1', name: 'Source Alpha', state: 'active', tags: [], url: 'https://alpha.com', selectors: { jobCard: '.j', title: '.t', link: 'a' } },
  { id: 'b2', name: 'Source Beta', state: 'inactive', tags: [], url: 'https://beta.com', selectors: { jobCard: '.j', title: '.t', link: 'a' } },
];

const sourcesWithLastRun = [
  {
    id: 'b1', name: 'Source Alpha', url: 'https://alpha.com',
    selectors: { jobCard: '.j', title: '.t', link: 'a' },
    lastRun: { status: 'success', finishedAt: new Date().toISOString() },
  },
  {
    id: 'b2', name: 'Source Beta', url: 'https://beta.com',
    selectors: { jobCard: '.j', title: '.t', link: 'a' },
    lastRun: null,
  },
  {
    id: 'b3', name: 'Source Gamma', url: 'https://gamma.com',
    selectors: { jobCard: '.j', title: '.t', link: 'a' },
    lastRun: { status: 'error', finishedAt: new Date().toISOString() },
  },
];

function renderSourcesPage(sources = sampleSources, fetchImpl?: typeof fetch) {
  const refresh = vi.fn();
  vi.mocked(useSourcesData).mockReturnValue({
    data: sources,
    error: null,
    loading: false,
    refresh,
  });
  vi.mocked(useJobsData).mockReturnValue({
    data: { jobs: [], total: 0, page: 1, limit: 25, pages: 0 },
    error: null,
    loading: false,
  });

  vi.stubGlobal('fetch', fetchImpl ?? vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) }));

  render(
    <MemoryRouter>
      <SourcesPage />
    </MemoryRouter>
  );

  return { refresh };
}

describe('SourcesPage', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it('splits active and inactive sources', () => {
    renderSourcesPage();
    expect(screen.getByText('Active Sources')).toBeInTheDocument();
    expect(screen.getByText('Inactive Sources')).toBeInTheDocument();
    expect(screen.getByText('Source Alpha')).toBeInTheDocument();
    expect(screen.getByText('Source Beta')).toBeInTheDocument();
  });

  it('loads deleted sources section from API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: 'b9', name: 'Old Source', state: 'deleted', tags: [], url: 'https://old.example.com', selectors: {} },
      ]),
    });
    renderSourcesPage(sampleSources, fetchMock);

    await waitFor(() => {
      expect(screen.getByText('Deleted Sources')).toBeInTheDocument();
      expect(screen.getByText('Old Source')).toBeInTheDocument();
    });
  });

  it('"+ Add Source" opens the source form', async () => {
    renderSourcesPage();
    fireEvent.click(screen.getByRole('button', { name: /\+ add source/i }));
    await waitFor(() => {
      expect(screen.getByText('Add Source')).toBeInTheDocument();
    });
  });

  it('submission calls POST /api/sources', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'new', name: 'New Source', url: 'https://new.com', selectors: {} }),
    });
    const { refresh } = renderSourcesPage(sampleSources, fetchMock);

    fireEvent.click(screen.getByRole('button', { name: /\+ add source/i }));

    // Fill in required form fields
    await waitFor(() => screen.getByText('Add Source'));
    const nameInput = screen.getAllByRole('textbox').find(
      (el) => (el as HTMLInputElement).placeholder === '' || el.getAttribute('type') === null
    );
    // Fill minimal required fields via label
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'New Source' } }); // Name

    // Fill required Company and Location fields
    const companyInput = document.querySelector('input[placeholder="Uber"]') as HTMLInputElement;
    const locationInput = document.querySelector('input[placeholder="Toronto, ON"]') as HTMLInputElement;
    if (companyInput) fireEvent.change(companyInput, { target: { value: 'Acme Corp' } });
    if (locationInput) fireEvent.change(locationInput, { target: { value: 'New York, NY' } });

    const urlInputs = screen.getAllByDisplayValue('');
    const urlInput = urlInputs.find((el) => el.getAttribute('type') === 'url');
    if (urlInput) fireEvent.change(urlInput, { target: { value: 'https://new.com' } });

    // Fill required selector fields (jobCard, title, link)
    const allInputs = document.querySelectorAll('input.input');
    allInputs.forEach((inp) => {
      if ((inp as HTMLInputElement).placeholder.includes('.job-listing')) {
        fireEvent.change(inp, { target: { value: '.job' } });
      }
      if ((inp as HTMLInputElement).placeholder.includes('h2.job-title')) {
        fireEvent.change(inp, { target: { value: '.title' } });
      }
      if ((inp as HTMLInputElement).placeholder.includes('a.apply-link')) {
        fireEvent.change(inp, { target: { value: 'a' } });
      }
    });

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sources',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('shows "success" badge for source with lastRun.status=success', () => {
    vi.mocked(useSourcesData).mockReturnValue({
      data: sourcesWithLastRun as any,
      error: null,
      loading: false,
      refresh: vi.fn(),
    });
    vi.mocked(useJobsData).mockReturnValue({
      data: { jobs: [], total: 0, page: 1, limit: 25, pages: 0 },
      error: null,
      loading: false,
    });
    render(<MemoryRouter><SourcesPage /></MemoryRouter>);
    expect(screen.getByText('success')).toBeInTheDocument();
  });

  it('shows no badge for source with lastRun=null', () => {
    vi.mocked(useSourcesData).mockReturnValue({
      data: [sourcesWithLastRun[1]] as any,
      error: null,
      loading: false,
      refresh: vi.fn(),
    });
    vi.mocked(useJobsData).mockReturnValue({
      data: { jobs: [], total: 0, page: 1, limit: 25, pages: 0 },
      error: null,
      loading: false,
    });
    render(<MemoryRouter><SourcesPage /></MemoryRouter>);
    expect(screen.queryByText('success')).not.toBeInTheDocument();
    expect(screen.queryByText('error')).not.toBeInTheDocument();
  });

  it('shows "error" badge for source with lastRun.status=error', () => {
    vi.mocked(useSourcesData).mockReturnValue({
      data: [sourcesWithLastRun[2]] as any,
      error: null,
      loading: false,
      refresh: vi.fn(),
    });
    vi.mocked(useJobsData).mockReturnValue({
      data: { jobs: [], total: 0, page: 1, limit: 25, pages: 0 },
      error: null,
      loading: false,
    });
    render(<MemoryRouter><SourcesPage /></MemoryRouter>);
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it('delete button calls DELETE /api/sources/:id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
    // Mock window.confirm to return true
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderSourcesPage(sampleSources, fetchMock);

    const deleteButtons = screen.getAllByRole('button', { name: /^delete$/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sources/b1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  it('toggle button calls POST /api/sources/:id/toggle', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'b1', state: 'inactive' }) });

    renderSourcesPage(sampleSources, fetchMock);
    fireEvent.click(screen.getByRole('button', { name: /set inactive/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/sources/b1/toggle', expect.objectContaining({ method: 'POST' }));
    });
  });

  it('restore button calls POST /api/sources/:id/restore', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 'd1', name: 'Discarded', state: 'deleted', tags: [], url: 'https://discarded', selectors: {} }]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'd1', state: 'inactive' }) });

    renderSourcesPage(sampleSources, fetchMock);

    await waitFor(() => screen.getByText('Discarded'));
    fireEvent.click(screen.getByRole('button', { name: /restore/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/sources/d1/restore', expect.objectContaining({ method: 'POST' }));
    });
  });

  it('duplicate button calls POST /api/sources/:id/duplicate', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'b3' }) });

    renderSourcesPage(sampleSources, fetchMock);
    fireEvent.click(screen.getAllByRole('button', { name: /duplicate/i })[0]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/sources/b1/duplicate', expect.objectContaining({ method: 'POST' }));
    });
  });
});
