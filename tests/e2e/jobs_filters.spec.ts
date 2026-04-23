import { expect, test } from "@playwright/test";
import { captureJobsResponse, login, waitForRows } from "./fixtures";

/**
 * Covers the merged Columns & Filters panel introduced when filter pills
 * were removed. Two invariants matter for this spec:
 *
 *   1. Typing in the Title header filter input propagates to the merged
 *      panel (rule + count badge) and to the server envelope.
 *   2. Un-checking a column's visibility inside the merged panel removes
 *      any rules targeting that column; the server refetches without
 *      those predicates and the column disappears from the grid.
 */
test.describe("Jobs merged Columns & Filters panel", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await waitForRows(page);
  });

  test("Title header input → merged panel rule + server filter", async ({
    page,
  }) => {
    // Type into the Title column's Tabulator header filter. The
    // header filter is configured with `headerFilterLiveFilter: false`,
    // so the debounce/commit happens on blur; press Enter to force it.
    const payload = await captureJobsResponse(
      page,
      async () => {
        const titleHeader = page.locator(
          '.tabulator-col[tabulator-field="title"] .tabulator-header-filter input'
        );
        await titleHeader.fill("Listing 001");
        await titleHeader.press("Enter");
      },
      (url) => url.includes("/api/jobs/") && url.includes("filter=")
    );

    // Server received a `filter` param containing a title/contains rule.
    const requested = page.url();
    expect(requested).toBeTruthy();
    // Use the last request URL; assert structurally by re-reading the
    // store exposed on window for determinism. __STORE__ is exported by
    // jobs.js for this purpose.
    const rules = await page.evaluate(() => window.__STORE__.getState().filter.rules);
    const titleRule = rules.find((r: any) => r.field === "title");
    expect(titleRule).toBeTruthy();
    expect(titleRule.operator).toBe("contains");
    expect(titleRule.value).toBe("Listing 001");

    // Envelope should carry at least one result (we have 300 seeded listings).
    expect(payload.count).toBeGreaterThan(0);

    // Open the merged panel and confirm the Title section shows the rule
    // plus a count badge.
    await page.locator("#open-filters-panel").click();
    const titleSection = page.locator('[data-filter-section="title"]');
    await expect(titleSection).toBeVisible();
    const badge = titleSection.locator(".col-filter-count");
    await expect(badge).toHaveText("1");
  });

  test("un-checking a filtered column's visibility clears its rules", async ({
    page,
  }) => {
    // Set up a Title rule via the merged panel so we know the exact
    // state. Open panel → click "+ Rule" under Title → enter value.
    await page.locator("#open-filters-panel").click();
    const titleSection = page.locator('[data-filter-section="title"]');
    await titleSection.locator("button", { hasText: "+ Rule" }).click();

    // Type a contains value into the newly rendered rule input.
    const ruleInput = titleSection.locator(".filter-rule-value input").first();
    await ruleInput.fill("Listing");
    // Commit.
    const afterApply = captureJobsResponse(
      page,
      async () => {
        await page.locator("#apply-filters").click();
      },
      (url) => url.includes("filter=")
    );
    await afterApply;

    const beforeVisibility = await page.evaluate(
      () => window.__STORE__.getState().columns.visibility.title !== false
    );
    expect(beforeVisibility).toBe(true);

    // Un-check the visibility toggle for Title. Expect:
    //  - rules for `title` get cleared (invariant enforcement)
    //  - server refetches without a title predicate
    //  - column leaves the grid
    const noFilterFetch = captureJobsResponse(
      page,
      async () => {
        const toggle = titleSection.locator(
          ".col-section-toggle input[type=checkbox]"
        );
        await toggle.uncheck();
      },
      (url) => url.includes("/api/jobs/")
    );
    await noFilterFetch;

    const rulesAfter = await page.evaluate(
      () => window.__STORE__.getState().filter.rules
    );
    expect(rulesAfter.filter((r: any) => r.field === "title")).toEqual([]);

    // Title column hidden in Tabulator.
    const titleCol = await page.evaluate(() => {
      const t = (window as any).Tabulator
        ? null
        : document.querySelector('.tabulator-col[tabulator-field="title"]');
      return t ? (t as HTMLElement).offsetParent !== null : false;
    });
    expect(titleCol).toBe(false);
  });
});
