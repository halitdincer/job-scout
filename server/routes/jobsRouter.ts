import { Router, Request, Response } from 'express';
import { Database } from 'sqlite';
import { requireAuth } from '../auth/middleware';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export function makeJobsRouter(db: Database): Router {
  const router = Router();

  router.use(requireAuth);

  router.get('/', async (req: Request, res: Response) => {
    const userId = req.userId!;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const board = typeof req.query.board === 'string' ? req.query.board.trim() : '';
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(String(req.query.limit ?? String(DEFAULT_LIMIT)), 10) || DEFAULT_LIMIT)
    );
    const offset = (page - 1) * limit;

    try {
      const conditions: string[] = ['user_id = ?'];
      const params: unknown[] = [userId];

      if (board) {
        conditions.push('board = ?');
        params.push(board);
      }

      if (q) {
        conditions.push(`(title LIKE ? OR company LIKE ? OR location LIKE ?)`);
        const like = `%${q}%`;
        params.push(like, like, like);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countRow = await db.get<{ total: number }>(
        `SELECT COUNT(*) as total FROM jobs ${where}`,
        params
      );
      const total = countRow?.total ?? 0;

      const jobs = await db.all(
        `SELECT id, title, company, location, url, posted_date as postedDate, board,
                first_seen_at as firstSeenAt, last_seen_at as lastSeenAt
         FROM jobs ${where}
         ORDER BY last_seen_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      res.json({
        jobs,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      });
    } catch (err) {
      console.error('GET /api/jobs error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
