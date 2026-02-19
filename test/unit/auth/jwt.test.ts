import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from '../../../server/auth/jwt';

describe('jwt', () => {
  it('signToken returns a non-empty string', () => {
    const token = signToken('user-123');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('verifyToken returns the correct userId for a valid token', () => {
    const token = signToken('user-abc');
    const result = verifyToken(token);
    expect(result).toBe('user-abc');
  });

  it('verifyToken returns null for a tampered token', () => {
    const token = signToken('user-xyz');
    const tampered = token.slice(0, -5) + 'XXXXX';
    const result = verifyToken(tampered);
    expect(result).toBeNull();
  });

  it('verifyToken returns null for garbage input', () => {
    expect(verifyToken('not-a-jwt')).toBeNull();
    expect(verifyToken('')).toBeNull();
    expect(verifyToken('a.b.c')).toBeNull();
  });
});
