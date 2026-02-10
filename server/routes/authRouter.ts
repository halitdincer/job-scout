import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Database } from 'sqlite';
import { signToken, verifyToken } from '../auth/jwt';
import { hashPassword, verifyPassword } from '../auth/passwords';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

export function makeAuthRouter(db: Database): Router {
  const router = Router();

  // Always returns HTTP 200 — used as K8s readiness probe
  router.get('/me', (req: Request, res: Response) => {
    const token = req.cookies?.token as string | undefined;
    if (!token) {
      res.json({ authenticated: false });
      return;
    }
    const userId = verifyToken(token);
    if (!userId) {
      res.json({ authenticated: false });
      return;
    }
    db.get<{ id: string; email: string } | undefined>(
      'SELECT id, email FROM users WHERE id = ?',
      userId
    ).then((user) => {
      if (!user) {
        res.json({ authenticated: false });
        return;
      }
      res.json({ authenticated: true, id: user.id, email: user.email });
    }).catch(() => {
      res.json({ authenticated: false });
    });
  });

  router.post('/register', async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    try {
      const existing = await db.get<{ id: string } | undefined>(
        'SELECT id FROM users WHERE email = ?',
        email.toLowerCase()
      );
      if (existing) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }

      const id = uuidv4();
      const hash = await hashPassword(password);
      const now = new Date().toISOString();

      await db.run(
        'INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
        id,
        email.toLowerCase(),
        hash,
        now
      );

      const token = signToken(id);
      res.cookie('token', token, COOKIE_OPTS);
      res.status(201).json({ id, email: email.toLowerCase() });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    try {
      const user = await db.get<{ id: string; email: string; password_hash: string } | undefined>(
        'SELECT id, email, password_hash FROM users WHERE email = ?',
        typeof email === 'string' ? email.toLowerCase() : ''
      );

      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const valid = await verifyPassword(String(password), user.password_hash);
      if (!valid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const token = signToken(user.id);
      res.cookie('token', token, COOKIE_OPTS);
      res.json({ id: user.id, email: user.email });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/logout', (_req: Request, res: Response) => {
    res.clearCookie('token');
    res.json({ ok: true });
  });

  return router;
}
