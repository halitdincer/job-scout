import express from 'express';
import cookieParser from 'cookie-parser';
import { Database } from 'sqlite';
import { makeAuthRouter } from './routes/authRouter';
import { makeBoardsRouter } from './routes/boardsRouter';
import { makeJobsRouter } from './routes/jobsRouter';
import { serveStatic } from './static';

export function createApp(db: Database): express.Express {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  // API routes
  app.use('/api/auth', makeAuthRouter(db));
  app.use('/api/boards', makeBoardsRouter(db));
  app.use('/api/jobs', makeJobsRouter(db));

  // Serve React SPA + static assets
  serveStatic(app);

  return app;
}
