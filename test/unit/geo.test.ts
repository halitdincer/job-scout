import { describe, it, expect } from 'vitest';
import { searchGeo } from '../../src/geo';

describe('searchGeo', () => {
  it('returns empty array for empty query', () => {
    expect(searchGeo('')).toEqual([]);
    expect(searchGeo('  ')).toEqual([]);
  });

  it('finds a country by name', () => {
    const results = searchGeo('Canada');
    expect(results.length).toBeGreaterThan(0);
    const canada = results.find((r) => r.key === 'CA');
    expect(canada).toBeDefined();
    expect(canada?.type).toBe('country');
    expect(canada?.label).toBe('Canada');
  });

  it('finds a country by ISO code', () => {
    const results = searchGeo('CA');
    expect(results.some((r) => r.key === 'CA')).toBe(true);
  });

  it('finds a state/province by name', () => {
    const results = searchGeo('Ontario', 20);
    const ontario = results.find((r) => r.key === 'CA-ON');
    expect(ontario).toBeDefined();
    expect(ontario?.type).toBe('state');
    expect(ontario?.label).toContain('Ontario');
    expect(ontario?.label).toContain('Canada');
  });

  it('finds a city by name', () => {
    const results = searchGeo('Toronto', 20);
    const toronto = results.find((r) => r.key.startsWith('CA-ON-Toronto'));
    expect(toronto).toBeDefined();
    expect(toronto?.type).toBe('city');
    expect(toronto?.label).toContain('Toronto');
  });

  it('respects the limit parameter', () => {
    const results = searchGeo('a', 5);
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('returns GeoResult shape with key, label, type', () => {
    const results = searchGeo('Germany', 5);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r).toHaveProperty('key');
      expect(r).toHaveProperty('label');
      expect(r).toHaveProperty('type');
      expect(['country', 'state', 'city']).toContain(r.type);
    }
  });

  it('country key is just the ISO code', () => {
    const results = searchGeo('United States', 5);
    const us = results.find((r) => r.type === 'country' && r.label.includes('United States'));
    expect(us).toBeDefined();
    expect(us?.key).not.toContain('-');
  });

  it('state key is countryCode-stateCode', () => {
    const results = searchGeo('California', 10);
    const ca = results.find((r) => r.type === 'state' && r.label.includes('California'));
    expect(ca).toBeDefined();
    expect(ca?.key).toMatch(/^[A-Z]+-[A-Z]+$/);
  });

  it('city key is countryCode-stateCode-cityName', () => {
    const results = searchGeo('Berlin', 10);
    const berlin = results.find((r) => r.type === 'city' && r.label.includes('Berlin'));
    expect(berlin).toBeDefined();
    expect(berlin?.key.split('-').length).toBeGreaterThanOrEqual(3);
  });
});
