import jwt from 'jsonwebtoken';

const SECRET = process.env.SESSION_SECRET ?? 'dev-secret-change-me';
const EXPIRY = '7d';

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: EXPIRY });
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, SECRET) as { sub: string };
    return payload.sub;
  } catch {
    return null;
  }
}
