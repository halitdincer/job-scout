import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../context/AuthContext';

function renderRoute(user: { id: string; email: string } | null, loading = false) {
  vi.mocked(useAuth).mockReturnValue({
    user,
    loading,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  });

  render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('renders children when user is set', () => {
    renderRoute({ id: 'u1', email: 'user@example.com' });
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to /login when user is null and not loading', () => {
    renderRoute(null, false);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows loading indicator while loading', () => {
    renderRoute(null, true);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });
});
