import { Router, Request, Response } from 'express';
import { Database } from 'sqlite';
import { requireAuth } from '../auth/middleware';
import {
  loadBoardsForUser,
  insertBoard,
  updateBoardById,
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

  router.post('/', async (req: Request, res: Response) => {
    const board = req.body;
    if (!board?.name || !board?.url) {
      res.status(400).json({ error: 'name and url are required' });
      return;
    }
    try {
      const id = await insertBoard(db, board, req.userId!);
      const created = await getBoardById(db, id, req.userId!);
      res.status(201).json(created);
    } catch (err) {
      console.error('POST /api/boards error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.put('/:id', async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const board = req.body;
    if (!board?.name || !board?.url) {
      res.status(400).json({ error: 'name and url are required' });
      return;
    }
    try {
      const updated = await updateBoardById(db, id, board, req.userId!);
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

  return router;
}
