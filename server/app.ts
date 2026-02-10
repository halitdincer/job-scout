import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { Database } from 'sqlite';
import { makeAuthRouter } from './routes/authRouter';
import { makeBoardsRouter } from './routes/boardsRouter';
import { makeJobsRouter } from './routes/jobsRouter';
import { makeRunsRouter } from './routes/runsRouter';
import { makeSetupRouter } from './routes/setupRouter';
import { serveStatic } from './static';

export function createApp(db: Database): express.Express {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  // Health check — always 200, used by K8s probes
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // API routes
  app.use('/api/auth', makeAuthRouter(db));
  app.use('/api/boards', makeBoardsRouter(db));
  app.use('/api/jobs', makeJobsRouter(db));
  app.use('/api/runs', makeRunsRouter(db));
  app.use('/api/setup', makeSetupRouter());

  // Serve React SPA + static assets
  serveStatic(app);

  return app;
}
