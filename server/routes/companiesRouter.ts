import { Router, Request, Response } from 'express';
import { Database } from 'sqlite';
import { requireAuth } from '../auth/middleware';
import {
  listCompaniesForUser,
  upsertCompany,
  deleteCompany,
  searchCompanies,
} from '../../src/storage/db';

export function makeCompaniesRouter(db: Database): Router {
  const router = Router();

  router.use(requireAuth);

  router.get('/', async (req: Request, res: Response) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const limit = Math.min(100, parseInt(String(req.query.limit ?? '10'), 10) || 10);

    try {
      if (q) {
        const results = await searchCompanies(db, req.userId!, q, limit);
        res.json(results);
      } else {
        const results = await listCompaniesForUser(db, req.userId!);
        res.json(results);
      }
    } catch (err) {
      console.error('GET /api/companies error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    const { name } = req.body ?? {};
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    try {
      const id = await upsertCompany(db, req.userId!, name.trim());
      const all = await listCompaniesForUser(db, req.userId!);
      const company = all.find((c) => c.id === id) ?? { id, name: name.trim(), boardCount: 0, jobCount: 0 };
      res.status(201).json(company);
    } catch (err) {
      console.error('POST /api/companies error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    const id = String(req.params.id);
    try {
      await deleteCompany(db, req.userId!, id);
      res.json({ ok: true });
    } catch (err) {
      console.error('DELETE /api/companies/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
