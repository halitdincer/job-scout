import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SourceDetailPage from './SourceDetailPage';

describe('SourceDetailPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders source details and linked jobs', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'b1',
          name: 'Source Alpha',
          state: 'active',
          tags: [],
          url: 'https://alpha.com',
          selectors: { jobCard: '.job', title: '.title', link: 'a' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jobs: [
            {
              id: 'j1',
              title: 'Backend Engineer',
              company: 'Acme',
              location: 'Remote',
              url: 'https://example.com/jobs/1',
              source: 'Source Alpha',
              firstSeenAt: new Date().toISOString(),
              lastSeenAt: new Date().toISOString(),
            },
          ],
          total: 1,
          page: 1,
          pages: 1,
          limit: 25,
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter initialEntries={['/sources/b1']}>
        <Routes>
          <Route path="/sources/:id" element={<SourceDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Source Alpha')).toBeInTheDocument();
      expect(screen.getByText('Linked Jobs')).toBeInTheDocument();
      expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    });
  });
});
