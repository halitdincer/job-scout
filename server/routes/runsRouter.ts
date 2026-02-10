import { Router, Request, Response } from 'express';
import { Database } from 'sqlite';
import { requireAuth } from '../auth/middleware';
import { listRunsForUser } from '../../src/storage/db';

export function makeRunsRouter(db: Database): Router {
  const router = Router();

  router.use(requireAuth);

  router.get('/', async (req: Request, res: Response) => {
    const boardId = typeof req.query.boardId === 'string' ? req.query.boardId : undefined;
    try {
      const runs = await listRunsForUser(db, req.userId!, boardId);
      res.json(runs);
    } catch (err) {
      console.error('GET /api/runs error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
