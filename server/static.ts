import path from 'path';
import express, { Express } from 'express';

export function serveStatic(app: Express): void {
  const distDir = path.join(__dirname, '..', '..', 'web', 'dist');

  app.use(express.static(distDir));

  // SPA fallback — serve index.html for any non-API route
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}
