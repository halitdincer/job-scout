import { Router, Request, Response } from 'express';
import { Database } from 'sqlite';
import { requireAuth } from '../auth/middleware';
import {
  listTagsForUser,
  createTag,
  updateTag,
  deleteTag,
} from '../../src/storage/db';

export function makeTagsRouter(db: Database): Router {
  const router = Router();

  router.use(requireAuth);

  router.get('/', async (req: Request, res: Response) => {
    try {
      const tags = await listTagsForUser(db, req.userId!);
      res.json(tags);
    } catch (err) {
      console.error('GET /api/tags error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    const { name, color } = req.body ?? {};
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    try {
      const id = await createTag(db, req.userId!, name.trim(), color ?? '#6366f1');
      const tags = await listTagsForUser(db, req.userId!);
      const tag = tags.find((t) => t.id === id);
      res.status(201).json(tag);
    } catch (err: any) {
      if (err?.message?.includes('UNIQUE constraint failed')) {
        res.status(409).json({ error: 'Tag with this name already exists' });
        return;
      }
      console.error('POST /api/tags error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.put('/:id', async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const { name, color } = req.body ?? {};
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    try {
      await updateTag(db, req.userId!, id, name.trim(), color ?? '#6366f1');
      const tags = await listTagsForUser(db, req.userId!);
      const tag = tags.find((t) => t.id === id);
      if (!tag) {
        res.status(404).json({ error: 'Tag not found' });
        return;
      }
      res.json(tag);
    } catch (err) {
      console.error('PUT /api/tags/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    const id = String(req.params.id);
    try {
      await deleteTag(db, req.userId!, id);
      res.json({ ok: true });
    } catch (err) {
      console.error('DELETE /api/tags/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
