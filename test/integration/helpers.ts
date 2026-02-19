import { openDb } from '../../src/storage/db';
import { createApp } from '../../server/app';
import supertest from 'supertest';
import { Database } from 'sqlite';

export async function createTestApp() {
  const db = await openDb({ dbPath: ':memory:' });
  const app = createApp(db);
  return { app, db };
}

export async function registerAndLogin(
  app: ReturnType<typeof createApp>,
  email = 'test@example.com',
  password = 'password123'
): Promise<{ cookie: string; userId: string }> {
  const res = await supertest(app)
    .post('/api/auth/register')
    .send({ email, password });

  if (res.status !== 201) {
    throw new Error(`Registration failed: ${JSON.stringify(res.body)}`);
  }

  const setCookie = res.headers['set-cookie'];
  const cookie = Array.isArray(setCookie) ? setCookie[0].split(';')[0] : '';
  const userId = res.body.id as string;

  return { cookie, userId };
}
