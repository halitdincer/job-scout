import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../server/auth/jwt', () => ({
  verifyToken: vi.fn(),
}));

import { requireAuth } from '../../../server/auth/middleware';
import { verifyToken } from '../../../server/auth/jwt';

function makeReqResNext(cookieToken?: string) {
  const req: any = { cookies: cookieToken !== undefined ? { token: cookieToken } : {} };
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const next = vi.fn();
  return { req, res, next };
}

describe('requireAuth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls next() and sets req.userId for a valid token', () => {
    vi.mocked(verifyToken).mockReturnValue('user-123');
    const { req, res, next } = makeReqResNext('valid-token');

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.userId).toBe('user-123');
    expect(res.status).not.toHaveBeenCalled();
  });

  it('sends 401 when cookie is missing', () => {
    const { req, res, next } = makeReqResNext(undefined);

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('sends 401 when token is invalid', () => {
    vi.mocked(verifyToken).mockReturnValue(null);
    const { req, res, next } = makeReqResNext('bad-token');

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });
});
