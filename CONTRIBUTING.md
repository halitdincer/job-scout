# Contributing to job-scout

## TDD Workflow

### Rule: tests before code

Every new function, route, or component starts with a failing test.
Write the test first (red), then implement (green), then refactor.

### Cycle

1. Write a failing test describing the desired behavior
2. Write the minimum code to make it pass (green)
3. Refactor — clean up while keeping tests green
4. `npm test` must pass before committing (enforced by pre-commit hook)

### File conventions

| Code location                    | Test location                                 |
|----------------------------------|-----------------------------------------------|
| `src/utils/foo.ts`               | `test/unit/foo.test.ts`                       |
| `src/extractors/bar.ts`          | `test/unit/extractors/bar.test.ts`            |
| `server/routes/fooRouter.ts`     | `test/integration/routes/foo.test.ts`         |
| `server/cron/foo.ts`             | `test/unit/cron/foo.test.ts`                  |
| `web/src/pages/FooPage.tsx`      | `web/src/pages/FooPage.test.tsx`              |
| `web/src/hooks.ts`               | `web/src/hooks.test.ts`                       |

### Running tests

```bash
npm test                           # all backend tests (watch-less)
npm run test:watch                 # backend watch mode
npm run test:coverage              # backend with coverage report

npm --prefix web test              # frontend tests
npm --prefix web run test:watch    # frontend watch mode
npm --prefix web run test:coverage # frontend with coverage report
```

### Coverage thresholds

Current thresholds (enforced in CI and pre-commit):

| Target          | Lines | Functions | Branches | Statements |
|-----------------|-------|-----------|----------|------------|
| Backend         | 77%   | 75%       | 62%      | 76%        |
| Frontend        | 71%   | 70%       | 53%      | 68%        |

These are raised incrementally. Target is 90%+ lines/functions/statements
and 80%+ branches. Raise thresholds after each sprint once tests pass cleanly.

### Integration test helpers

Backend integration tests use `createTestApp()` and `registerAndLogin()` from
`test/integration/helpers.ts`. Each test gets an in-memory SQLite database
isolated from other tests.

```typescript
import { createTestApp, registerAndLogin } from '../helpers';

let app: any, db: Database, cookie: string, userId: string;

beforeEach(async () => {
  ({ app, db } = await createTestApp());
  ({ cookie, userId } = await registerAndLogin(app));
});

afterEach(async () => { await db.close(); });
```

### Mocking conventions

- Mock Playwright in unit tests: `vi.mock('playwright', () => ({ chromium: { launch: vi.fn() } }))`
- Mock `scrapeForUser` in route tests that POST to `/api/runs`
- Use `vi.hoisted()` for mocks that need to be referenced inside `vi.mock()`

### Pre-commit hook

Husky runs `npm test && npm --prefix web test` before every commit.
If tests fail, the commit is blocked. Fix the failing tests, then retry.
