import { expect, Page, Response } from "@playwright/test";

export const E2E_USER = "e2e";
export const E2E_PASSWORD = "e2e-pass-123";

/**
 * Log in via the standard Django form. Leaves the page on `/` after the
 * post-login redirect. Safe to call at the top of any spec.
 */
export async function login(page: Page): Promise<void> {
  await page.goto("/accounts/login/");
  await page.fill('input[name="username"]', E2E_USER);
  await page.fill('input[name="password"]', E2E_PASSWORD);
  await page.click('button[type="submit"], input[type="submit"]');
  await page.waitForURL("**/");
}

/**
 * Resolve when the Tabulator grid has rendered at least one visible
 * row. Used after login or after a pagination/sort change to avoid
 * racing the fetch effect. DOM-only — does not assert on row count
 * because Tabulator virtualizes rows that aren't in the viewport.
 */
export async function waitForRows(page: Page): Promise<void> {
  await expect(page.locator("#jobs-grid .tabulator-row").first()).toBeVisible({
    timeout: 10_000,
  });
}

/**
 * Run `trigger` and return the parsed JSON body of the next /api/jobs/
 * response that matches `urlPredicate`. Assertions that care about row
 * identity go through this helper — Tabulator's virtual DOM doesn't
 * materialize every row as HTML, so scraping cells is unreliable; the
 * envelope response is the source of truth for what the server returned.
 */
export async function captureJobsResponse(
  page: Page,
  trigger: () => Promise<void>,
  urlPredicate: (url: string) => boolean = () => true,
): Promise<{
  results: Array<Record<string, unknown>>;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  sort: Array<{ field: string; dir: "asc" | "desc" }>;
}> {
  const waiter = page.waitForResponse(
    (resp: Response) =>
      resp.url().includes("/api/jobs/") && urlPredicate(resp.url()),
  );
  await trigger();
  const resp = await waiter;
  expect(resp.status(), `GET ${resp.url()} failed`).toBe(200);
  return (await resp.json()) as {
    results: Array<Record<string, unknown>>;
    count: number;
    page: number;
    page_size: number;
    total_pages: number;
    sort: Array<{ field: string; dir: "asc" | "desc" }>;
  };
}
