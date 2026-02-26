import { Router, Request, Response } from 'express';
import { Database } from 'sqlite';
import { requireAuth } from '../auth/middleware';
import {
  loadSourcesForUser,
  loadDeletedSourcesForUser,
  insertSource,
  updateSourceById,
  toggleSourceStateById,
  restoreSourceById,
  duplicateSourceById,
  listJobsForSourceIdForUser,
  deleteSourceById,
  getSourceById,
} from '../../src/storage/db';

export function makeSourcesRouter(db: Database): Router {
  const router = Router();

  router.use(requireAuth);

  router.get('/', async (req: Request, res: Response) => {
    try {
      const sources = await loadSourcesForUser(db, req.userId!);
      res.json(sources);
    } catch (err) {
      console.error('GET /api/sources error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/deleted', async (req: Request, res: Response) => {
    try {
      const sources = await loadDeletedSourcesForUser(db, req.userId!);
      res.json(sources);
    } catch (err) {
      console.error('GET /api/sources/deleted error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    const { tagIds, ...source } = req.body ?? {};
    if (!source?.name || !source?.url) {
      res.status(400).json({ error: 'name and url are required' });
      return;
    }
    try {
      const id = await insertSource(db, source, req.userId!, Array.isArray(tagIds) ? tagIds : undefined);
      const created = await getSourceById(db, id, req.userId!);
      res.status(201).json(created);
    } catch (err) {
      console.error('POST /api/sources error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    const id = String(req.params.id);
    try {
      const source = await getSourceById(db, id, req.userId!);
      if (!source) {
        res.status(404).json({ error: 'Source not found' });
        return;
      }
      res.json(source);
    } catch (err) {
      console.error('GET /api/sources/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.put('/:id', async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const { tagIds, ...source } = req.body ?? {};
    if (!source?.name || !source?.url) {
      res.status(400).json({ error: 'name and url are required' });
      return;
    }
    try {
      const updated = await updateSourceById(
        db, id, source, req.userId!,
        Array.isArray(tagIds) ? tagIds : undefined
      );
      if (!updated) {
        res.status(404).json({ error: 'Source not found' });
        return;
      }
      const result = await getSourceById(db, id, req.userId!);
      res.json(result);
    } catch (err) {
      console.error('PUT /api/sources/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    const id = String(req.params.id);
    try {
      const deleted = await deleteSourceById(db, id, req.userId!);
      if (!deleted) {
        res.status(404).json({ error: 'Source not found' });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      console.error('DELETE /api/sources/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/:id/toggle', async (req: Request, res: Response) => {
    const id = String(req.params.id);
    try {
      const ok = await toggleSourceStateById(db, id, req.userId!);
      if (!ok) {
        res.status(404).json({ error: 'Source not found' });
        return;
      }
      const source = await getSourceById(db, id, req.userId!);
      res.json(source);
    } catch (err) {
      console.error('POST /api/sources/:id/toggle error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/:id/restore', async (req: Request, res: Response) => {
    const id = String(req.params.id);
    try {
      const ok = await restoreSourceById(db, id, req.userId!);
      if (!ok) {
        res.status(404).json({ error: 'Source not found' });
        return;
      }
      const source = await getSourceById(db, id, req.userId!);
      res.json(source);
    } catch (err) {
      console.error('POST /api/sources/:id/restore error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/:id/duplicate', async (req: Request, res: Response) => {
    const id = String(req.params.id);
    try {
      const newId = await duplicateSourceById(db, id, req.userId!);
      if (!newId) {
        res.status(404).json({ error: 'Source not found' });
        return;
      }
      const source = await getSourceById(db, newId, req.userId!);
      res.status(201).json(source);
    } catch (err) {
      console.error('POST /api/sources/:id/duplicate error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/:id/jobs', async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '25'), 10) || 25));
    try {
      const source = await getSourceById(db, id, req.userId!);
      if (!source) {
        res.status(404).json({ error: 'Source not found' });
        return;
      }
      const { jobs, total } = await listJobsForSourceIdForUser(db, id, req.userId!, page, limit);
      res.json({ jobs, total, page, limit, pages: Math.ceil(total / limit) });
    } catch (err) {
      console.error('GET /api/sources/:id/jobs error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
