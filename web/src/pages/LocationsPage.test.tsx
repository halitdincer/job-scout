import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LocationsPage from './LocationsPage';

const mockNavigate = vi.fn();

vi.mock('../hooks', () => ({
  useBoardsData: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import { useBoardsData } from '../hooks';

const boardsWithLocations = [
  { id: 'b1', name: 'Board 1', url: 'https://a.com', selectors: {}, tags: [], locationKey: 'CA-ON-Toronto', locationLabel: 'Toronto, Ontario, Canada' },
  { id: 'b2', name: 'Board 2', url: 'https://b.com', selectors: {}, tags: [], locationKey: 'CA-ON', locationLabel: 'Ontario, Canada' },
  { id: 'b3', name: 'Board 3', url: 'https://c.com', selectors: {}, tags: [], locationKey: 'DE', locationLabel: 'Germany' },
];

function renderPage(overrides: Record<string, unknown> = {}) {
  vi.mocked(useBoardsData).mockReturnValue({
    data: boardsWithLocations,
    error: null,
    loading: false,
    refresh: vi.fn(),
    ...overrides,
  } as any);
  render(
    <MemoryRouter>
      <LocationsPage />
    </MemoryRouter>
  );
}

describe('LocationsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading state', () => {
    renderPage({ loading: true, data: null });
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error state', () => {
    renderPage({ error: 'fail', data: null, loading: false });
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });

  it('shows empty state when no boards have locations', () => {
    renderPage({ data: [] });
    expect(screen.getByText(/no boards with locations/i)).toBeInTheDocument();
  });

  it('also shows empty state when boards have no locationKey', () => {
    renderPage({
      data: [{ id: 'b1', name: 'Board 1', url: 'https://a.com', selectors: {}, tags: [] }],
    });
    expect(screen.getByText(/no boards with locations/i)).toBeInTheDocument();
  });

  it('renders country-level nodes', () => {
    renderPage();
    expect(screen.getByText('Canada')).toBeInTheDocument();
    expect(screen.getByText('Germany')).toBeInTheDocument();
  });

  it('clicking a country node navigates with locationKey', () => {
    renderPage();
    fireEvent.click(screen.getByText('Canada'));
    expect(mockNavigate).toHaveBeenCalledWith('/jobs?locationKey=CA');
  });

  it('clicking Germany navigates with DE locationKey', () => {
    renderPage();
    fireEvent.click(screen.getByText('Germany'));
    expect(mockNavigate).toHaveBeenCalledWith('/jobs?locationKey=DE');
  });

  it('shows board counts', () => {
    renderPage();
    // Canada has 2 boards; Ontario also has 2 boards — multiple matches expected
    const boardCountEls = screen.getAllByText(/\d+ boards?/);
    expect(boardCountEls.length).toBeGreaterThan(0);
  });

  it('expanded country shows child state nodes', () => {
    renderPage();
    // Canada is expanded by default (depth=0 < 1), Ontario should be visible
    expect(screen.getByText('Ontario')).toBeInTheDocument();
  });

  it('clicking a state node navigates with state locationKey', () => {
    renderPage();
    fireEvent.click(screen.getByText('Ontario'));
    expect(mockNavigate).toHaveBeenCalledWith('/jobs?locationKey=CA-ON');
  });
});
