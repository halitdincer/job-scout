import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import BoardDetailPage from './BoardDetailPage';

describe('BoardDetailPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders board details and linked jobs', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'b1',
          name: 'Board Alpha',
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
              board: 'Board Alpha',
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
      <MemoryRouter initialEntries={['/boards/b1']}>
        <Routes>
          <Route path="/boards/:id" element={<BoardDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Board Alpha')).toBeInTheDocument();
      expect(screen.getByText('Linked Jobs')).toBeInTheDocument();
      expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    });
  });
});
