import { Router, Request, Response } from 'express';
import { Database } from 'sqlite';
import { requireAuth } from '../auth/middleware';
import {
  listScrapeRunsForUser,
  getScrapeRunDetail,
  createScrapeRun,
} from '../../src/storage/db';
import { scrapeForUser } from '../cron/scrapeAllBoards';

export function makeRunsRouter(db: Database): Router {
  const router = Router();

  router.use(requireAuth);

  router.get('/', async (req: Request, res: Response) => {
    try {
      const runs = await listScrapeRunsForUser(db, req.userId!);
      res.json(runs);
    } catch (err) {
      console.error('GET /api/runs error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const run = await getScrapeRunDetail(db, req.params.id as string, req.userId!);
      if (!run) {
        res.status(404).json({ error: 'Run not found' });
        return;
      }
      res.json(run);
    } catch (err) {
      console.error('GET /api/runs/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const runId = await createScrapeRun(db, userId, 'manual');
      // Fire-and-forget — client polls GET /api/runs/:id for progress
      scrapeForUser(db, userId, runId).catch((err) =>
        console.error('[runs] Manual scrape error:', err)
      );
      res.status(202).json({ runId });
    } catch (err) {
      console.error('POST /api/runs error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
