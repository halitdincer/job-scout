import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BoardsPage from './BoardsPage';

vi.mock('../hooks', () => ({
  useBoardsData: vi.fn(),
  useJobsData: vi.fn(),
}));

import { useBoardsData, useJobsData } from '../hooks';

const sampleBoards = [
  { id: 'b1', name: 'Board Alpha', url: 'https://alpha.com', selectors: { jobCard: '.j', title: '.t', link: 'a', location: '.l' } },
  { id: 'b2', name: 'Board Beta', url: 'https://beta.com', selectors: { jobCard: '.j', title: '.t', link: 'a', location: '.l' } },
];

function renderBoardsPage(boards = sampleBoards, fetchImpl?: typeof fetch) {
  const refresh = vi.fn();
  vi.mocked(useBoardsData).mockReturnValue({
    data: boards,
    error: null,
    loading: false,
    refresh,
  });
  vi.mocked(useJobsData).mockReturnValue({
    data: { jobs: [], total: 0, page: 1, limit: 25, pages: 0 },
    error: null,
    loading: false,
  });

  if (fetchImpl) vi.stubGlobal('fetch', fetchImpl);

  render(
    <MemoryRouter>
      <BoardsPage />
    </MemoryRouter>
  );

  return { refresh };
}

describe('BoardsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists boards from useBoardsData', () => {
    renderBoardsPage();
    expect(screen.getByText('Board Alpha')).toBeInTheDocument();
    expect(screen.getByText('Board Beta')).toBeInTheDocument();
  });

  it('"+ Add Board" opens the board form', async () => {
    renderBoardsPage();
    fireEvent.click(screen.getByRole('button', { name: /\+ add board/i }));
    await waitFor(() => {
      expect(screen.getByText('Add Board')).toBeInTheDocument();
    });
  });

  it('submission calls POST /api/boards', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'new', name: 'New Board', url: 'https://new.com', selectors: {} }),
    });
    const { refresh } = renderBoardsPage(sampleBoards, fetchMock);

    fireEvent.click(screen.getByRole('button', { name: /\+ add board/i }));

    // Fill in required form fields
    await waitFor(() => screen.getByText('Add Board'));
    const nameInput = screen.getAllByRole('textbox').find(
      (el) => (el as HTMLInputElement).placeholder === '' || el.getAttribute('type') === null
    );
    // Fill minimal required fields via label
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'New Board' } }); // Name
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
        '/api/boards',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('delete button calls DELETE /api/boards/:id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
    // Mock window.confirm to return true
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderBoardsPage(sampleBoards, fetchMock);

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/boards/b1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
