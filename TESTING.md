# Testing & Validation Guide

This project is designed to be **AI-verifiable** and **offline-testable**. The strategy combines deterministic unit tests, optional browser tests using fixtures, and a config validator that prevents bad board definitions from slipping in.

## Goals

- Detect regressions early when scraper logic changes.
- Validate board configs before running real scrapes.
- Make it simple for automated agents to run checks without a network.

## Test Matrix

1. **Unit Tests (always on)**
   - Job ID stability
   - SQLite upsert logic

2. **Browser Fixture Tests (optional)**
   - JSON-LD extraction
   - Selector extraction
   - Uses a local HTML fixture, no network calls

## Commands

### 1) Run unit tests

```bash
npm test
```

### 2) Run browser fixture tests

Requires Playwright browsers installed:

```bash
npx playwright install
npm run test:browser
```

## How AIs Should Validate Changes

When making changes, use this checklist:

1. **Run unit tests** to ensure core logic (IDs + DB) is stable.
2. **Run browser fixture tests** if extractor logic changed.
4. If scraper logic changes, add/adjust fixture HTML in `test/fixtures/sample.html`.

## Adding New Tests

- Add new tests under `test/*.test.ts`.
- Keep tests deterministic and offline.
- If a feature depends on external sites, reproduce it in a fixture HTML instead.

## Common Failures & Fixes

- **Playwright errors:** run `npx playwright install` once.
- **Config validation errors:** fix missing selectors or incorrect pagination config.

## CI/Automation Recommendation

If you add CI later, use this minimal pipeline:

```bash
npm ci
npm test
```

Optionally add:

```bash
npm run test:browser
```
