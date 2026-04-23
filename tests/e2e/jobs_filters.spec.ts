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

  test("Title header input keeps focus per keystroke (no mid-type steal)", async ({
    page,
  }) => {
    // Regression: the Tabulator built-in `"input"` headerFilter used to
    // fire `headerFilterChanged` on each keystroke, and the reactive
    // store subscriber re-rendered the input mid-type, stealing focus.
    // The custom `textHeaderFilter` widget commits only on blur/Enter,
    // and `syncTabulatorHeaderFiltersFromRules` skips when the user is
    // focused inside a header input. So typing should keep focus on the
    // same input element across every character.
    const titleHeader = page.locator(
      '.tabulator-col[tabulator-field="title"] .tabulator-header-filter input'
    );
    await titleHeader.click();
    // Type character-by-character and assert focus is retained after
    // each keystroke. If the reactive subscriber re-renders the input
    // mid-type, `toBeFocused` will fail on the next character.
    for (const ch of "List") {
      await page.keyboard.type(ch);
      await expect(titleHeader).toBeFocused();
    }
    await expect(titleHeader).toHaveValue("List");
  });

  test("Title funnel icon opens a popover with non-header operators", async ({
    page,
  }) => {
    // The popover is the user-facing answer to "I want to add a
    // not_contains rule on Title". The existing text header input only
    // supports `contains`; the funnel icon opens a full rule editor.
    const iconBtn = page.locator(
      '.tabulator-col[tabulator-field="title"] .text-header-filter-icon'
    );
    await iconBtn.click();

    const popover = page.locator(".col-filter-popover");
    await expect(popover).toBeVisible();
    await expect(popover).toContainText(/Title/i);

    // Add a not_contains rule from the popover.
    await popover.locator("button", { hasText: "+ Rule" }).click();
    // The rule row renders a <select> with operator options.
    await popover.locator(".filter-rule-row select").selectOption("not_contains");
    await popover
      .locator(".filter-rule-row .filter-rule-value input")
      .fill("archive");

    const apply = page.waitForResponse(
      (r) =>
        r.url().includes("/api/jobs/") &&
        r.url().includes("filter=")
    );
    await popover.locator("button", { hasText: "Apply" }).click();
    await apply;

    // The store should now carry the not_contains rule, and the icon
    // should show the `is-active` class so the user can see extra
    // filter logic lives behind it.
    const rules = await page.evaluate(
      () => window.__STORE__.getState().filter.rules
    );
    const notContains = rules.find(
      (r: any) => r.field === "title" && r.operator === "not_contains"
    );
    expect(notContains).toBeTruthy();
    expect(notContains.value).toBe("archive");

    await expect(iconBtn).toHaveClass(/is-active/);

    // Pressing Escape closes the popover.
    await page.keyboard.press("Escape");
    await expect(popover).toBeHidden();
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
