import { Request, Response, NextFunction } from 'express';
import { verifyToken } from './jwt';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.token as string | undefined;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const userId = verifyToken(token);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  req.userId = userId;
  next();
}
