import { Router, Request, Response } from 'express';
import { Database } from 'sqlite';
import { requireAuth } from '../auth/middleware';
import {
  loadBoardsForUser,
  loadDeletedBoardsForUser,
  insertBoard,
  updateBoardById,
  toggleBoardStateById,
  restoreBoardById,
  duplicateBoardById,
  listJobsForBoardIdForUser,
  deleteBoardById,
  getBoardById,
} from '../../src/storage/db';

export function makeBoardsRouter(db: Database): Router {
  const router = Router();

  router.use(requireAuth);

  router.get('/', async (req: Request, res: Response) => {
    try {
      const boards = await loadBoardsForUser(db, req.userId!);
      res.json(boards);
    } catch (err) {
      console.error('GET /api/boards error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/deleted', async (req: Request, res: Response) => {
    try {
      const boards = await loadDeletedBoardsForUser(db, req.userId!);
      res.json(boards);
    } catch (err) {
      console.error('GET /api/boards/deleted error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    const { tagIds, ...board } = req.body ?? {};
    if (!board?.name || !board?.url) {
      res.status(400).json({ error: 'name and url are required' });
      return;
    }
    try {
      const id = await insertBoard(db, board, req.userId!, Array.isArray(tagIds) ? tagIds : undefined);
      const created = await getBoardById(db, id, req.userId!);
      res.status(201).json(created);
    } catch (err) {
      console.error('POST /api/boards error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    const id = String(req.params.id);
    try {
      const board = await getBoardById(db, id, req.userId!);
      if (!board) {
        res.status(404).json({ error: 'Board not found' });
        return;
      }
      res.json(board);
    } catch (err) {
      console.error('GET /api/boards/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.put('/:id', async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const { tagIds, ...board } = req.body ?? {};
    if (!board?.name || !board?.url) {
      res.status(400).json({ error: 'name and url are required' });
      return;
    }
    try {
      const updated = await updateBoardById(
        db, id, board, req.userId!,
        Array.isArray(tagIds) ? tagIds : undefined
      );
      if (!updated) {
        res.status(404).json({ error: 'Board not found' });
        return;
      }
      const result = await getBoardById(db, id, req.userId!);
      res.json(result);
    } catch (err) {
      console.error('PUT /api/boards/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    const id = String(req.params.id);
    try {
      const deleted = await deleteBoardById(db, id, req.userId!);
      if (!deleted) {
        res.status(404).json({ error: 'Board not found' });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      console.error('DELETE /api/boards/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/:id/toggle', async (req: Request, res: Response) => {
    const id = String(req.params.id);
    try {
      const ok = await toggleBoardStateById(db, id, req.userId!);
      if (!ok) {
        res.status(404).json({ error: 'Board not found' });
        return;
      }
      const board = await getBoardById(db, id, req.userId!);
      res.json(board);
    } catch (err) {
      console.error('POST /api/boards/:id/toggle error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/:id/restore', async (req: Request, res: Response) => {
    const id = String(req.params.id);
    try {
      const ok = await restoreBoardById(db, id, req.userId!);
      if (!ok) {
        res.status(404).json({ error: 'Board not found' });
        return;
      }
      const board = await getBoardById(db, id, req.userId!);
      res.json(board);
    } catch (err) {
      console.error('POST /api/boards/:id/restore error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/:id/duplicate', async (req: Request, res: Response) => {
    const id = String(req.params.id);
    try {
      const newId = await duplicateBoardById(db, id, req.userId!);
      if (!newId) {
        res.status(404).json({ error: 'Board not found' });
        return;
      }
      const board = await getBoardById(db, newId, req.userId!);
      res.status(201).json(board);
    } catch (err) {
      console.error('POST /api/boards/:id/duplicate error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/:id/jobs', async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '25'), 10) || 25));
    try {
      const board = await getBoardById(db, id, req.userId!);
      if (!board) {
        res.status(404).json({ error: 'Board not found' });
        return;
      }
      const { jobs, total } = await listJobsForBoardIdForUser(db, id, req.userId!, page, limit);
      res.json({ jobs, total, page, limit, pages: Math.ceil(total / limit) });
    } catch (err) {
      console.error('GET /api/boards/:id/jobs error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
