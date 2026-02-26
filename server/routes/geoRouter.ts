import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth/middleware';
import { searchGeo } from '../../src/geo';

export function makeGeoRouter(): Router {
  const router = Router();

  router.use(requireAuth);

  router.get('/search', (req: Request, res: Response) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const limit = Math.min(20, parseInt(String(req.query.limit ?? '10'), 10) || 10);

    if (!q) {
      res.json([]);
      return;
    }

    try {
      const results = searchGeo(q, limit);
      res.json(results);
    } catch (err) {
      console.error('GET /api/geo/search error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
