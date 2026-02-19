import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../../server/auth/passwords';

describe('passwords', () => {
  it('hashPassword returns a different string from the input', async () => {
    const hash = await hashPassword('supersecret');
    expect(hash).not.toBe('supersecret');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('verifyPassword returns true for correct password + hash pair', async () => {
    const hash = await hashPassword('mypassword1');
    const valid = await verifyPassword('mypassword1', hash);
    expect(valid).toBe(true);
  });

  it('verifyPassword returns false for wrong password', async () => {
    const hash = await hashPassword('correcthorse');
    const valid = await verifyPassword('wrongpassword', hash);
    expect(valid).toBe(false);
  });
});
