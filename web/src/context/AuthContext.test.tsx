import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

function TestConsumer() {
  const { user, loading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : 'null'}</span>
    </div>
  );
}

function renderWithAuth(fetchImpl: typeof fetch) {
  vi.stubGlobal('fetch', fetchImpl);
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with user: null and loading: true, then resolves', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ authenticated: false }),
    }));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading').textContent).toBe('true');

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('sets user when /api/auth/me returns authenticated: true', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ authenticated: true, id: 'u1', email: 'me@example.com' }),
    }));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('me@example.com');
    });
  });

  it('login() updates user state', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ authenticated: false }) })  // me
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'u1', email: 'user@example.com' }) }); // login

    vi.stubGlobal('fetch', fetchMock);

    let loginFn!: (email: string, password: string) => Promise<void>;
    function CaptureLogin() {
      const { login } = useAuth();
      loginFn = login;
      return null;
    }

    render(
      <AuthProvider>
        <TestConsumer />
        <CaptureLogin />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await act(async () => {
      await loginFn('user@example.com', 'pass');
    });

    expect(screen.getByTestId('user').textContent).toBe('user@example.com');
  });

  it('logout() clears user state', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ authenticated: true, id: 'u1', email: 'me@example.com' }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: true }) }); // logout

    vi.stubGlobal('fetch', fetchMock);

    let logoutFn!: () => Promise<void>;
    function CaptureLogout() {
      const { logout } = useAuth();
      logoutFn = logout;
      return null;
    }

    render(
      <AuthProvider>
        <TestConsumer />
        <CaptureLogout />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('me@example.com'));

    await act(async () => {
      await logoutFn();
    });

    expect(screen.getByTestId('user').textContent).toBe('null');
  });
});
