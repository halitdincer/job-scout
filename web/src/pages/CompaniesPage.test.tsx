import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CompaniesPage from './CompaniesPage';

const mockNavigate = vi.fn();

vi.mock('../hooks', () => ({
  useCompaniesData: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import { useCompaniesData } from '../hooks';

const sampleCompanies = [
  { id: 'c1', name: 'Acme Corp', boardCount: 2, jobCount: 10 },
  { id: 'c2', name: 'Beta LLC', boardCount: 1, jobCount: 5 },
];

function renderPage(overrides: Record<string, unknown> = {}) {
  vi.mocked(useCompaniesData).mockReturnValue({
    data: sampleCompanies,
    error: null,
    loading: false,
    ...overrides,
  } as any);
  render(
    <MemoryRouter>
      <CompaniesPage />
    </MemoryRouter>
  );
}

describe('CompaniesPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading state', () => {
    renderPage({ loading: true, data: null });
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error state', () => {
    renderPage({ error: 'fail', data: null, loading: false });
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });

  it('shows empty state when no companies', () => {
    renderPage({ data: [] });
    expect(screen.getByText(/no companies yet/i)).toBeInTheDocument();
  });

  it('renders company names', () => {
    renderPage();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Beta LLC')).toBeInTheDocument();
  });

  it('renders board and job counts', () => {
    renderPage();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('clicking a row navigates to jobs filtered by company', () => {
    renderPage();
    fireEvent.click(screen.getByText('Acme Corp'));
    expect(mockNavigate).toHaveBeenCalledWith('/jobs?companies=c1');
  });

  it('delete buttons are present for each company', () => {
    renderPage();
    const deleteBtns = screen.getAllByRole('button', { name: /delete/i });
    expect(deleteBtns).toHaveLength(2);
  });

  it('delete button does not navigate the row', () => {
    renderPage();
    const [firstDelete] = screen.getAllByRole('button', { name: /delete/i });
    // Mock window.confirm to cancel
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(firstDelete);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
