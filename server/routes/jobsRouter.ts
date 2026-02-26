import { Router, Request, Response } from 'express';
import { Database } from 'sqlite';
import { requireAuth } from '../auth/middleware';
import { listJobsForUser, deleteJobsByIds } from '../../src/storage/db';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function parseCommaSeparated(val: unknown): string[] {
  if (typeof val !== 'string' || !val.trim()) return [];
  return val.split(',').map((v) => v.trim()).filter(Boolean);
}

export function makeJobsRouter(db: Database): Router {
  const router = Router();

  router.use(requireAuth);

  router.get('/', async (req: Request, res: Response) => {
    const userId = req.userId!;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(String(req.query.limit ?? String(DEFAULT_LIMIT)), 10) || DEFAULT_LIMIT)
    );

    // Multi-value filters (comma-separated)
    const sourceIds = parseCommaSeparated(req.query.sources);
    const tagIds = parseCommaSeparated(req.query.tags);
    const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom.trim() : '';
    const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo.trim() : '';
    const sortByRaw = typeof req.query.sortBy === 'string' ? req.query.sortBy : '';
    const sortBy = (['newest', 'oldest', 'title'] as const).includes(sortByRaw as any)
      ? (sortByRaw as 'newest' | 'oldest' | 'title')
      : 'newest';
    const orderByLegacy =
      sortBy === 'oldest' ? 'first_seen_at ASC' :
      sortBy === 'title'  ? 'title ASC, first_seen_at DESC' :
      'first_seen_at DESC';

    // Legacy single-source filter (backward compat)
    const sourceName = typeof req.query.source === 'string' ? req.query.source.trim() : '';

    try {
      let result;

      if (sourceName && sourceIds.length === 0) {
        // Legacy: filter by source name directly
        const conditions: string[] = ['user_id = ?'];
        const params: unknown[] = [userId];

        conditions.push('source = ?');
        params.push(sourceName);

        if (q) {
          conditions.push(`(title LIKE ? OR company LIKE ? OR location LIKE ?)`);
          const like = `%${q}%`;
          params.push(like, like, like);
        }

        const where = `WHERE ${conditions.join(' AND ')}`;
        const offset = (page - 1) * limit;

        const countRow = await db.get<{ total: number }>(
          `SELECT COUNT(*) as total FROM jobs ${where}`,
          params
        );
        const total = countRow?.total ?? 0;
        const jobs = await db.all(
          `SELECT id, title, company, location, url, source,
                  first_seen_at as firstSeenAt, last_seen_at as lastSeenAt
           FROM jobs ${where}
           ORDER BY ${orderByLegacy}
           LIMIT ? OFFSET ?`,
          [...params, limit, offset]
        );
        result = { jobs, total };
      } else {
        result = await listJobsForUser(db, userId, {
          q,
          sourceIds,
          tagIds,
          dateFrom,
          dateTo,
          page,
          limit,
          sortBy,
        });
      }

      const { jobs, total } = result;

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

  router.delete('/', async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' });
    }
    try {
      const deleted = await deleteJobsByIds(db, userId, ids);
      res.json({ ok: true, deleted });
    } catch (err) {
      console.error('DELETE /api/jobs error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
